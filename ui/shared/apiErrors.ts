/** Extract a user-visible message from a failed API JSON body. */
export function messageFromApiBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') {
    return fallback;
  }
  const record = body as Record<string, unknown>;
  const error = record.error;
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }
  const message = record.message;
  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }
  const details = record.details;
  if (typeof details === 'string' && details.trim()) {
    return details.trim();
  }
  return fallback;
}

export function httpErrorMessage(
  status: number,
  body: unknown,
  fallback: string
): string {
  const record =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const detail = messageFromApiBody(body, fallback);
  const hint = typeof record.hint === 'string' ? record.hint.trim() : '';
  const stage =
    typeof record.failed_stage === 'string' ? record.failed_stage.trim() : '';
  const errorType =
    typeof record.error_type === 'string' ? record.error_type.trim() : '';
  const headline =
    status === 503
      ? 'Service unavailable (HTTP 503)'
      : status === 422
        ? 'AI profile incomplete (HTTP 422)'
        : status === 502
          ? 'Upstream error (HTTP 502)'
          : `Request failed (HTTP ${status})`;

  const parts = [headline, detail];
  if (errorType === 'llm_profile_invalid') {
    parts.push('This is not the same as Ollama being down—try Refresh again.');
  }
  if (stage) {
    parts.push(`Stage: ${stage.replace(/_/g, ' ')}.`);
  }
  if (hint) {
    parts.push(hint);
  }
  return parts.join(' ');
}
