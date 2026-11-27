// Thin HTTP client for the TransMute backend. All requests go to API_BASE_URL.
// Requests carry the session cookie. Writes send the CSRF token from the XSRF-TOKEN cookie.

export const API_BASE_URL: string =
  (import.meta.env?.VITE_API_URL as string | undefined) ?? 'http://localhost:8080';

/** Fired on window when the server says the session is missing or has expired. */
export const SESSION_ENDED_EVENT = 'transmute:session-ended';

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

function csrfToken(): string | undefined {
  try {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

let warnedMissingCsrf = false;

/** The CSRF token for a write. Warns once when it is missing, but the request is still sent. */
function writeCsrfToken(): string | undefined {
  const token = csrfToken();
  if (!token && !warnedMissingCsrf) {
    warnedMissingCsrf = true;
    console.warn('XSRF-TOKEN cookie not found. Write requests are sent without the X-XSRF-TOKEN header.');
  }
  return token;
}

async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, credentials: 'include' });
  } catch {
    throw new ApiError(`Cannot reach the TransMute server at ${API_BASE_URL}. Is the backend running?`, 0);
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    try {
      const text = await res.text();
      return (text ? JSON.parse(text) : undefined) as T;
    } catch {
      throw new ApiError('The server sent an unexpected response. Try again.', res.status);
    }
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
  if (res.status === 403) {
    message = 'Your session may have expired. Refresh the page and sign in again.';
  }
  if (res.status === 401) {
    window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
  }
  throw new ApiError(message, res.status, fields);
}

export async function apiGet<T>(path: string): Promise<T> {
  return parse<T>(await send(API_BASE_URL + path, { headers: { Accept: 'application/json' } }));
}

export async function apiSend<T>(method: 'POST' | 'PUT' | 'PATCH', path: string, body?: unknown): Promise<T> {
  const token = writeCsrfToken();
  return parse<T>(
    await send(API_BASE_URL + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { 'X-XSRF-TOKEN': token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  );
}

export async function apiUpload<T>(path: string, file: File, channel: string): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  form.append('channel', channel);
  const token = writeCsrfToken();
  return parse<T>(
    await send(API_BASE_URL + path, {
      method: 'POST',
      headers: token ? { 'X-XSRF-TOKEN': token } : undefined,
      body: form,
    })
  );
}

/** Absolute URL for a file served by the API, such as a stored invoice. */
export function apiFileUrl(path: string): string {
  return API_BASE_URL + path;
}
