// Thin HTTP client for the TransMute backend. All requests go to API_BASE_URL.

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080';

/** An error returned by the backend, or a network failure (status 0). */
export class ApiError extends Error {
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ApiError(`Cannot reach the TransMute server at ${API_BASE_URL}. Is the backend running?`, 0);
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
  let message = `Request failed (${res.status})`;
  let fields: Record<string, string> | undefined;
  try {
    const body = await res.json();
    if (body && typeof body.message === 'string') message = body.message;
    if (body && body.fields) fields = body.fields;
  } catch {
    // Keep the generic message when the body is not JSON.
  }
  throw new ApiError(message, res.status, fields);
}

export async function apiGet<T>(path: string): Promise<T> {
  return parse<T>(await send(API_BASE_URL + path, { headers: { Accept: 'application/json' } }));
}

export async function apiSend<T>(method: 'POST' | 'PUT' | 'PATCH', path: string, body?: unknown): Promise<T> {
  return parse<T>(
    await send(API_BASE_URL + path, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  );
}

export async function apiUpload<T>(path: string, file: File, channel: string): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  form.append('channel', channel);
  return parse<T>(await send(API_BASE_URL + path, { method: 'POST', body: form }));
}

/** Absolute URL for a file served by the API, such as a stored invoice. */
export function apiFileUrl(path: string): string {
  return API_BASE_URL + path;
}
