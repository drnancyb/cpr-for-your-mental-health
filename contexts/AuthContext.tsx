import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { authClient } from '@/lib/auth';

// Module-level storage for the admin token so api.ts can read it synchronously
// without needing React context. Set when admin logs in, cleared on sign-out.
let _adminToken: string | null = null;
export function getAdminToken(): string | null { return _adminToken; }
export function setAdminToken(token: string | null): void { _adminToken = token; }

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
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
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
        console.log('[AuthContext] fetchUser got user:', (session as any).data.user?.email, 'role:', (session as any).data.user?.role);
        setSessionUser((session as any).data.user as AuthUser);
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
    // If the response already contains the user, set it immediately so navigation
    // triggers without waiting for a second round-trip.
    if ((result as any)?.data?.user) {
      const u = (result as any).data.user as AuthUser;
      console.log('[AuthContext] Sign in: setting user from response directly:', u.email, 'role:', u.role);
      setSessionUser(u);
      return u;
    } else {
      console.log('[AuthContext] Sign in succeeded, fetching fresh user session');
      await fetchUser(true);
      // fetchUser sets sessionUser; return whatever was resolved
      const session = await authClient.getSession();
      const u = (session as any)?.data?.user as AuthUser | undefined;
      if (!u) throw new Error('Sign in succeeded but could not retrieve user session.');
      return u;
    }
  }, [fetchUser]);

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
    // If the response already contains the user, set it immediately.
    if ((result as any)?.data?.user) {
      const u = (result as any).data.user as AuthUser;
      console.log('[AuthContext] Sign up: setting user from response directly:', u.email, 'role:', u.role);
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
