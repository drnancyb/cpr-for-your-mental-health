import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const backendUrl =
  (Constants.expoConfig?.extra?.backendUrl as string) ||
  'https://77zgefkppvrujkkwanvht7mztqqrxrhy.app.specular.dev';

export const authClient = createAuthClient({
  baseURL: backendUrl,
  plugins: [
    expoClient({
      scheme: 'buildasimplemobil',
      storagePrefix: 'buildasimplemobil',
      storage: SecureStore,
    }),
  ],
});

export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session.user;
