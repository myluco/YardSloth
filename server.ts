import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess, execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const PYTHON_PORT = 8765;
const isDev = process.env.NODE_ENV !== 'production';

app.use(express.json({ limit: '15mb' }));

// Spawn the pure Python backend server (server/main.py)
let pythonProcess: ChildProcess | null = null;

/** Stale Python processes keep port 8765 and serve old routes after code changes. */
function freePythonPort(port: number) {
  try {
    if (process.platform === 'win32') {
      execSync(
        `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /F /PID %a`,
        { stdio: 'ignore' }
      );
    } else {
      execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' });
    }
  } catch {
    // Port already free or nothing to kill
  }
}

function startPythonBackend() {
  if (pythonProcess) {
    pythonProcess.kill('SIGTERM');
    pythonProcess = null;
  }
  freePythonPort(PYTHON_PORT);
  console.log(`Launching Python backend on port ${PYTHON_PORT}...`);
  pythonProcess = spawn('python3', ['server/main.py'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PYTHON_HOST: '127.0.0.1',
      PYTHON_PORT: String(PYTHON_PORT),
      OLLAMA_HOST: process.env.OLLAMA_HOST || 'http://localhost:11434',
      OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'gemma4:31b-cloud',
    },
  });

  pythonProcess.stdout?.on('data', (data) => {
    console.log(`[Python Server]: ${data.toString().trim()}`);
  });

  pythonProcess.stderr?.on('data', (data) => {
    const text = data.toString().trim();
    // stdlib BaseHTTPRequestHandler logs every request (including 200) to stderr.
    // e.g. 127.0.0.1 - - [date] "POST /api/... HTTP/1.1" 200 -
    const isHttpAccessLog =
      / - - \[/.test(text) && /"(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS) /.test(text);
    if (isHttpAccessLog) {
      console.log(`[Python Server]: ${text}`);
    } else {
      console.error(`[Python Server Error]: ${text}`);
    }
  });

  pythonProcess.on('exit', (code) => {
    console.log(`Python backend exited with code ${code}`);
  });
}

startPythonBackend();

async function waitForPythonBackend(maxWaitMs = 90_000): Promise<void> {
  const healthUrl = `http://127.0.0.1:${PYTHON_PORT}/health`;
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    try {
      const res = await fetch(healthUrl);
      if (res.ok) {
        console.log('Python backend is ready.');
        return;
      }
    } catch {
      // Python still booting or calendar blocking (should not block listen anymore)
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  console.warn(
    `Python backend did not respond on ${healthUrl} within ${maxWaitMs / 1000}s. ` +
      'API calls may return 502 until it is up.'
  );
}

/** Old processes on 8765 respond to /health but lack plant/location update routes (404). */
async function pythonHasPlantUpdateApi(): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${PYTHON_PORT}/api/plants/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    return res.status !== 404;
  } catch {
    return false;
  }
}

async function ensureFreshPythonBackend(): Promise<void> {
  await waitForPythonBackend();
  if (await pythonHasPlantUpdateApi()) {
    return;
  }

  console.warn(
    'Python backend on port 8765 is missing plant update routes (stale process). Restarting…'
  );
  startPythonBackend();
  await waitForPythonBackend();

  if (!(await pythonHasPlantUpdateApi())) {
    console.error(
      'Plant location save still unavailable. Stop every dev server (Ctrl+C), ensure nothing ' +
        `is listening on port ${PYTHON_PORT}, then run npm run dev again.`
    );
  }
}

// Graceful cleanup on shutdown
process.on('exit', () => {
  if (pythonProcess) pythonProcess.kill();
});
process.on('SIGINT', () => {
  if (pythonProcess) pythonProcess.kill();
  process.exit();
});

// Proxy all /api/* requests directly to the Python backend
app.use('/api', async (req: Request, res: Response) => {
  const targetUrl = `http://127.0.0.1:${PYTHON_PORT}/api${req.url}`;
  
  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
      },
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const pyRes = await fetch(targetUrl, fetchOptions);
    const contentType = pyRes.headers.get('content-type') || 'application/json';

    res.status(pyRes.status);
    res.setHeader('Content-Type', contentType);

    if (contentType.includes('text/calendar')) {
      res.setHeader('Content-Disposition', 'attachment; filename="yard_sloth_garden_calendar.ics"');
      const text = await pyRes.text();
      res.send(text);
    } else {
      const data = await pyRes.json();
      res.json(data);
    }
  } catch (err: any) {
    console.error(`Error forwarding request to Python server at ${targetUrl}:`, err.message);
    res.status(502).json({
      error: 'Python backend is starting up or unreachable. Please retry.',
      details: err.message,
    });
  }
});

// Vite Dev Server / Static Hosting
async function startServer() {
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  await ensureFreshPythonBackend();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Yard Sloth UI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
