import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Send, AlertCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  background: '#F4F7F5',
  surface: '#FFFFFF',
  text: '#1A2E25',
  textSecondary: '#5C7A6A',
  textTertiary: '#9BB5A8',
  primary: '#2D7A5F',
  primaryMuted: '#E8F4EF',
  border: 'rgba(45, 122, 95, 0.08)',
  danger: '#EF4444',
};

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  const asterisk = required ? <Text style={{ color: COLORS.danger }}> *</Text> : null;
  return (
    <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold', marginBottom: 6 }}>
      {label}
      {asterisk}
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

export default function ContactScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!subject.trim()) newErrors.subject = 'Subject is required';
    if (!message.trim()) newErrors.message = 'Message is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, email, subject, message]);

  const handleSubmit = useCallback(async () => {
    console.log('[Contact] Submit button pressed');
    if (!validate()) {
      console.log('[Contact] Validation failed', errors);
      return;
    }
    setSubmitting(true);
    const body = {
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    };
    console.log('[Contact] POST /api/contact', body);
    try {
      await api.post('/api/contact', body);
      console.log('[Contact] Message sent successfully');
      Alert.alert('Message Sent', 'Your message has been sent to the admin.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send message. Please try again.';
      console.error('[Contact] Submit error:', msg);
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  }, [name, email, subject, message, validate, errors]);

  const nameBorderColor = errors.name ? COLORS.danger : COLORS.border;
  const emailBorderColor = errors.email ? COLORS.danger : COLORS.border;
  const subjectBorderColor = errors.subject ? COLORS.danger : COLORS.border;
  const messageBorderColor = errors.message ? COLORS.danger : COLORS.border;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen options={{ title: 'Contact Us' }} />
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
          {/* Intro banner */}
          <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(45,122,95,0.12)' }}>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', lineHeight: 20 }}>
              Have a question or concern? Send us a message and we'll get back to you as soon as possible.
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
                borderColor: nameBorderColor,
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
                borderColor: emailBorderColor,
                paddingHorizontal: 14,
                paddingVertical: 13,
                fontSize: 15,
                color: COLORS.text,
                fontFamily: 'DMSans_400Regular',
              }}
            />
            <FieldError message={errors.email} />
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
                borderColor: subjectBorderColor,
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
              placeholder="Write your message here..."
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: messageBorderColor,
                paddingHorizontal: 14,
                paddingVertical: 13,
                fontSize: 15,
                color: COLORS.text,
                fontFamily: 'DMSans_400Regular',
                minHeight: 130,
              }}
            />
            <FieldError message={errors.message} />
          </View>
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
