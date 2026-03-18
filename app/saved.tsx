import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Image } from 'expo-image';
import { Bookmark, MapPin, CheckCircle, LogIn, Trash2 } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import type { ImageSourcePropType } from 'react-native';
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
  success: '#34A853',
  border: 'rgba(45, 122, 95, 0.08)',
  danger: '#EF4444',
};

type SavedTherapist = {
  id: string;
  therapist_id: string;
  created_at: string;
  therapist: {
    id: string;
    name: string;
    title: string;
    photo_url: string;
    location: string;
    accepting_new_clients: boolean;
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

export default function SavedScreen() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<SavedTherapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchSaved = useCallback(async () => {
    console.log('[Saved] GET /api/saved');
    try {
      const data = await api.get<{ saved: SavedTherapist[] }>('/api/saved');
      console.log('[Saved] Fetched', data.saved.length, 'saved therapists');
      setSaved(data.saved);
    } catch (e) {
      console.error('[Saved] Fetch error:', e instanceof Error ? e.message : e);
    }
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    fetchSaved().finally(() => setLoading(false));
  }, [user, fetchSaved]);

  const handleRefresh = useCallback(async () => {
    console.log('[Saved] Pull-to-refresh');
    setRefreshing(true);
    await fetchSaved();
    setRefreshing(false);
  }, [fetchSaved]);

  const handleRemove = useCallback(async (item: SavedTherapist) => {
    console.log('[Saved] Remove pressed for therapist:', item.therapist_id, item.therapist.name);
    setRemovingId(item.id);
    try {
      await api.delete(`/api/saved/${item.therapist_id}`);
      console.log('[Saved] Removed saved therapist:', item.therapist_id);
      setSaved((prev) => prev.filter((s) => s.id !== item.id));
      if (Platform.OS === 'ios') {
        const Haptics = await import('expo-haptics');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      console.error('[Saved] Remove error:', e instanceof Error ? e.message : e);
    } finally {
      setRemovingId(null);
    }
  }, []);

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Stack.Screen options={{ title: 'Saved Therapists', headerLargeTitle: false }} />
        <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <LogIn size={32} color={COLORS.primary} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold', marginBottom: 8, textAlign: 'center' }}>
          Sign in required
        </Text>
        <Text style={{ fontSize: 15, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
          Sign in to view and manage your saved therapists.
        </Text>
        <AnimatedPressable onPress={() => {
          console.log('[Saved] Sign in button pressed');
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
        <Stack.Screen options={{ title: 'Saved Therapists', headerLargeTitle: false }} />
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen options={{ title: 'Saved Therapists', headerLargeTitle: false }} />
      <FlatList
        data={saved}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={<DisclaimerBanner />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
            <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Bookmark size={32} color={COLORS.primary} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', marginBottom: 8, textAlign: 'center' }}>
              No saved therapists yet
            </Text>
            <Text style={{ fontSize: 15, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 22 }}>
              Browse the directory and tap the bookmark icon to save providers.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const initials = getInitials(item.therapist.name);
          const isRemoving = removingId === item.id;
          const acceptingText = item.therapist.accepting_new_clients ? 'Accepting clients' : 'Not accepting';
          return (
            <AnimatedPressable
              onPress={() => {
                console.log('[Saved] Therapist card pressed:', item.therapist_id, item.therapist.name);
                router.push(`/therapist/${item.therapist_id}`);
              }}
              scaleValue={0.98}
            >
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
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                {/* Avatar */}
                <View style={{ position: 'relative', flexShrink: 0 }}>
                  {item.therapist.photo_url ? (
                    <Image
                      source={resolveImageSource(item.therapist.photo_url)}
                      style={{ width: 52, height: 52, borderRadius: 26 }}
                      contentFit="cover"
                      accessibilityLabel={`Photo of ${item.therapist.name}`}
                    />
                  ) : (
                    <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.primary, fontFamily: 'DMSans_700Bold' }}>
                        {initials}
                      </Text>
                    </View>
                  )}
                  {item.therapist.accepting_new_clients ? (
                    <View style={{ position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: 7, backgroundColor: COLORS.success, borderWidth: 2, borderColor: COLORS.surface }} />
                  ) : null}
                </View>

                {/* Info */}
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }} numberOfLines={1}>
                    {item.therapist.name}
                  </Text>
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }} numberOfLines={1}>
                    {item.therapist.title}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MapPin size={11} color={COLORS.textTertiary} />
                    <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }} numberOfLines={1}>
                      {item.therapist.location}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <CheckCircle size={11} color={item.therapist.accepting_new_clients ? COLORS.success : COLORS.textTertiary} />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: item.therapist.accepting_new_clients ? COLORS.success : COLORS.textTertiary, fontFamily: 'DMSans_600SemiBold' }}>
                      {acceptingText}
                    </Text>
                  </View>
                </View>

                {/* Remove button */}
                <TouchableOpacity
                  onPress={() => handleRemove(item)}
                  disabled={isRemoving}
                  style={{ padding: 8, opacity: isRemoving ? 0.4 : 1 }}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  accessibilityLabel="Remove from saved"
                >
                  {isRemoving ? (
                    <ActivityIndicator size="small" color={COLORS.danger} />
                  ) : (
                    <Trash2 size={18} color={COLORS.danger} />
                  )}
                </TouchableOpacity>
              </View>
            </AnimatedPressable>
          );
        }}
      />
    </View>
  );
}
