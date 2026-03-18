import 'react-native-reanimated';
import React, { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { Stack, Redirect, usePathname, useRouter } from 'expo-router';
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
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { isOnboardingComplete } from "@/utils/onboardingStorage";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'index',
};

function SubscriptionRedirect() {
  const { isSubscribed, loading } = useSubscription();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || authLoading) return;
    const onAuthScreen = pathname === "/auth-screen";
    if (onAuthScreen) return;
    if (!user) {
      router.replace("/auth-screen");
      return;
    }
    const onOnboarding = pathname.startsWith("/onboarding");
    if (onOnboarding) return;

    let cancelled = false;
    isOnboardingComplete().then((done) => {
      if (cancelled) return;
      if (!done) {
        router.replace("/onboarding");
        return;
      }
        // Don't force subscription — app has a free tier
    }).catch(() => {
      // Don't force subscription — app has a free tier
    });
    return () => { cancelled = true; };
  }, [isSubscribed, loading, authLoading, pathname, user]);

  return null;
}

export default function RootLayout() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    isOnboardingComplete().then((complete) => {
      setOnboardingComplete(complete);
    });
  }, [pathname]);

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
          <SubscriptionRedirect />
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
                      presentation: 'modal',
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
