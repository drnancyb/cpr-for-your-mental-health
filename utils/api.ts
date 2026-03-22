import Constants from 'expo-constants';
import { authClient } from '@/lib/auth';
import { getAdminToken } from '@/contexts/AuthContext';

const BASE_URL =
  (Constants.expoConfig?.extra?.backendUrl as string) ||
  'https://77zgefkppvrujkkwanvht7mztqqrxrhy.app.specular.dev';

async function getToken(): Promise<string | null> {
  // Admin-override token takes priority (set when logging in via /api/admin/login)
  const adminToken = getAdminToken();
  if (adminToken) return adminToken;
  // Fall back to Better Auth session token for regular users
  try {
    const { data } = await authClient.getSession();
    if (data?.session?.token) return data.session.token;
  } catch {}
  return null;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(text || `HTTP ${res.status}`), {
      status: res.status,
    });
  }

  const text = await res.text();
  return text ? JSON.parse(text) : undefined;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
