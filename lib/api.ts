/**
 * HTTP client for the Django REST backend.
 * Handles JWT storage, auto-refresh on 401, and error normalisation.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Android emulator maps localhost → 10.0.2.2; every other platform uses localhost
export const BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api'
    : 'http://localhost:8000/api';

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

// ── Silent token refresh ──────────────────────────────────────────────────────
async function refreshAccessToken(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh) return null;
  try {
    const res = await fetch(`${BASE_URL}/token/refresh/`, {
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
  const url     = `${BASE_URL}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = await getAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };
    headers['Authorization'] = `Bearer ${token}`;
  }

  const makeRequest = () =>
    fetch(url, {
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
      // DRF error shapes: { detail }, { field: [msg] }, { non_field_errors: [msg] }
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
    const msg = e instanceof Error ? e.message : 'Network error — is the backend running?';
    return { data: null, error: msg };
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
