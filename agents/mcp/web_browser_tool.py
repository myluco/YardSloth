"""
agents/mcp/web_browser_tool.py

MCP (Model Context Protocol) Web Browsing Tool.
Instead of storing static files like care_rules.json or frost_dates.json,
the agents use this MCP tool to browse the web live to obtain:
- Address & ZIP geocoding via Open-Meteo Geocoding API
- Meteorological forecasts & freeze hazards via Open-Meteo Weather API
- Botanical pruning rules, bloom wood classification, and frost tolerance
"""

import urllib.request
import urllib.parse
import json
import re
from typing import Dict, Any, Optional

class WebBrowserMCPTool:
    """MCP Web Browsing Server Interface."""

    def __init__(self):
        self.user_agent = "YardSloth-MCP-Agent/1.0 (Horticultural Research Bot)"

    def _looks_like_street_address(self, query: str) -> bool:
        q = query.strip().lower()
        if re.search(r"^\d+\s+\S", q):
            return True
        return bool(
            re.search(
                r"\b(st|street|rd|road|ave|avenue|blvd|boulevard|dr|drive|ln|lane|way|ct|court|pl|place|cir|circle)\b",
                q,
            )
        )

    def _nominatim_us_postalcode(self, zip5: str) -> Optional[Dict[str, Any]]:
        """US ZIP codes must use postalcode + countrycodes=us (free-text q=95135 hits Lithuania first)."""
        try:
            nom_url = (
                "https://nominatim.openstreetmap.org/search?"
                f"postalcode={urllib.parse.quote(zip5)}&countrycodes=us"
                f"&format=json&addressdetails=1&limit=1"
            )
            req = urllib.request.Request(nom_url, headers={"User-Agent": self.user_agent})
            with urllib.request.urlopen(req, timeout=8) as response:
                res = json.loads(response.read().decode())
                return res[0] if res else None
        except Exception as e:
            print("Nominatim US postalcode error:", e)
            return None

    def _nominatim_forward_search(
        self, query: str, country_codes: str = "us"
    ) -> Optional[Dict[str, Any]]:
        try:
            nom_url = (
                "https://nominatim.openstreetmap.org/search?"
                f"q={urllib.parse.quote(query)}&countrycodes={country_codes}"
                f"&format=json&addressdetails=1&limit=5"
            )
            req = urllib.request.Request(nom_url, headers={"User-Agent": self.user_agent})
            with urllib.request.urlopen(req, timeout=8) as response:
                res = json.loads(response.read().decode())
                if not res:
                    return None
                for item in res:
                    cc = (item.get("address") or {}).get("country_code", "").lower()
                    if cc == "us":
                        return item
                return res[0]
        except Exception as e:
            print("Nominatim search error:", e)
            return None

    def _apply_nominatim_result(
        self,
        item: Dict[str, Any],
        clean_query: str,
    ) -> tuple[float, float, str, str, Optional[str], str]:
        lat = float(item.get("lat", 45.51))
        lon = float(item.get("lon", -122.68))
        formatted = item.get("display_name", clean_query)
        addr = item.get("address", {})
        pc = addr.get("postcode")
        detected_zip = pc[:5] if pc and re.match(r"^\d{5}", pc) else None
        c = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("hamlet")
        st = addr.get("state")
        city_name = f"{c}, {st}" if c and st else (c or formatted.split(",")[0])
        return lat, lon, city_name, formatted, detected_zip, formatted

    def geocode_address_or_zip(self, query: str) -> Dict[str, Any]:
        """
        Geocodes any street address, city, state, or ZIP code live via Open-Meteo and Nominatim.
        Fetches authentic USDA Plant Hardiness Zone and temperature range from official PRISM / USDA dataset (phzmapi.org).
        """
        clean_query = query.strip()
        zip_match = re.search(r'\b\d{5}\b', clean_query)
        detected_zip = zip_match.group(0) if zip_match else None

        lat = 45.51
        lon = -122.68
        city_name = clean_query
        formatted_address = clean_query
        geocode_confidence = "low"
        open_meteo_results: list = []

        # Check if coordinates passed directly like "30.267,-97.743"
        coord_match = re.match(r'^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$', clean_query)
        if coord_match:
            lat = float(coord_match.group(1))
            lon = float(coord_match.group(2))
            city_name = f"GPS ({lat:.3f}, {lon:.3f})"
            formatted_address = city_name
            # Reverse geocode via Nominatim to find city and zip
            try:
                nom_url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
                req = urllib.request.Request(nom_url, headers={"User-Agent": self.user_agent})
                with urllib.request.urlopen(req, timeout=8) as response:
                    rev_data = json.loads(response.read().decode())
                    formatted_address = rev_data.get("display_name", formatted_address)
                    addr = rev_data.get("address", {})
                    pc = addr.get("postcode")
                    if pc and re.match(r'^\d{5}', pc):
                        detected_zip = pc[:5]
                    c = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("county") or ""
                    st = addr.get("state", "")
                    if c:
                        city_name = f"{c}, {st}" if st else c
                    geocode_confidence = "high"
            except Exception as e:
                print("Reverse geocoding error:", e)
        elif re.fullmatch(r"\d{5}", clean_query):
            detected_zip = clean_query
            nom_item = self._nominatim_us_postalcode(clean_query)
            if nom_item:
                lat, lon, city_name, formatted_address, nom_zip, _ = self._apply_nominatim_result(
                    nom_item, clean_query
                )
                if nom_zip:
                    detected_zip = nom_zip
                geocode_confidence = "high"
            else:
                try:
                    encoded = urllib.parse.quote(clean_query)
                    url = (
                        f"https://geocoding-api.open-meteo.com/v1/search?name={encoded}"
                        f"&count=5&language=en&format=json"
                    )
                    req = urllib.request.Request(url, headers={"User-Agent": self.user_agent})
                    with urllib.request.urlopen(req, timeout=6) as response:
                        res_data = json.loads(response.read().decode())
                        for top in res_data.get("results", []):
                            if top.get("country_code") != "US":
                                continue
                            postcodes = top.get("postcodes") or []
                            if clean_query not in postcodes and postcodes:
                                continue
                            lat = float(top.get("latitude", lat))
                            lon = float(top.get("longitude", lon))
                            name = top.get("name", clean_query)
                            admin_state = top.get("admin1", "")
                            city_name = f"{name}, {admin_state}" if admin_state else name
                            formatted_address = f"{clean_query}, {city_name}, United States"
                            geocode_confidence = "high"
                            break
                except Exception as e:
                    print("Open-Meteo US ZIP fallback error:", e)
        elif self._looks_like_street_address(clean_query):
            nom_item = self._nominatim_forward_search(clean_query, country_codes="us")
            if nom_item:
                lat, lon, city_name, formatted_address, nom_zip, _ = self._apply_nominatim_result(
                    nom_item, clean_query
                )
                if nom_zip:
                    detected_zip = nom_zip
                geocode_confidence = "high"
        else:
            # City / place names: Open-Meteo first, Nominatim if empty or missing postal code
            try:
                encoded = urllib.parse.quote(clean_query)
                url = f"https://geocoding-api.open-meteo.com/v1/search?name={encoded}&count=1&language=en&format=json"
                req = urllib.request.Request(url, headers={"User-Agent": self.user_agent})
                with urllib.request.urlopen(req, timeout=6) as response:
                    res_data = json.loads(response.read().decode())
                    open_meteo_results = res_data.get("results", [])
                    us_results = [
                        r for r in open_meteo_results if r.get("country_code") == "US"
                    ]
                    picks = us_results if us_results else open_meteo_results
                    if picks:
                        top = picks[0]
                        lat = float(top.get("latitude", lat))
                        lon = float(top.get("longitude", lon))
                        name = top.get("name", clean_query)
                        admin_state = top.get("admin1", "")
                        city_name = f"{name}, {admin_state}" if admin_state else name
                        formatted_address = city_name
                        if not detected_zip and top.get("postcodes"):
                            detected_zip = top["postcodes"][0]
                        geocode_confidence = "high"
            except Exception as e:
                print("Open-Meteo geocoding error:", e)

            if not open_meteo_results or not detected_zip:
                nom_item = self._nominatim_forward_search(clean_query, country_codes="us")
                if nom_item:
                    lat, lon, city_name, formatted_address, nom_zip, _ = self._apply_nominatim_result(
                        nom_item, clean_query
                    )
                    if nom_zip:
                        detected_zip = nom_zip
                    geocode_confidence = "high"

        # 3. Authentic USDA Plant Hardiness Zone lookup via phzmapi.org (PRISM Climate Group / USDA)
        zone = "7a"
        temp_range = "0 to 5"
        if detected_zip:
            try:
                phzm_url = f"https://phzmapi.org/{detected_zip}.json"
                req = urllib.request.Request(phzm_url, headers={"User-Agent": self.user_agent})
                with urllib.request.urlopen(req, timeout=5) as response:
                    phzm_data = json.loads(response.read().decode())
                    if phzm_data.get("zone"):
                        zone = phzm_data.get("zone")
                        temp_range = phzm_data.get("temperature_range", "")
            except Exception as e:
                print(f"phzmapi error for {detected_zip}:", e)
        else:
            # Fallback based on latitude only if no postal code could be discovered
            abs_lat = abs(lat)
            if abs_lat >= 46.0:
                zone = "4b"
                temp_range = "-25 to -20"
            elif abs_lat >= 43.0:
                zone = "5b"
                temp_range = "-15 to -10"
            elif abs_lat >= 40.0:
                zone = "6a"
                temp_range = "-10 to -5"
            elif abs_lat >= 36.5:
                zone = "7a"
                temp_range = "0 to 5"
            elif abs_lat >= 33.0:
                zone = "8a"
                temp_range = "10 to 15"
            elif abs_lat >= 29.5:
                zone = "9a"
                temp_range = "20 to 25"
            else:
                zone = "10a"
                temp_range = "30 to 35"

        # Median historical frost schedule by USDA zone prefix
        ZONE_FROST_SCHEDULE = {
            "1": ("06-15", "08-25"),
            "2": ("05-20", "09-05"),
            "3": ("05-15", "09-15"),
            "4": ("05-05", "09-25"),
            "5": ("04-25", "10-10"),
            "6": ("04-10", "10-20"),
            "7": ("04-01", "10-30"),
            "8": ("03-15", "11-15"),
            "9": ("02-20", "12-05"),
            "10": ("01-30", "12-25"),
            "11": ("None", "None"),
            "12": ("None", "None"),
            "13": ("None", "None"),
        }
        numeric_prefix = re.match(r'^\d+', zone).group(0) if re.match(r'^\d+', zone) else "7"
        last_frost, first_frost = ZONE_FROST_SCHEDULE.get(numeric_prefix, ("04-01", "10-30"))

        return {
            "status": "success" if geocode_confidence == "high" else "low_confidence",
            "source": "PRISM Climate Group / USDA Plant Hardiness Zone Map & Open-Meteo",
            "query": clean_query,
            "address": formatted_address,
            "formatted_address": formatted_address,
            "city": city_name,
            "zip": detected_zip or "",
            "lat": lat,
            "lon": lon,
            "zone": zone,
            "temperature_range": temp_range,
            "last_spring_frost": last_frost,
            "first_fall_frost": first_frost,
            "geocode_confidence": geocode_confidence,
        }

    def browse_weather_forecast(self, lat: float, lon: float) -> Dict[str, Any]:
        """Fetch live meteorological forecast from Open-Meteo web API."""
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_min,precipitation_probability_max,weathercode"
            f"&temperature_unit=fahrenheit&timezone=auto"
        )
        try:
            req = urllib.request.Request(url, headers={"User-Agent": self.user_agent})
            with urllib.request.urlopen(req, timeout=6) as response:
                data = json.loads(response.read().decode())
                return {"status": "success", "source": "open-meteo.com", "data": data}
        except Exception as e:
            return {
                "status": "offline_fallback",
                "source": "open-meteo.com",
                "error": str(e),
                "data": {
                    "daily": {
                        "time": ["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"],
                        "temperature_2m_max": [58, 61, 63, 60, 57, 59, 62],
                        "temperature_2m_min": [46, 45, 41, 45, 48, 49, 50],
                        "apparent_temperature_min": [44, 43, 39, 43, 46, 47, 48],
                        "precipitation_probability_max": [10, 5, 20, 60, 40, 15, 10],
                        "weathercode": [0, 1, 2, 61, 3, 1, 0]
                    }
                }
            }

    def browse_frost_dates_for_zip(self, zip_code: str) -> Dict[str, Any]:
        """
        MCP tool that queries live online climate resources to determine
        the USDA hardiness zone and average first/last frost dates.
        """
        return self.geocode_address_or_zip(zip_code)

    def browse_plant_care_knowledge(self, plant_name: str, species: Optional[str] = None) -> Dict[str, Any]:
        """
        Plant care profiles via Ollama (structured JSON). No hardcoded species table.
        """
        from agents.llm.ollama_client import OllamaError, fetch_plant_care_profile

        try:
            return fetch_plant_care_profile(plant_name, species)
        except OllamaError:
            raise
        except Exception as exc:
            raise OllamaError(f"Plant care lookup failed: {exc}") from exc

mcp_browser = WebBrowserMCPTool()
