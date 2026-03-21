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
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';

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
  const { user, loading: authLoading, signInWithEmail } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // If already logged in as admin, redirect straight to admin
  if (!authLoading && user && user.role === 'admin') {
    console.log('[AdminLogin] Already authenticated as admin, redirecting to /admin');
    router.replace('/admin');
    return null;
  }

  const handleSignIn = async () => {
    console.log('[AdminLogin] Sign in pressed, email:', email);
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      console.log('[AdminLogin] Calling signInWithEmail for:', email.trim());
      await signInWithEmail(email.trim(), password);
      console.log('[AdminLogin] Sign in succeeded, navigating to /admin');
      router.replace('/admin');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.';
      console.log('[AdminLogin] Sign in error:', msg);
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
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
              borderCurve: 'continuous',
              boxShadow: '0 8px 32px rgba(45, 122, 95, 0.4)',
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
            borderCurve: 'continuous',
            padding: 24,
            gap: 18,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
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
              ref={emailRef}
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
                borderCurve: 'continuous',
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
                  borderCurve: 'continuous',
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
                  console.log('[AdminLogin] Toggle password visibility:', !showPassword);
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

          {/* Sign In button */}
          <AnimatedPressable onPress={handleSignIn} disabled={loading}>
            <View
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 14,
                borderCurve: 'continuous',
                paddingVertical: 17,
                alignItems: 'center',
                marginTop: 4,
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 16px rgba(45, 122, 95, 0.4)',
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
            </View>
          </AnimatedPressable>
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
