/**
 * HTTP client for the Django REST backend.
 * Handles JWT storage, auto-refresh on 401, caching, and error normalisation.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const REQUEST_TIMEOUT_MS = 8_000;   // reduced from 15s — fail faster
const SERVER_URL_KEY     = 'sqms_server_url';

let _runtimeUrl: string | null = null;

export async function initServerUrl(): Promise<void> {}

export async function setServerUrl(url: string): Promise<void> {
  const clean = url.trim().replace(/\/+$/, '');
  _runtimeUrl = clean;
  await AsyncStorage.setItem(SERVER_URL_KEY, clean);
}

export async function getStoredServerUrl(): Promise<string | null> {
  return AsyncStorage.getItem(SERVER_URL_KEY);
}

const TUNNEL_BASE_URL = 'https://smart-queue-app-production.up.railway.app/api';

function getDefaultBaseUrl(): string { return TUNNEL_BASE_URL; }

export const BASE_URL = getDefaultBaseUrl();

function effectiveBaseUrl(): string {
  return _runtimeUrl ?? BASE_URL;
}

const TOKEN_KEYS = {
  ACCESS:  'sqms_access',
  REFRESH: 'sqms_refresh',
} as const;

export async function getAccessToken():  Promise<string | null> { return AsyncStorage.getItem(TOKEN_KEYS.ACCESS);  }
export async function getRefreshToken(): Promise<string | null> { return AsyncStorage.getItem(TOKEN_KEYS.REFRESH); }

export async function storeTokens(access: string, refresh: string): Promise<void> {
  await AsyncStorage.multiSet([[TOKEN_KEYS.ACCESS, access], [TOKEN_KEYS.REFRESH, refresh]]);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEYS.ACCESS, TOKEN_KEYS.REFRESH]);
}

// ── In-memory GET cache (stale-while-revalidate) ──────────────────────────────
const CACHE_TTL = 12_000;  // serve cached data for up to 12 seconds
const _cache    = new Map<string, { data: unknown; ts: number }>();

function hitCache(path: string): unknown | null {
  const e = _cache.get(path);
  return e && (Date.now() - e.ts) < CACHE_TTL ? e.data : null;
}

function setCache(path: string, data: unknown): void {
  _cache.set(path, { data, ts: Date.now() });
}

/** Call at the start of a manual refresh to force fresh data. */
export function clearCache(path?: string): void {
  if (path) _cache.delete(path);
  else      _cache.clear();
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

    if (res.status === 401 && auth) {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        clearCache();
        return { data: null, error: 'Session expired. Please log in again.' };
      }
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await makeRequest();
      // Still 401 after refresh — clear everything so user is prompted to re-login
      if (res.status === 401) {
        await clearTokens();
        clearCache();
        return { data: null, error: 'Session expired. Please log in again.' };
      }
    }

    if (res.status === 204) return { data: null as unknown as T, error: null };

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      let msg = `Request failed (${res.status})`;
      if (typeof json === 'object' && json !== null) {
        const j = json as Record<string, unknown>;
        if (typeof j.detail  === 'string' && j.detail)  msg = j.detail;
        else if (typeof j.message === 'string' && j.message) msg = j.message;
        else if (typeof j.error   === 'string' && j.error)   msg = j.error;
        else {
          const flat = Object.values(j).flat().filter((v): v is string => typeof v === 'string').join(' · ');
          if (flat) msg = flat;
        }
      }
      return { data: null, error: msg };
    }

    return { data: json as T, error: null };
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { data: null, error: 'Connection timed out. Check your internet and try again.' };
    }
    return { data: null, error: 'Network error. Check your internet connection.' };
  }
}

// ── Convenience wrappers ──────────────────────────────────────────────────────
export const api = {
  /**
   * GET with automatic caching. Returns cached data instantly if fresh (<12s).
   * Pass `fresh = true` on manual refreshes to bypass cache.
   */
  get: <T = unknown>(path: string, auth = true, fresh = false): Promise<ApiResult<T>> => {
    if (!fresh) {
      const cached = hitCache(path);
      if (cached != null) return Promise.resolve({ data: cached as T, error: null });
    }
    return apiRequest<T>('GET', path, undefined, auth).then(result => {
      if (!result.error && result.data !== null) setCache(path, result.data);
      return result;
    });
  },

  post: <T = unknown>(path: string, body?: Record<string, unknown>, auth = true) =>
    apiRequest<T>('POST', path, body, auth).then(r => { if (!r.error) clearCache(); return r; }),

  patch: <T = unknown>(path: string, body?: Record<string, unknown>, auth = true) =>
    apiRequest<T>('PATCH', path, body, auth).then(r => { if (!r.error) clearCache(); return r; }),

  put: <T = unknown>(path: string, body?: Record<string, unknown>, auth = true) =>
    apiRequest<T>('PUT', path, body, auth).then(r => { if (!r.error) clearCache(); return r; }),

  delete: <T = unknown>(path: string, auth = true) =>
    apiRequest<T>('DELETE', path, undefined, auth).then(r => { if (!r.error) clearCache(); return r; }),
};
