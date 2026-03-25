import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeOff, ShieldCheck, ArrowLeft, Settings } from 'lucide-react-native';

const BACKEND_URL = 'https://77zgefkppvrujkkwanvht7mztqqrxrhy.app.specular.dev';

const COLORS = {
  background: '#0F1E2B',
  surface: '#1A2E3D',
  surfaceSecondary: '#243547',
  text: '#F0F6FF',
  textSecondary: '#8BAABF',
  textTertiary: '#4D6B82',
  primary: '#2D7A5F',
  primaryLight: '#3A9B78',
  border: 'rgba(45, 122, 95, 0.25)',
  danger: '#EF4444',
  accent: '#4CAF82',
};

export default function AdminLoginScreen() {
  const { setAdminUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);

  const handleSignIn = async () => {
    console.log('[AdminLogin] handleSignIn fired, email:', email);
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter your email and password.');
      return;
    }
    setErrorMessage(null);
    setLoading(true);
    try {
      const url = `${BACKEND_URL}/api/admin/login`;
      console.log('[AdminLogin] POST', url, 'for:', email.trim());
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      console.log('[AdminLogin] Response status:', response.status);
      if (!response.ok) {
        const text = await response.text();
        console.log('[AdminLogin] Error response body:', text);
        let message = `Login failed (${response.status}).`;
        // Only try to parse JSON — ignore HTML error pages
        if (text && !text.trimStart().startsWith('<')) {
          try {
            const parsed = JSON.parse(text);
            message = parsed?.message || parsed?.error || message;
          } catch {
            message = text || message;
          }
        } else if (response.status === 401) {
          message = 'Invalid email or password.';
        } else if (response.status === 500) {
          message = 'Server error — please try again later.';
        }
        throw new Error(message);
      }
      const result = await response.json();
      console.log('[AdminLogin] Success response:', JSON.stringify(result));
      if (!result?.user) {
        throw new Error('Invalid response from server — no user returned.');
      }
      console.log('[AdminLogin] Setting admin user:', result.user.email, 'role:', result.user.role, 'hasToken:', !!result.token);
      setAdminUser(result.user, result.token ?? undefined);
      console.log('[AdminLogin] Navigating to /admin');
      router.replace('/admin');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.';
      console.log('[AdminLogin] Login error:', msg);
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToSetup = () => {
    console.log('[AdminLogin] First time setup pressed, navigating to /admin-setup');
    router.push('/admin-setup');
  };

  const handleBackToApp = () => {
    console.log('[AdminLogin] Back to app pressed');
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 28,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 32,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 44 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              backgroundColor: COLORS.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <ShieldCheck size={38} color="#fff" strokeWidth={1.8} />
          </View>
          <Text
            style={{
              fontSize: 30,
              fontWeight: '700',
              color: COLORS.text,
              fontFamily: 'DMSans_700Bold',
              marginBottom: 8,
              letterSpacing: -0.5,
            }}
          >
            Admin Login
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: COLORS.textSecondary,
              fontFamily: 'DMSans_400Regular',
              textAlign: 'center',
              letterSpacing: 0.2,
            }}
          >
            Canadian Psychological Resources
          </Text>
        </View>

        {/* Form card */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 22,
            padding: 24,
            gap: 18,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          {/* Email */}
          <View style={{ gap: 8 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: COLORS.textSecondary,
                fontFamily: 'DMSans_600SemiBold',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="admin@example.com"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 15,
                fontSize: 16,
                color: COLORS.text,
                fontFamily: 'DMSans_400Regular',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.05)',
              }}
            />
          </View>

          {/* Password */}
          <View style={{ gap: 8 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: COLORS.textSecondary,
                fontFamily: 'DMSans_600SemiBold',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              Password
            </Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textTertiary}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
                style={{
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingRight: 52,
                  paddingVertical: 15,
                  fontSize: 16,
                  color: COLORS.text,
                  fontFamily: 'DMSans_400Regular',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.05)',
                }}
              />
              <TouchableOpacity
                onPress={() => {
                  console.log('[AdminLogin] Toggle password visibility');
                  setShowPassword(v => !v);
                }}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: 0,
                  bottom: 0,
                  justifyContent: 'center',
                  padding: 4,
                }}
                activeOpacity={0.7}
              >
                {showPassword
                  ? <EyeOff size={18} color={COLORS.textTertiary} />
                  : <Eye size={18} color={COLORS.textTertiary} />
                }
              </TouchableOpacity>
            </View>
          </View>

          {/* Inline error message */}
          {errorMessage && (
            <View
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: 'rgba(239, 68, 68, 0.35)',
                paddingHorizontal: 14,
                paddingVertical: 11,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: COLORS.danger,
                  fontFamily: 'DMSans_400Regular',
                  lineHeight: 18,
                }}
              >
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Sign In button */}
          <TouchableOpacity
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.8}
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 14,
              paddingVertical: 17,
              alignItems: 'center',
              marginTop: 4,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#fff',
                  fontFamily: 'DMSans_600SemiBold',
                  letterSpacing: 0.2,
                }}
              >
                Sign In
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Security note */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: 20,
          }}
        >
          <ShieldCheck size={13} color={COLORS.textTertiary} strokeWidth={2} />
          <Text
            style={{
              fontSize: 12,
              color: COLORS.textTertiary,
              fontFamily: 'DMSans_400Regular',
            }}
          >
            Restricted to authorized administrators only
          </Text>
        </View>

        {/* Back to app */}
        <TouchableOpacity
          onPress={handleBackToApp}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: 32,
            paddingVertical: 8,
          }}
        >
          <ArrowLeft size={15} color={COLORS.textSecondary} strokeWidth={2} />
          <Text
            style={{
              fontSize: 14,
              color: COLORS.textSecondary,
              fontFamily: 'DMSans_400Regular',
            }}
          >
            Back to App
          </Text>
        </TouchableOpacity>

        {/* First time setup link */}
        <TouchableOpacity
          onPress={handleGoToSetup}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: 12,
            paddingVertical: 8,
          }}
        >
          <Settings size={13} color={COLORS.textTertiary} strokeWidth={2} />
          <Text
            style={{
              fontSize: 13,
              color: COLORS.textTertiary,
              fontFamily: 'DMSans_400Regular',
            }}
          >
            First time setup?
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
