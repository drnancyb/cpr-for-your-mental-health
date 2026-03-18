import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { api } from '@/utils/api';

const COLORS = {
  background: '#F4F7F5',
  surface: '#FFFFFF',
  surfaceSecondary: '#EDF2EF',
  text: '#1A2E25',
  textSecondary: '#5C7A6A',
  textTertiary: '#9BB5A8',
  primary: '#2D7A5F',
  border: 'rgba(45, 122, 95, 0.12)',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  success: '#16A34A',
  successBg: '#F0FDF4',
  successBorder: '#BBF7D0',
};

type ScreenState = 'form' | 'success' | 'disabled';

export default function AdminSetupScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [screenState, setScreenState] = useState<ScreenState>('form');
  const [inlineError, setInlineError] = useState<string | null>(null);

  const handleGrantAccess = async () => {
    console.log('[AdminSetup] Grant Admin Access pressed, email:', email);
    setInlineError(null);

    if (!email.trim()) {
      setInlineError('Please enter an email address.');
      return;
    }

    setLoading(true);
    try {
      console.log('[AdminSetup] POST /api/admin/bootstrap', { email: email.trim() });
      await api.post('/api/admin/bootstrap', { email: email.trim() });
      console.log('[AdminSetup] Bootstrap success');
      setScreenState('success');
    } catch (e: unknown) {
      const status = (e as { status?: number }).status;
      const message = e instanceof Error ? e.message : 'Something went wrong.';
      console.log('[AdminSetup] Bootstrap error, status:', status, 'message:', message);

      if (status === 400) {
        setScreenState('disabled');
      } else if (status === 404) {
        setInlineError('No account found with that email. Please sign up first.');
      } else {
        setInlineError(message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    console.log('[AdminSetup] Done pressed, navigating to /');
    router.replace('/');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Admin Setup', headerLargeTitle: false }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ padding: 24, gap: 24 }}
      >
        {/* Icon */}
        <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 4 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              borderCurve: 'continuous',
              backgroundColor: COLORS.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={40} color={COLORS.primary} />
          </View>
        </View>

        {/* Heading + body */}
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: '700',
              color: COLORS.text,
              fontFamily: 'DMSans_700Bold',
              textAlign: 'center',
              letterSpacing: -0.3,
            }}
          >
            First-Time Admin Setup
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
            This screen is only available once — before any admin account exists. Enter the email address of the account you want to make admin.
          </Text>
        </View>

        {/* Disabled state */}
        {screenState === 'disabled' && (
          <View
            style={{
              backgroundColor: COLORS.dangerBg,
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 20,
              borderWidth: 1,
              borderColor: COLORS.dangerBorder,
              gap: 8,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: COLORS.danger,
                fontFamily: 'DMSans_600SemiBold',
              }}
            >
              Setup Unavailable
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: COLORS.danger,
                fontFamily: 'DMSans_400Regular',
                lineHeight: 20,
                opacity: 0.85,
              }}
            >
              An admin account already exists. This setup screen is disabled.
            </Text>
          </View>
        )}

        {/* Success state */}
        {screenState === 'success' && (
          <View
            style={{
              backgroundColor: COLORS.successBg,
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 20,
              borderWidth: 1,
              borderColor: COLORS.successBorder,
              gap: 12,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: COLORS.success,
                fontFamily: 'DMSans_600SemiBold',
              }}
            >
              Admin access granted!
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: COLORS.success,
                fontFamily: 'DMSans_400Regular',
                lineHeight: 20,
                opacity: 0.85,
              }}
            >
              Sign out and sign back in to activate your admin role.
            </Text>
            <TouchableOpacity
              onPress={handleDone}
              activeOpacity={0.8}
              style={{
                backgroundColor: COLORS.success,
                borderRadius: 12,
                borderCurve: 'continuous',
                paddingVertical: 13,
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: '#fff',
                  fontFamily: 'DMSans_600SemiBold',
                }}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Form */}
        {screenState === 'form' && (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 20,
              borderCurve: 'continuous',
              padding: 24,
              gap: 16,
              boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
            }}
          >
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: COLORS.textSecondary,
                  fontFamily: 'DMSans_600SemiBold',
                }}
              >
                Email Address
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="admin@example.com"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleGrantAccess}
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

            {inlineError ? (
              <View
                style={{
                  backgroundColor: COLORS.dangerBg,
                  borderRadius: 10,
                  borderCurve: 'continuous',
                  padding: 12,
                  borderWidth: 1,
                  borderColor: COLORS.dangerBorder,
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
                  {inlineError}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleGrantAccess}
              disabled={loading}
              activeOpacity={0.8}
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 14,
                borderCurve: 'continuous',
                paddingVertical: 16,
                alignItems: 'center',
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
                  }}
                >
                  Grant Admin Access
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </>
  );
}
