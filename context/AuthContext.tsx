/**
 * AuthContext — backed by the Django REST API (JWT auth).
 * Replaces the previous Supabase-based implementation.
 * Public surface (useAuth hook) is unchanged so all screens work without edits.
 */
import React, {
  createContext, useContext, useState, useEffect, ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, storeTokens, clearTokens, getAccessToken, initServerUrl } from '../lib/api';
import type { User } from '../lib/supabase';   // re-use existing type shape

// ── Types ─────────────────────────────────────────────────────────────────────
type AuthContextType = {
  user:          User | null;
  loading:       boolean;
  signIn:        (email: string, password: string)                        => Promise<{ error: string | null; role?: string }>;
  signUp:        (email: string, password: string, fullName: string, phone?: string, dateOfBirth?: string) => Promise<{ error: string | null; role?: string }>;
  signOut:       ()                                                        => Promise<void>;
  resetPassword: (email: string)                                          => Promise<{ error: string | null }>;
  updateProfile: (patch: Partial<Pick<User, 'full_name' | 'email'>>)      => Promise<{ error: string | null }>;
  verifyEmail:   (otp: string)                                            => Promise<{ error: string | null }>;
  resendOTP:     ()                                                        => Promise<{ error: string | null }>;
};

// ── Django response shapes ────────────────────────────────────────────────────
type DjangoUser = {
  id:             number;
  email:          string;
  full_name:      string;
  role:           string;
  phone?:         string;
  business?:      number | null;
  email_verified: boolean;
  created_at:     string;
};

type AuthResponse = {
  user:   DjangoUser;
  tokens: { access: string; refresh: string };
};

// Map Django user → our shared User type (keeps id as string for compatibility)
function toUser(d: DjangoUser): User {
  return {
    id:          String(d.id),
    email:       d.email,
    full_name:   d.full_name,
    role:        (d.role === 'super_admin' ? 'superadmin' : d.role) as User['role'],
    business_id: d.business ? String(d.business) : undefined,
    created_at:  d.created_at,
    updated_at:  d.created_at,  // Django doesn't always return updated_at
  };
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType>({
  user:          null,
  loading:       true,
  signIn:        async () => ({ error: null }),
  signUp:        async () => ({ error: null }),
  signOut:       async () => {},
  resetPassword: async () => ({ error: null }),
  updateProfile: async () => ({ error: null }),
  verifyEmail:   async () => ({ error: null }),
  resendOTP:     async () => ({ error: null }),
});

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: load saved server URL, then restore session
  useEffect(() => {
    (async () => {
      try {
        await initServerUrl();
        const token = await getAccessToken();
        if (!token) { setLoading(false); return; }

        const { data, error } = await api.get<DjangoUser>('/accounts/me/');
        if (!error && data) {
          setUser(toUser(data));
        } else {
          // Token invalid / expired and refresh also failed
          await clearTokens();
        }
      } catch {
        await clearTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── signIn ─────────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    const { data, error } = await api.post<AuthResponse>(
      '/accounts/login/',
      { email, password },
      false,
    );
    if (error || !data) return { error: error ?? 'Login failed' };

    await storeTokens(data.tokens.access, data.tokens.refresh);
    setUser(toUser(data.user));
    return { error: null, role: data.user.role };
  };

  // ── signUp ─────────────────────────────────────────────────────────────────
  const signUp = async (
    email:         string,
    password:      string,
    fullName:      string,
    phone          = '0000000000',
    dateOfBirth?:  string,
  ) => {
    const body: Record<string, unknown> = {
      email, password, password2: password, full_name: fullName, phone,
    };
    if (dateOfBirth) body.date_of_birth = dateOfBirth;

    const { data, error } = await api.post<AuthResponse>('/accounts/register/', body, false);
    if (error || !data) return { error: error ?? 'Registration failed' };

    await storeTokens(data.tokens.access, data.tokens.refresh);
    setUser(toUser(data.user));
    return { error: null, role: data.user.role };
  };

  // ── signOut ────────────────────────────────────────────────────────────────
  const signOut = async () => {
    const refresh = await AsyncStorage.getItem('sqms_refresh');
    if (refresh) {
      // Fire-and-forget: never let a network failure block local sign-out
      api.post('/accounts/logout/', { refresh }).catch(() => {});
    }
    await clearTokens();
    setUser(null);
  };

  // ── resetPassword ──────────────────────────────────────────────────────────
  const resetPassword = async (_email: string) => {
    // Django Simple JWT doesn't ship a password-reset flow by default.
    // Return a friendly message; wire up your own endpoint here when ready.
    return { error: 'Password reset is not yet available. Please contact support.' };
  };

  // ── updateProfile ──────────────────────────────────────────────────────────
  const updateProfile = async (patch: Partial<Pick<User, 'full_name' | 'email'>>) => {
    const body: Record<string, unknown> = {};
    if (patch.full_name !== undefined) body.full_name = patch.full_name;
    if (patch.email     !== undefined) body.email     = patch.email;

    const { data, error } = await api.patch<DjangoUser>('/accounts/me/', body);
    if (error || !data) return { error: error ?? 'Update failed' };
    setUser(toUser(data));
    return { error: null };
  };

  // ── verifyEmail ────────────────────────────────────────────────────────────
  const verifyEmail = async (otp: string) => {
    const { error } = await api.post('/accounts/verify-email/', { otp });
    if (error) return { error };
    // Refresh user so email_verified reflects the update
    const { data } = await api.get<DjangoUser>('/accounts/me/');
    if (data) setUser(toUser(data));
    return { error: null };
  };

  // ── resendOTP ──────────────────────────────────────────────────────────────
  const resendOTP = async () => {
    const { error } = await api.post('/accounts/resend-otp/', {});
    return { error: error ?? null };
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword, updateProfile, verifyEmail, resendOTP }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
