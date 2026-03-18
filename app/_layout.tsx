import 'react-native-reanimated';
import React, { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SystemBars } from 'react-native-edge-to-edge';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { FiltersProvider } from '@/contexts/FiltersContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { isOnboardingComplete } from '@/utils/onboardingStorage';
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'index',
};

// Screens that are exempt from the onboarding gate (user can be on these while onboarding is in progress)
const ONBOARDING_EXEMPT = ['/onboarding', '/paywall'];

function NavigationGuard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (authLoading) return;

    // Step 1: Not authenticated → always go to auth screen
    if (!user) {
      if (pathname !== '/auth-screen') {
        console.log('[NavigationGuard] No user — redirecting to /auth-screen');
        router.replace('/auth-screen');
      }
      return;
    }

    // Step 2: Authenticated — check onboarding for every screen except exempt ones
    if (ONBOARDING_EXEMPT.includes(pathname)) {
      // Let onboarding/paywall screens manage their own forward navigation
      return;
    }

    isOnboardingComplete().then((complete) => {
      if (!complete) {
        // Onboarding not done — send to onboarding regardless of current screen
        console.log('[NavigationGuard] Onboarding incomplete — redirecting to /onboarding');
        router.replace('/onboarding');
      } else if (pathname === '/auth-screen') {
        // Onboarding done and still on auth screen — go home
        console.log('[NavigationGuard] Authenticated + onboarding complete — redirecting to /');
        router.replace('/');
      }
      // Otherwise already on a valid screen, do nothing
    });
  }, [authLoading, user, pathname, router]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [loaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <>
      <StatusBar style="auto" animated />
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SafeAreaProvider>
          <AuthProvider>
        <SubscriptionProvider>
        <NotificationProvider>
          <NavigationGuard />
            <FiltersProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>

                <Stack
                  screenOptions={{
                    headerTransparent: true,
                    headerLargeTitle: true,
                    headerBlurEffect: 'systemMaterial',
                    headerBackButtonDisplayMode: 'minimal',
                  }}
                >
                  <Stack.Screen name="onboarding" options={{ headerShown: false }} />

                  <Stack.Screen name="index" options={{ title: 'Find a Therapist' }} />
                  <Stack.Screen
                    name="filter-sheet"
                    options={{
                      presentation: 'formSheet',
                      sheetGrabberVisible: true,
                      sheetAllowedDetents: [0.75, 1.0],
                      contentStyle: { backgroundColor: 'transparent' },
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen
                    name="therapist/[id]"
                    options={{
                      headerShown: true,
                      headerTransparent: true,
                      headerLargeTitle: false,
                      headerBackButtonDisplayMode: 'minimal',
                      title: '',
                    }}
                  />
                  <Stack.Screen
                    name="auth-screen"
                    options={{
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen
                    name="apply"
                    options={{
                      title: 'Apply as Therapist',
                      headerLargeTitle: false,
                      headerBackButtonDisplayMode: 'minimal',
                    }}
                  />
                  <Stack.Screen
                    name="admin/index"
                    options={{
                      title: 'Admin Dashboard',
                      headerLargeTitle: true,
                      headerBackButtonDisplayMode: 'minimal',
                    }}
                  />
                  <Stack.Screen
                    name="admin/application/[id]"
                    options={{
                      title: 'Application',
                      headerLargeTitle: false,
                      headerBackButtonDisplayMode: 'minimal',
                    }}
                  />
                  <Stack.Screen
                    name="admin/add-therapist"
                    options={{
                      title: 'Add Therapist',
                      headerLargeTitle: false,
                      headerBackButtonDisplayMode: 'minimal',
                    }}
                  />
                  <Stack.Screen
                    name="admin/content"
                    options={{
                      title: 'App Content',
                      headerLargeTitle: false,
                      headerBackButtonDisplayMode: 'minimal',
                    }}
                  />
                  <Stack.Screen
                    name="booking/[therapistId]"
                    options={{
                      title: 'Request Session',
                      headerLargeTitle: false,
                      headerBackButtonDisplayMode: 'minimal',
                    }}
                  />
                  <Stack.Screen
                    name="saved"
                    options={{
                      title: 'Saved Therapists',
                      headerLargeTitle: false,
                      headerBackButtonDisplayMode: 'minimal',
                    }}
                  />
                  <Stack.Screen
                    name="my-bookings"
                    options={{
                      title: 'My Bookings',
                      headerLargeTitle: false,
                      headerBackButtonDisplayMode: 'minimal',
                    }}
                  />
                  <Stack.Screen
                    name="advertise"
                    options={{
                      title: 'Advertise Your Practice',
                      headerLargeTitle: false,
                      headerBackButtonDisplayMode: 'minimal',
                    }}
                  />
                  <Stack.Screen
                    name="privacy-policy"
                    options={{
                      title: 'Privacy Policy',
                      headerLargeTitle: false,
                      headerBackButtonDisplayMode: 'minimal',
                    }}
                  />
                  <Stack.Screen
                    name="preferences"
                    options={{
                      title: 'My Preferences',
                      headerLargeTitle: false,
                      headerBackButtonDisplayMode: 'minimal',
                    }}
                  />
                  <Stack.Screen
                    name="therapist-portal"
                    options={{
                      title: 'Therapist Portal',
                      headerLargeTitle: false,
                      headerBackButtonDisplayMode: 'minimal',
                    }}
                  />
                  <Stack.Screen
                    name="support"
                    options={{
                      title: 'Contact & Support',
                      headerLargeTitle: false,
                      headerBackButtonDisplayMode: 'minimal',
                    }}
                  />
                  <Stack.Screen
                    name="admin-setup"
                    options={{
                      title: 'Admin Setup',
                      headerLargeTitle: false,
                      headerBackButtonDisplayMode: 'minimal',
                    }}
                  />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <SystemBars style="auto" />
              </GestureHandlerRootView>
            </FiltersProvider>
          </NotificationProvider>
        </SubscriptionProvider>
        </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </>
  );
}
