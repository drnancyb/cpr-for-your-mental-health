import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { authClient } from '@/lib/auth';

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
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: (forceRefresh?: boolean) => Promise<void>;
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
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async (forceRefresh = false) => {
    try {
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
      const sessionPromise = authClient.getSession(
        forceRefresh ? { fetchOptions: { cache: 'no-store' } } : undefined
      ).then(s => s).catch(() => null);
      const session = await Promise.race([sessionPromise, timeoutPromise]);
      if (session && (session as any)?.data?.user) {
        console.log('[AuthContext] fetchUser got user:', (session as any).data.user?.email, 'role:', (session as any).data.user?.role);
        setUser((session as any).data.user as AuthUser);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
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

  const signInWithEmail = useCallback(async (email: string, password: string) => {
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
    console.log('[AuthContext] Sign in succeeded, fetching fresh user session');
    await fetchUser(true);
  }, [fetchUser]);

  const signUpWithEmail = useCallback(async (email: string, password: string, name: string) => {
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
    console.log('[AuthContext] Sign up succeeded, fetching user session');
    await fetchUser();
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
    await authClient.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, signOut, fetchUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
