import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays, Mail, Phone, CheckCircle, LogIn } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';

const BASE_URL = 'https://77zgefkppvrujkkwanvht7mztqqrxrhy.app.specular.dev';

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
  success: '#34A853',
  border: 'rgba(45, 122, 95, 0.08)',
  borderFocus: 'rgba(45, 122, 95, 0.35)',
  danger: '#EF4444',
};

type ContactMethod = 'email' | 'phone';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function BookingScreen() {
  const { therapistId } = useLocalSearchParams<{ therapistId: string }>();
  const { user } = useAuth();

  const [therapistName, setTherapistName] = useState('');
  const [preferredDate, setPreferredDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [message, setMessage] = useState('');
  const [contactMethod, setContactMethod] = useState<ContactMethod>('email');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!therapistId) return;
    console.log('[Booking] Fetching therapist name for:', therapistId);
    fetch(`${BASE_URL}/api/therapists/${therapistId}`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setTherapistName(data.name ?? '');
      })
      .catch(() => {});
  }, [therapistId]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        console.log('[Booking] Success timeout, navigating back');
        router.back();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleDateChange = useCallback((_: unknown, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      console.log('[Booking] Date selected:', date.toISOString());
      setPreferredDate(date);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) {
      setError('Please describe what you are looking for.');
      return;
    }
    console.log('[Booking] Submit pressed — therapistId:', therapistId, 'contactMethod:', contactMethod, 'hasDate:', !!preferredDate);
    setError(null);
    setSubmitting(true);
    try {
      const body: {
        therapist_id: string;
        message: string;
        contact_method: ContactMethod;
        preferred_date?: string;
      } = {
        therapist_id: therapistId!,
        message: message.trim(),
        contact_method: contactMethod,
      };
      if (preferredDate) {
        body.preferred_date = preferredDate.toISOString().split('T')[0];
      }
      console.log('[Booking] POST /api/bookings', JSON.stringify(body));
      await api.post('/api/bookings', body);
      console.log('[Booking] Booking submitted successfully');
      if (Platform.OS === 'ios') {
        const Haptics = await import('expo-haptics');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setSuccess(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to submit booking.';
      console.error('[Booking] Submit error:', msg);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [therapistId, message, contactMethod, preferredDate]);

  const preferredDateDisplay = preferredDate ? formatDate(preferredDate) : 'No date selected';
  const minDate = new Date();

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Stack.Screen options={{ title: 'Request Session', headerLargeTitle: false }} />
        <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <LogIn size={32} color={COLORS.primary} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold', marginBottom: 8, textAlign: 'center' }}>
          Sign in required
        </Text>
        <Text style={{ fontSize: 15, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
          You need to be signed in to request a session.
        </Text>
        <AnimatedPressable onPress={() => {
          console.log('[Booking] Sign in button pressed');
          router.push('/auth-screen');
        }}>
          <View style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>Sign In</Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Stack.Screen options={{ title: 'Request Session', headerLargeTitle: false }} />
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <CheckCircle size={40} color={COLORS.success} />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold', marginBottom: 8, textAlign: 'center' }}>
          Request Sent!
        </Text>
        <Text style={{ fontSize: 15, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 22 }}>
          Your session request has been submitted. You'll be redirected shortly.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen options={{ title: 'Request Session', headerLargeTitle: false }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header card */}
        {therapistName ? (
          <View style={{ marginHorizontal: 16, marginTop: 16, marginBottom: 4, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border }}>
            <Text style={{ fontSize: 13, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular', marginBottom: 2 }}>
              Requesting a session with
            </Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold' }}>
              {therapistName}
            </Text>
          </View>
        ) : null}

        {/* Preferred Date */}
        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textTertiary, fontFamily: 'DMSans_600SemiBold', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
            Preferred Date
          </Text>
          <TouchableOpacity
            onPress={() => {
              console.log('[Booking] Date picker opened');
              setShowDatePicker(true);
            }}
            activeOpacity={0.7}
          >
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 14,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <CalendarDays size={18} color={COLORS.primary} />
              <Text style={{ flex: 1, fontSize: 15, color: preferredDate ? COLORS.text : COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
                {preferredDateDisplay}
              </Text>
              {preferredDate ? (
                <TouchableOpacity
                  onPress={() => {
                    console.log('[Booking] Date cleared');
                    setPreferredDate(null);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ fontSize: 13, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </TouchableOpacity>
          <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular', marginTop: 6, marginLeft: 4 }}>
            Optional — leave blank if you're flexible
          </Text>
        </View>

        {/* iOS inline date picker */}
        {showDatePicker && Platform.OS === 'ios' ? (
          <View style={{ marginHorizontal: 16, marginTop: 8, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
            <DateTimePicker
              value={preferredDate ?? new Date()}
              mode="date"
              display="inline"
              minimumDate={minDate}
              onChange={handleDateChange}
              accentColor={COLORS.primary}
            />
            <TouchableOpacity
              onPress={() => setShowDatePicker(false)}
              style={{ padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' }}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Android date picker modal */}
        {showDatePicker && Platform.OS === 'android' ? (
          <DateTimePicker
            value={preferredDate ?? new Date()}
            mode="date"
            display="default"
            minimumDate={minDate}
            onChange={handleDateChange}
          />
        ) : null}

        {/* Message */}
        <View style={{ marginHorizontal: 16, marginTop: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textTertiary, fontFamily: 'DMSans_600SemiBold', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
            Message
          </Text>
          <TextInput
            value={message}
            onChangeText={(t) => {
              setMessage(t);
              if (error) setError(null);
            }}
            placeholder="Describe what you're looking for..."
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 14,
              padding: 16,
              fontSize: 15,
              color: COLORS.text,
              fontFamily: 'DMSans_400Regular',
              borderWidth: 1,
              borderColor: message ? COLORS.borderFocus : COLORS.border,
              minHeight: 120,
            }}
          />
          {error ? (
            <Text style={{ fontSize: 13, color: COLORS.danger, fontFamily: 'DMSans_400Regular', marginTop: 6, marginLeft: 4 }}>
              {error}
            </Text>
          ) : null}
        </View>

        {/* Contact Method */}
        <View style={{ marginHorizontal: 16, marginTop: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textTertiary, fontFamily: 'DMSans_600SemiBold', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
            Preferred Contact Method
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <ContactMethodButton
              label="Email"
              icon={<Mail size={16} color={contactMethod === 'email' ? '#fff' : COLORS.primary} />}
              active={contactMethod === 'email'}
              onPress={() => {
                console.log('[Booking] Contact method selected: email');
                setContactMethod('email');
              }}
            />
            <ContactMethodButton
              label="Phone"
              icon={<Phone size={16} color={contactMethod === 'phone' ? '#fff' : COLORS.primary} />}
              active={contactMethod === 'phone'}
              onPress={() => {
                console.log('[Booking] Contact method selected: phone');
                setContactMethod('phone');
              }}
            />
          </View>
        </View>

        {/* Submit */}
        <View style={{ marginHorizontal: 16, marginTop: 28 }}>
          <AnimatedPressable onPress={handleSubmit} disabled={submitting}>
            <View
              style={{
                backgroundColor: submitting ? COLORS.textTertiary : COLORS.primary,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                boxShadow: submitting ? undefined : '0 4px 16px rgba(45, 122, 95, 0.3)',
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: 'DMSans_700Bold' }}>
                  Send Request
                </Text>
              )}
            </View>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </View>
  );
}

function ContactMethodButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable onPress={onPress} scaleValue={0.96} style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 14,
          borderRadius: 14,
          backgroundColor: active ? COLORS.primary : COLORS.surface,
          borderWidth: 1,
          borderColor: active ? COLORS.primary : COLORS.border,
        }}
      >
        {icon}
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: active ? '#fff' : COLORS.primary,
            fontFamily: 'DMSans_600SemiBold',
          }}
        >
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}
