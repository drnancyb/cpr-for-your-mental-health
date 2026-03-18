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
  Animated,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeOff } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { DisclaimerBanner } from '@/components/disclaimer-banner';

const COLORS = {
  background: '#F4F7F5',
  surface: '#FFFFFF',
  surfaceSecondary: '#EDF2EF',
  text: '#1A2E25',
  textSecondary: '#5C7A6A',
  textTertiary: '#9BB5A8',
  primary: '#2D7A5F',
  primaryMuted: '#E8F4EF',
  accent: '#4CAF82',
  border: 'rgba(45, 122, 95, 0.12)',
  danger: '#EF4444',
};

export default function AuthScreen() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    console.log('[AuthScreen] Submit pressed, mode:', mode, 'email:', email);
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signin') {
        console.log('[AuthScreen] Signing in with email:', email);
        await signInWithEmail(email.trim(), password);
      } else {
        console.log('[AuthScreen] Signing up with email:', email, 'name:', name);
        await signUpWithEmail(email.trim(), password, name.trim());
      }
      console.log('[AuthScreen] Auth success, navigating back');
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.';
      console.log('[AuthScreen] Auth error:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    console.log('[AuthScreen] Google sign-in pressed');
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      console.log('[AuthScreen] Google sign-in initiated, waiting for OAuth callback');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Google sign-in failed.';
      console.log('[AuthScreen] Google sign-in error:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async () => {
    console.log('[AuthScreen] Apple sign-in pressed');
    setError(null);
    setLoading(true);
    try {
      await signInWithApple();
      console.log('[AuthScreen] Apple sign-in initiated, waiting for OAuth callback');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Apple sign-in failed.';
      console.log('[AuthScreen] Apple sign-in error:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    const next = mode === 'signin' ? 'signup' : 'signin';
    console.log('[AuthScreen] Switching mode to:', next);
    setMode(next);
    setError(null);
  };

  const isSignIn = mode === 'signin';
  const titleText = isSignIn ? 'Welcome back' : 'Create account';
  const subtitleText = isSignIn
    ? 'Sign in to manage your listing'
    : 'Register to list your practice in BC';
  const buttonLabel = isSignIn ? 'Sign in' : 'Create account';
  const togglePrompt = isSignIn ? "Don't have an account?" : 'Already have an account?';
  const toggleLabel = isSignIn ? 'Sign up' : 'Sign in';

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
          paddingHorizontal: 24,
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 32,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Close button */}
        <TouchableOpacity
          onPress={() => {
            console.log('[AuthScreen] Close pressed');
            router.back();
          }}
          style={{
            position: 'absolute',
            top: insets.top + 16,
            right: 24,
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: COLORS.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' }}>✕</Text>
        </TouchableOpacity>

        {/* Logo / Header */}
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              backgroundColor: COLORS.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              borderCurve: 'continuous',
              boxShadow: '0 6px 20px rgba(45, 122, 95, 0.35)',
            }}
          >
            <Text style={{ fontSize: 36 }}>🌿</Text>
          </View>
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: COLORS.text,
              fontFamily: 'DMSans_700Bold',
              marginBottom: 8,
              letterSpacing: -0.3,
            }}
          >
            {titleText}
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: COLORS.textSecondary,
              fontFamily: 'DMSans_400Regular',
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            {subtitleText}
          </Text>
        </View>

        {/* Mode toggle tabs */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: COLORS.surfaceSecondary,
            borderRadius: 14,
            borderCurve: 'continuous',
            padding: 4,
            marginBottom: 24,
          }}
        >
          {(['signin', 'signup'] as const).map((m) => {
            const isActive = mode === m;
            const tabLabel = m === 'signin' ? 'Sign In' : 'Create Account';
            return (
              <TouchableOpacity
                key={m}
                onPress={() => { setMode(m); setError(null); }}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 11,
                  borderCurve: 'continuous',
                  alignItems: 'center',
                  backgroundColor: isActive ? COLORS.surface : 'transparent',
                  boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : undefined,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: isActive ? COLORS.text : COLORS.textSecondary,
                    fontFamily: 'DMSans_600SemiBold',
                  }}
                >
                  {tabLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Form card */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            borderCurve: 'continuous',
            padding: 24,
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
            gap: 16,
          }}
        >
          {mode === 'signup' && (
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>
                Full Name
              </Text>
              <TextInput
                ref={nameRef}
                value={name}
                onChangeText={setName}
                placeholder="Jane Smith"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                style={{
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 12,
                  borderCurve: 'continuous',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: COLORS.text,
                  fontFamily: 'DMSans_400Regular',
                }}
              />
            </View>
          )}

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>
              Email
            </Text>
            <TextInput
              ref={emailRef}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                borderCurve: 'continuous',
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: COLORS.text,
                fontFamily: 'DMSans_400Regular',
              }}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>
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
                onSubmitEditing={handleSubmit}
                style={{
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 12,
                  borderCurve: 'continuous',
                  paddingHorizontal: 16,
                  paddingRight: 48,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: COLORS.text,
                  fontFamily: 'DMSans_400Regular',
                }}
              />
              <TouchableOpacity
                onPress={() => {
                  console.log('[AuthScreen] Toggle password visibility:', !showPassword);
                  setShowPassword(!showPassword);
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

          {error ? (
            <View
              style={{
                backgroundColor: '#FEF2F2',
                borderRadius: 10,
                borderCurve: 'continuous',
                padding: 12,
                borderWidth: 1,
                borderColor: '#FECACA',
              }}
            >
              <Text style={{ fontSize: 13, color: COLORS.danger, fontFamily: 'DMSans_400Regular', lineHeight: 18 }} selectable>
                {error}
              </Text>
            </View>
          ) : null}

          <AnimatedPressable onPress={handleSubmit} disabled={loading}>
            <View
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 14,
                borderCurve: 'continuous',
                paddingVertical: 16,
                alignItems: 'center',
                marginTop: 4,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>
                  {buttonLabel}
                </Text>
              )}
            </View>
          </AnimatedPressable>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 2 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
            <Text style={{ fontSize: 13, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
              or continue with
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
          </View>

          {/* Apple Sign In — iOS only */}
          {Platform.OS === 'ios' && (
            <AnimatedPressable onPress={handleApple} disabled={loading}>
              <View
                style={{
                  backgroundColor: '#000',
                  borderRadius: 14,
                  borderCurve: 'continuous',
                  paddingVertical: 15,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 17, color: '#fff', lineHeight: 20 }}></Text>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>
                  Continue with Apple
                </Text>
              </View>
            </AnimatedPressable>
          )}

          {/* Google Sign In */}
          <AnimatedPressable onPress={handleGoogle} disabled={loading}>
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 14,
                borderCurve: 'continuous',
                paddingVertical: 15,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#4285F4' }}>G</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>
                Continue with Google
              </Text>
            </View>
          </AnimatedPressable>
        </View>

        {/* Toggle mode */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24, gap: 4 }}>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
            {togglePrompt}
          </Text>
          <TouchableOpacity onPress={switchMode} activeOpacity={0.7}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' }}>
              {toggleLabel}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <DisclaimerBanner />

        {/* Admin setup entry point — subtle, for first-time setup only */}
        <TouchableOpacity
          onPress={() => {
            console.log('[AuthScreen] Admin setup link pressed');
            router.push('/admin-setup');
          }}
          activeOpacity={0.6}
          style={{ alignItems: 'center', marginTop: 16, opacity: 0.4 }}
        >
          <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
            First time? Set up admin access
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
