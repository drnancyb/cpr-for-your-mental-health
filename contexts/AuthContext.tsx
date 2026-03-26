import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { authClient } from '@/lib/auth';
import Constants from 'expo-constants';

// Module-level storage for the admin token so api.ts can read it synchronously
// without needing React context. Set when admin logs in, cleared on sign-out.
let _adminToken: string | null = null;
export function getAdminToken(): string | null { return _adminToken; }
export function setAdminToken(token: string | null): void { _adminToken = token; }

const BACKEND_URL =
  (Constants.expoConfig?.extra?.backendUrl as string) ||
  'https://77zgefkppvrujkkwanvht7mztqqrxrhy.app.specular.dev';

/**
 * After a successful Better Auth sign-in, check if the user is an admin by
 * calling /api/admin/login with the same credentials. The Better Auth session
 * does NOT include custom fields like `role`, so this is the only reliable way
 * to determine admin status from the main login screen.
 *
 * Returns 'admin' if the backend confirms admin role, null otherwise.
 * Never throws — a non-admin user will simply get a 401 which we ignore.
 * Also stores the admin token in module-level storage so api.ts can use it.
 */
async function checkAdminRole(email: string, password: string): Promise<string | null> {
  try {
    console.log('[AuthContext] checkAdminRole: POST /api/admin/login for:', email);
    const res = await fetch(`${BACKEND_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    console.log('[AuthContext] checkAdminRole: status', res.status);
    if (res.ok) {
      const data = await res.json();
      const role = data?.user?.role ?? null;
      console.log('[AuthContext] checkAdminRole: confirmed role:', role);
      if (data?.token) {
        setAdminToken(data.token);
        console.log('[AuthContext] checkAdminRole: admin token stored');
      }
      return role;
    }
    // 401/403 = not admin — expected for regular users, not an error
    return null;
  } catch (e) {
    console.log('[AuthContext] checkAdminRole error (non-fatal):', e);
    return null;
  }
}

WebBrowser.maybeCompleteAuthSession();

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  image?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<AuthUser>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<AuthUser>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: (forceRefresh?: boolean) => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  setAdminUser: (user: AuthUser | null, token?: string) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signInWithEmail: async () => { return {} as AuthUser; },
  signUpWithEmail: async () => { return {} as AuthUser; },
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signOut: async () => {},
  fetchUser: async () => {},
  setUser: () => {},
  setAdminUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null);
  const [adminOverride, setAdminOverride] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const user = adminOverride ?? sessionUser;
  const setUser = setSessionUser;
  const setAdminUser = useCallback((u: AuthUser | null, token?: string) => {
    console.log('[AuthContext] setAdminUser called:', u?.email ?? 'null', 'hasToken:', !!token);
    setAdminToken(token ?? null);
    setAdminOverride(u);
  }, []);

  const fetchUser = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setLoading(true);
    }
    try {
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
      const sessionPromise = authClient.getSession(
        forceRefresh ? { fetchOptions: { cache: 'no-store' } } : undefined
      ).then(s => s).catch(() => null);
      const session = await Promise.race([sessionPromise, timeoutPromise]);
      if (session && (session as any)?.data?.user) {
        const rawUser = (session as any).data.user as AuthUser;
        console.log('[AuthContext] fetchUser got user:', rawUser.email, 'role from session:', rawUser.role ?? '(none)');
        setSessionUser(rawUser);
      } else {
        setSessionUser(null);
      }
    } catch {
      setSessionUser(null);
    } finally {
      if (forceRefresh) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        console.warn('[AuthContext] Safety timeout: forcing loading to false');
        setLoading(false);
      }
    }, 6000);

    fetchUser().finally(() => {
      if (!cancelled) setLoading(false);
      clearTimeout(safetyTimer);
    });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [fetchUser]);

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    console.log('[AuthContext] signInWithEmail called for:', email);
    let result;
    try {
      result = await authClient.signIn.email({ email, password });
    } catch (err) {
      console.log('[AuthContext] signIn.email threw:', err);
      throw new Error(err instanceof Error ? err.message : 'Network error — please try again.');
    }
    console.log('[AuthContext] signIn.email result:', JSON.stringify({ error: result?.error, hasData: !!result?.data }));
    if (result?.error) {
      throw new Error(result.error.message || String(result.error.statusText) || 'Sign in failed');
    }

    // Get the raw user from the Better Auth response
    let rawUser: AuthUser | undefined;
    if ((result as any)?.data?.user) {
      rawUser = (result as any).data.user as AuthUser;
    } else {
      console.log('[AuthContext] Sign in succeeded, fetching fresh user session');
      const session = await authClient.getSession({ fetchOptions: { cache: 'no-store' } });
      rawUser = (session as any)?.data?.user as AuthUser | undefined;
      if (!rawUser) throw new Error('Sign in succeeded but could not retrieve user session.');
    }

    // Better Auth does NOT include custom fields like `role` in the session
    // response. Check admin status via /api/admin/login with the same creds.
    // For non-admin users this returns null quickly (401), so it's low overhead.
    console.log('[AuthContext] Sign in: checking admin role for:', rawUser.email);
    const role = await checkAdminRole(email, password);
    const enrichedUser: AuthUser = { ...rawUser, ...(role ? { role } : {}) };
    console.log('[AuthContext] Sign in complete:', enrichedUser.email, 'role:', enrichedUser.role ?? '(none — regular user)');
    setSessionUser(enrichedUser);
    return enrichedUser;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, name: string): Promise<AuthUser> => {
    console.log('[AuthContext] signUpWithEmail called for:', email);
    let result;
    try {
      result = await authClient.signUp.email({ email, password, name });
    } catch (err) {
      console.log('[AuthContext] signUp.email threw:', err);
      throw new Error(err instanceof Error ? err.message : 'Network error — please try again.');
    }
    console.log('[AuthContext] signUp.email result:', JSON.stringify({ error: result?.error, hasData: !!result?.data }));
    if (result?.error) {
      throw new Error(result.error.message || 'Sign up failed');
    }
    if ((result as any)?.data?.user) {
      const u = (result as any).data.user as AuthUser;
      console.log('[AuthContext] Sign up: setting user from response:', u.email, 'role:', u.role ?? '(none)');
      setSessionUser(u);
      return u;
    } else {
      console.log('[AuthContext] Sign up succeeded, fetching user session');
      await fetchUser(true);
      const session = await authClient.getSession();
      const u = (session as any)?.data?.user as AuthUser | undefined;
      if (!u) throw new Error('Sign up succeeded but could not retrieve user session.');
      return u;
    }
  }, [fetchUser]);

  const signInWithGoogle = useCallback(async () => {
    if (Platform.OS === 'web') {
      await authClient.signIn.social({ provider: 'google', callbackURL: '/auth-callback' });
    } else {
      const callbackURL = Linking.createURL('auth-callback');
      await authClient.signIn.social({
        provider: 'google',
        callbackURL,
        fetchOptions: {
          onSuccess: () => {
            fetchUser();
          },
        },
      });
    }
  }, [fetchUser]);

  const signInWithApple = useCallback(async () => {
    if (Platform.OS === 'web') {
      await authClient.signIn.social({ provider: 'apple', callbackURL: '/auth-callback' });
    } else {
      const callbackURL = Linking.createURL('auth-callback');
      await authClient.signIn.social({
        provider: 'apple',
        callbackURL,
        fetchOptions: {
          onSuccess: () => {
            fetchUser();
          },
        },
      });
    }
  }, [fetchUser]);

  const signOut = useCallback(async () => {
    console.log('[AuthContext] signOut called');
    try {
      const result = await authClient.signOut();
      console.log('[AuthContext] signOut API result:', JSON.stringify({ error: (result as any)?.error }));
    } catch (err) {
      console.warn('[AuthContext] signOut API threw (clearing session locally anyway):', err);
    }
    setAdminToken(null);
    setSessionUser(null);
    setAdminOverride(null);
    console.log('[AuthContext] signOut complete — user cleared');
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, signOut, fetchUser, setUser, setAdminUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
