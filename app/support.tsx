import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { CheckCircle, Send, AlertCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  background: '#F4F7F5',
  surface: '#FFFFFF',
  surfaceSecondary: '#EDF2EF',
  text: '#1A2E25',
  textSecondary: '#5C7A6A',
  textTertiary: '#9BB5A8',
  primary: '#2D7A5F',
  primaryMuted: '#E8F4EF',
  border: 'rgba(45, 122, 95, 0.08)',
  borderFocus: 'rgba(45, 122, 95, 0.4)',
  success: '#34A853',
  danger: '#EF4444',
};

type Role = 'client' | 'therapist' | 'other';
const ROLES: { key: Role; label: string }[] = [
  { key: 'client', label: 'Client' },
  { key: 'therapist', label: 'Therapist' },
  { key: 'other', label: 'Other' },
];

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold', marginBottom: 6 }}>
      {label}
      {required ? <Text style={{ color: COLORS.danger }}> *</Text> : null}
    </Text>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
      <AlertCircle size={12} color={COLORS.danger} />
      <Text style={{ fontSize: 12, color: COLORS.danger, fontFamily: 'DMSans_400Regular' }}>{message}</Text>
    </View>
  );
}

export default function SupportScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<Role>('client');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!subject.trim()) newErrors.subject = 'Subject is required';
    if (!message.trim()) {
      newErrors.message = 'Message is required';
    } else if (message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, email, subject, message]);

  const handleSubmit = useCallback(async () => {
    console.log('[Support] Submit button pressed');
    if (!validate()) {
      console.log('[Support] Validation failed');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const body = {
      name: name.trim(),
      email: email.trim(),
      role,
      subject: subject.trim(),
      message: message.trim(),
    };
    console.log('[Support] POST /api/support', body);
    try {
      await api.post('/api/support', body);
      console.log('[Support] Support message sent successfully');
      setSubmitted(true);
      setName('');
      setEmail('');
      setRole('client');
      setSubject('');
      setMessage('');
      setErrors({});
      if (Platform.OS === 'ios') {
        const Haptics = await import('expo-haptics');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send message';
      console.error('[Support] Submit error:', msg);
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [name, email, role, subject, message, validate]);

  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Stack.Screen options={{ title: 'Contact & Support' }} />
        <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <CheckCircle size={40} color={COLORS.success} />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold', marginBottom: 10, textAlign: 'center' }}>
          Message sent!
        </Text>
        <Text style={{ fontSize: 15, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
          We'll be in touch soon. Expect a reply within 1–2 business days.
        </Text>
        <AnimatedPressable onPress={() => { console.log('[Support] Send another pressed'); setSubmitted(false); }}>
          <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(45,122,95,0.15)' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' }}>Send another message</Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen options={{ title: 'Contact & Support' }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 120, paddingTop: 8 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Intro */}
          <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(45,122,95,0.12)' }}>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', lineHeight: 20 }}>
              Have a question or need help? Send us a message and we'll get back to you within 1–2 business days.
            </Text>
          </View>

          {/* Name */}
          <View style={{ marginBottom: 14 }}>
            <FieldLabel label="Name" required />
            <TextInput
              value={name}
              onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: undefined })); }}
              placeholder="Your full name"
              placeholderTextColor={COLORS.textTertiary}
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: errors.name ? COLORS.danger : COLORS.border,
                paddingHorizontal: 14,
                paddingVertical: 13,
                fontSize: 15,
                color: COLORS.text,
                fontFamily: 'DMSans_400Regular',
              }}
            />
            <FieldError message={errors.name} />
          </View>

          {/* Email */}
          <View style={{ marginBottom: 14 }}>
            <FieldLabel label="Email" required />
            <TextInput
              value={email}
              onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined })); }}
              placeholder="your@email.com"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: errors.email ? COLORS.danger : COLORS.border,
                paddingHorizontal: 14,
                paddingVertical: 13,
                fontSize: 15,
                color: COLORS.text,
                fontFamily: 'DMSans_400Regular',
              }}
            />
            <FieldError message={errors.email} />
          </View>

          {/* Role selector */}
          <View style={{ marginBottom: 14 }}>
            <FieldLabel label="I am a..." />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {ROLES.map((r) => {
                const isActive = role === r.key;
                return (
                  <AnimatedPressable
                    key={r.key}
                    onPress={() => { console.log('[Support] Role selected:', r.key); setRole(r.key); }}
                    scaleValue={0.95}
                    style={{ flex: 1 }}
                  >
                    <View
                      style={{
                        paddingVertical: 11,
                        borderRadius: 12,
                        alignItems: 'center',
                        backgroundColor: isActive ? COLORS.primary : COLORS.surface,
                        borderWidth: 1,
                        borderColor: isActive ? COLORS.primary : COLORS.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: isActive ? '#fff' : COLORS.textSecondary,
                          fontFamily: 'DMSans_600SemiBold',
                        }}
                      >
                        {r.label}
                      </Text>
                    </View>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          {/* Subject */}
          <View style={{ marginBottom: 14 }}>
            <FieldLabel label="Subject" required />
            <TextInput
              value={subject}
              onChangeText={(t) => { setSubject(t); setErrors((e) => ({ ...e, subject: undefined })); }}
              placeholder="What's this about?"
              placeholderTextColor={COLORS.textTertiary}
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: errors.subject ? COLORS.danger : COLORS.border,
                paddingHorizontal: 14,
                paddingVertical: 13,
                fontSize: 15,
                color: COLORS.text,
                fontFamily: 'DMSans_400Regular',
              }}
            />
            <FieldError message={errors.subject} />
          </View>

          {/* Message */}
          <View style={{ marginBottom: 14 }}>
            <FieldLabel label="Message" required />
            <TextInput
              value={message}
              onChangeText={(t) => { setMessage(t); setErrors((e) => ({ ...e, message: undefined })); }}
              placeholder="Describe your question or issue..."
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: errors.message ? COLORS.danger : COLORS.border,
                paddingHorizontal: 14,
                paddingVertical: 13,
                fontSize: 15,
                color: COLORS.text,
                fontFamily: 'DMSans_400Regular',
                minHeight: 120,
              }}
            />
            <FieldError message={errors.message} />
          </View>

          {/* Submit error */}
          {submitError ? (
            <View style={{ backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={14} color={COLORS.danger} />
              <Text style={{ fontSize: 13, color: COLORS.danger, fontFamily: 'DMSans_400Regular', flex: 1 }}>{submitError}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Submit button — fixed at bottom */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 16,
            paddingTop: 12,
            backgroundColor: COLORS.background,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
          }}
        >
          <AnimatedPressable onPress={handleSubmit} disabled={submitting}>
            <View
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 14,
                paddingVertical: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: submitting ? 0.7 : 1,
                boxShadow: '0 4px 16px rgba(45, 122, 95, 0.3)',
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Send size={17} color="#fff" />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: 'DMSans_700Bold' }}>
                    Send Message
                  </Text>
                </>
              )}
            </View>
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
