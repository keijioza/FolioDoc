export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function api(userId, path, { method = 'GET', body, raw = false, signal } = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
  try {
    const response = await fetch(`/api${path}`, {
      method,
      headers: { 'X-Demo-User': userId, ...(body !== undefined ? { 'Content-Type': raw ? 'text/plain' : 'application/json' } : {}) },
      body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
      signal: controller.signal,
    });
    let data;
    try { data = await response.json(); } catch (error) {
      if (controller.signal.aborted) throw error;
      throw new ApiError('The server returned an unexpected response. Please retry.', response.status);
    }
    if (!response.ok) throw new ApiError(typeof data.detail === 'string' ? data.detail : 'Something went wrong. Please try again.', response.status);
    return data;
  } catch (error) {
    if (timedOut) throw new ApiError('The request timed out. Keep this page open and retry. A save may already have reached the server; use Load latest if a conflict appears.', 0);
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach Folio. Check your connection and try again.', 0);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export function downloadDraft(title, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(title || 'Untitled document').replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 100) || 'draft'}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
