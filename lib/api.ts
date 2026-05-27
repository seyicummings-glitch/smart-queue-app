/**
 * HTTP client for the Django REST backend.
 * Handles JWT storage, auto-refresh on 401, and error normalisation.
 *
 * Server URL is configurable at runtime via setServerUrl() — stored in
 * AsyncStorage so it survives restarts without a code change or rebuild.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const REQUEST_TIMEOUT_MS = 15_000;
const SERVER_URL_KEY = 'sqms_server_url';

// In-memory cache of the user-configured URL (loaded once at startup)
let _runtimeUrl: string | null = null;

/** Call once at app startup. Loads a manually saved URL only if present. */
export async function initServerUrl(): Promise<void> {
  // Do not load from AsyncStorage — TUNNEL_BASE_URL in this file is always
  // kept current by start-dev.sh, which rewrites it on every server start.
  // AsyncStorage overrides caused stale-URL failures after tunnel restarts.
}

/** Persist a new server URL immediately — affects all subsequent requests. */
export async function setServerUrl(url: string): Promise<void> {
  const clean = url.trim().replace(/\/+$/, '');
  _runtimeUrl = clean;
  await AsyncStorage.setItem(SERVER_URL_KEY, clean);
}

/** Return the currently saved URL (raw, without /api suffix), or null. */
export async function getStoredServerUrl(): Promise<string | null> {
  return AsyncStorage.getItem(SERVER_URL_KEY);
}

// Tunnel URL — updated automatically by start-dev.sh on every server start.
// Never edit this line manually; start-dev.sh rewrites it.
const TUNNEL_BASE_URL = 'https://unknown-lists-offer-farm.trycloudflare.com/api';

function getDefaultBaseUrl(): string {
  if (!__DEV__) return 'https://your-production-api.com/api';
  return TUNNEL_BASE_URL;
}

// Static fallback (used before initServerUrl() resolves, or if no URL is saved)
export const BASE_URL = getDefaultBaseUrl();

// The effective URL used for every request — AsyncStorage value wins over static fallback
function effectiveBaseUrl(): string {
  return _runtimeUrl ?? BASE_URL;
}

const TOKEN_KEYS = {
  ACCESS:  'sqms_access',
  REFRESH: 'sqms_refresh',
} as const;

// ── Token storage ─────────────────────────────────────────────────────────────
export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEYS.ACCESS);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEYS.REFRESH);
}

export async function storeTokens(access: string, refresh: string): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_KEYS.ACCESS,  access],
    [TOKEN_KEYS.REFRESH, refresh],
  ]);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEYS.ACCESS, TOKEN_KEYS.REFRESH]);
}

// ── Fetch with timeout ────────────────────────────────────────────────────────
async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Silent token refresh ──────────────────────────────────────────────────────
async function refreshAccessToken(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh) return null;
  try {
    const res = await fetchWithTimeout(`${effectiveBaseUrl()}/accounts/refresh/`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refresh }),
    });
    if (!res.ok) { await clearTokens(); return null; }
    const { access } = await res.json();
    await AsyncStorage.setItem(TOKEN_KEYS.ACCESS, access);
    return access as string;
  } catch {
    return null;
  }
}

// ── Core request helper ───────────────────────────────────────────────────────
type ApiResult<T> = { data: T; error: null } | { data: null; error: string };

export async function apiRequest<T = unknown>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  auth = true,
): Promise<ApiResult<T>> {
  const url     = `${effectiveBaseUrl()}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = await getAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };
    headers['Authorization'] = `Bearer ${token}`;
  }

  const makeRequest = () =>
    fetchWithTimeout(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  try {
    let res = await makeRequest();

    // Token expired → refresh once and retry
    if (res.status === 401 && auth) {
      const newToken = await refreshAccessToken();
      if (!newToken) return { data: null, error: 'Session expired. Please log in again.' };
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await makeRequest();
    }

    // 204 No Content — successful but no body
    if (res.status === 204) return { data: null as unknown as T, error: null };

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      let msg = `Request failed (${res.status})`;
      if (typeof json === 'object' && json !== null) {
        const j = json as Record<string, unknown>;
        if (typeof j.detail === 'string' && j.detail) {
          msg = j.detail;
        } else if (typeof j.message === 'string' && j.message) {
          msg = j.message;
        } else if (typeof j.error === 'string' && j.error) {
          msg = j.error;
        } else {
          const flat = Object.values(j)
            .flat()
            .filter((v): v is string => typeof v === 'string')
            .join(' · ');
          if (flat) msg = flat;
        }
      }
      return { data: null, error: msg };
    }

    return { data: json as T, error: null };
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { data: null, error: `Connection timed out (${effectiveBaseUrl()}). Update the server URL in the login screen.` };
    }
    const msg = e instanceof Error ? e.message : 'Network error';
    return { data: null, error: `${msg} — update the server URL in the login screen.` };
  }
}

// ── Convenience wrappers ──────────────────────────────────────────────────────
export const api = {
  get:    <T = unknown>(path: string, auth = true) =>
    apiRequest<T>('GET', path, undefined, auth),

  post:   <T = unknown>(path: string, body?: Record<string, unknown>, auth = true) =>
    apiRequest<T>('POST', path, body, auth),

  patch:  <T = unknown>(path: string, body?: Record<string, unknown>, auth = true) =>
    apiRequest<T>('PATCH', path, body, auth),

  delete: <T = unknown>(path: string, auth = true) =>
    apiRequest<T>('DELETE', path, undefined, auth),
};
