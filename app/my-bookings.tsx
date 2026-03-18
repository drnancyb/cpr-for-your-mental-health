import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Image } from 'expo-image';
import { CalendarDays, Clock, CheckCircle, XCircle, LogIn, CalendarX, Bell } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import type { ImageSourcePropType } from 'react-native';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { useNotifications } from '@/contexts/NotificationContext';

const COLORS = {
  background: '#F4F7F5',
  surface: '#FFFFFF',
  surfaceSecondary: '#EDF2EF',
  text: '#1A2E25',
  textSecondary: '#5C7A6A',
  textTertiary: '#9BB5A8',
  primary: '#2D7A5F',
  primaryMuted: '#E8F4EF',
  success: '#34A853',
  warning: '#F59E0B',
  danger: '#EF4444',
  border: 'rgba(45, 122, 95, 0.08)',
};

type Booking = {
  id: string;
  therapist_id: string;
  user_id: string;
  preferred_date?: string;
  message: string;
  contact_method: 'email' | 'phone';
  status: 'pending' | 'confirmed' | 'declined';
  admin_notes?: string;
  created_at: string;
  therapist: {
    id: string;
    name: string;
    title: string;
    photo_url: string;
  };
};

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function StatusBadge({ status }: { status: Booking['status'] }) {
  const config = {
    pending: { color: COLORS.warning, bg: '#FEF3C7', icon: <Clock size={12} color={COLORS.warning} />, label: 'Pending' },
    confirmed: { color: COLORS.success, bg: '#D1FAE5', icon: <CheckCircle size={12} color={COLORS.success} />, label: 'Confirmed' },
    declined: { color: COLORS.danger, bg: '#FEE2E2', icon: <XCircle size={12} color={COLORS.danger} />, label: 'Declined' },
  }[status];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: config.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
      {config.icon}
      <Text style={{ fontSize: 12, fontWeight: '600', color: config.color, fontFamily: 'DMSans_600SemiBold' }}>
        {config.label}
      </Text>
    </View>
  );
}

export default function MyBookingsScreen() {
  const { user } = useAuth();
  const { hasPermission, requestPermission } = useNotifications();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleBellPress = useCallback(async () => {
    console.log('[MyBookings] Bell icon pressed, hasPermission:', hasPermission);
    if (!hasPermission) {
      console.log('[MyBookings] Requesting notification permission');
      await requestPermission();
    } else {
      console.log('[MyBookings] Navigating to notification preferences');
      router.push('/notification-preferences');
    }
  }, [hasPermission, requestPermission]);

  const fetchBookings = useCallback(async () => {
    console.log('[MyBookings] GET /api/bookings');
    try {
      const data = await api.get<{ bookings: Booking[] }>('/api/bookings');
      console.log('[MyBookings] Fetched', data.bookings.length, 'bookings');
      setBookings(data.bookings);
    } catch (e) {
      console.error('[MyBookings] Fetch error:', e instanceof Error ? e.message : e);
    }
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    fetchBookings().finally(() => setLoading(false));
  }, [user, fetchBookings]);

  const handleRefresh = useCallback(async () => {
    console.log('[MyBookings] Pull-to-refresh');
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  }, [fetchBookings]);

  const bellButton = (
    <TouchableOpacity onPress={handleBellPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Bell size={22} color={hasPermission ? COLORS.primary : COLORS.textTertiary} />
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Stack.Screen options={{ title: 'My Bookings', headerLargeTitle: false, headerRight: () => bellButton }} />
        <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <LogIn size={32} color={COLORS.primary} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold', marginBottom: 8, textAlign: 'center' }}>
          Sign in required
        </Text>
        <Text style={{ fontSize: 15, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
          Sign in to view your booking requests.
        </Text>
        <AnimatedPressable onPress={() => {
          console.log('[MyBookings] Sign in button pressed');
          router.push('/auth-screen');
        }}>
          <View style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>Sign In</Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: 'My Bookings', headerLargeTitle: false, headerRight: () => bellButton }} />
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen options={{ title: 'My Bookings', headerLargeTitle: false, headerRight: () => bellButton }} />
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={<DisclaimerBanner />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
            <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <CalendarX size={32} color={COLORS.primary} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', marginBottom: 8, textAlign: 'center' }}>
              No booking requests yet
            </Text>
            <Text style={{ fontSize: 15, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 22 }}>
              Find a therapist and tap "Request Session" to get started.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const initials = getInitials(item.therapist.name);
          const dateDisplay = item.preferred_date
            ? new Date(item.preferred_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : null;
          const createdDisplay = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const messagePreview = item.message.length > 80 ? item.message.slice(0, 80) + '…' : item.message;

          return (
            <View
              style={{
                backgroundColor: COLORS.surface,
                marginHorizontal: 16,
                marginBottom: 10,
                borderRadius: 16,
                borderCurve: 'continuous',
                padding: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              {/* Top row: avatar + name + status */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                {item.therapist.photo_url ? (
                  <Image
                    source={resolveImageSource(item.therapist.photo_url)}
                    style={{ width: 44, height: 44, borderRadius: 22, flexShrink: 0 }}
                    contentFit="cover"
                    accessibilityLabel={`Photo of ${item.therapist.name}`}
                  />
                ) : (
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.primary, fontFamily: 'DMSans_700Bold' }}>
                      {initials}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }} numberOfLines={1}>
                    {item.therapist.name}
                  </Text>
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }} numberOfLines={1}>
                    {item.therapist.title}
                  </Text>
                </View>
                <StatusBadge status={item.status} />
              </View>

              {/* Date row */}
              {dateDisplay ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <CalendarDays size={13} color={COLORS.primary} />
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
                    {dateDisplay}
                  </Text>
                </View>
              ) : null}

              {/* Message preview */}
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', lineHeight: 19 }}>
                {messagePreview}
              </Text>

              {/* Admin notes */}
              {item.admin_notes ? (
                <View style={{ marginTop: 10, backgroundColor: COLORS.surfaceSecondary, borderRadius: 10, padding: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textTertiary, fontFamily: 'DMSans_600SemiBold', marginBottom: 3 }}>
                    Note from therapist
                  </Text>
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', lineHeight: 18 }}>
                    {item.admin_notes}
                  </Text>
                </View>
              ) : null}

              {/* Footer */}
              <Text style={{ fontSize: 11, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular', marginTop: 10 }}>
                {createdDisplay}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}
