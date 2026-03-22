import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Linking,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  DollarSign,
  Languages,
  Clock,
  CheckCircle,
  Bookmark,
  BookmarkCheck,
  CalendarPlus,
} from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import type { Therapist } from '@/components/therapist-card';
import type { ImageSourcePropType } from 'react-native';
import { DisclaimerBanner } from '@/components/disclaimer-banner';

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
  warning: '#F59E0B',
  danger: '#EF4444',
  border: 'rgba(45, 122, 95, 0.08)',
  divider: 'rgba(45, 122, 95, 0.05)',
};

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textTertiary,
        fontFamily: 'DMSans_600SemiBold',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 10,
      }}
    >
      {title}
    </Text>
  );
}

function TagChip({ label }: { label: string }) {
  return (
    <View
      style={{
        backgroundColor: COLORS.primaryMuted,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: COLORS.primary,
          fontFamily: 'DMSans_600SemiBold',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function StatColumn({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 6,
        paddingVertical: 16,
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {icon}
      <Text
        style={{
          fontSize: 16,
          fontWeight: '700',
          color: COLORS.text,
          fontFamily: 'DMSans_700Bold',
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 11,
          color: COLORS.textTertiary,
          fontFamily: 'DMSans_400Regular',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

type SavedTherapist = {
  id: string;
  therapist_id: string;
  created_at: string;
};

export default function TherapistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    console.log('[TherapistDetail] Fetching therapist:', id);
    const therapistFetch = fetch(`${BASE_URL}/api/therapists/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
        }
        return res.json() as Promise<Therapist>;
      });

    const savedFetch = user
      ? api.get<{ saved: SavedTherapist[] }>('/api/saved').catch(() => ({ saved: [] }))
      : Promise.resolve({ saved: [] });

    Promise.all([therapistFetch, savedFetch])
      .then(([therapistData, savedData]) => {
        console.log('[TherapistDetail] Loaded therapist:', therapistData.name);
        setTherapist(therapistData);
        const match = savedData.saved.find((s) => s.therapist_id === id);
        setSavedId(match ? match.id : null);
        console.log('[TherapistDetail] Saved state:', match ? 'saved' : 'not saved');
        // Fire-and-forget analytics event
        api.post('/api/analytics/events', { event_type: 'profile_view', therapist_id: therapistData.id }).catch(() => {});
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[TherapistDetail] Fetch error:', msg);
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [id, user]);

  const handleBookmark = useCallback(async () => {
    if (!id || bookmarkLoading) return;
    if (savedId) {
      console.log('[TherapistDetail] Unsave therapist, savedId:', savedId);
      setBookmarkLoading(true);
      try {
        await api.delete(`/api/saved/${savedId}`);
        setSavedId(null);
        console.log('[TherapistDetail] Therapist unsaved');
        if (Platform.OS === 'ios') {
          const Haptics = await import('expo-haptics');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch (e) {
        console.error('[TherapistDetail] Unsave error:', e instanceof Error ? e.message : e);
      } finally {
        setBookmarkLoading(false);
      }
    } else {
      console.log('[TherapistDetail] Save therapist:', id);
      setBookmarkLoading(true);
      try {
        const result = await api.post<SavedTherapist>('/api/saved', { therapist_id: id });
        setSavedId(result.id);
        console.log('[TherapistDetail] Therapist saved, savedId:', result.id);
        if (Platform.OS === 'ios') {
          const Haptics = await import('expo-haptics');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } catch (e) {
        console.error('[TherapistDetail] Save error:', e instanceof Error ? e.message : e);
      } finally {
        setBookmarkLoading(false);
      }
    }
  }, [id, savedId, bookmarkLoading]);

  const handleRequestSession = useCallback(() => {
    console.log('[TherapistDetail] Request Session pressed for therapist:', id);
    router.push(`/booking/${id}`);
  }, [id]);

  const handleCall = () => {
    if (!therapist?.phone) return;
    console.log('[TherapistDetail] Call button pressed:', therapist.phone);
    Linking.openURL(`tel:${therapist.phone}`);
  };

  const handleEmail = () => {
    if (!therapist?.email) return;
    console.log('[TherapistDetail] Email button pressed:', therapist.email);
    Linking.openURL(`mailto:${therapist.email}`);
  };

  const handleWebsite = () => {
    if (!therapist?.websiteUrl) return;
    console.log('[TherapistDetail] Website button pressed:', therapist.websiteUrl);
    Linking.openURL(therapist.websiteUrl);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: '' }} />
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (error || !therapist) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Stack.Screen options={{ title: '' }} />
        <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', marginBottom: 8, textAlign: 'center' }}>
          Couldn't load therapist
        </Text>
        <Text style={{ fontSize: 15, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 22 }}>
          Check your connection and try again.
        </Text>
      </View>
    );
  }

  const initials = getInitials(therapist.name ?? '');
  const feeDisplay = therapist.sessionFee != null ? `$${Number(therapist.sessionFee).toFixed(0)}` : 'N/A';
  const expDisplay = therapist.yearsExperience != null ? `${therapist.yearsExperience} yrs` : 'N/A';
  const languages = Array.isArray(therapist.languages) ? therapist.languages : [];
  const specialties = Array.isArray(therapist.specialties) ? therapist.specialties : [];
  const therapyTypes = Array.isArray(therapist.therapyTypes) ? therapist.therapyTypes : [];
  const insurances = Array.isArray(therapist.insurances) ? therapist.insurances : [];
  const langDisplay = `${languages.length}`;
  const acceptingText = therapist.acceptingNewClients ? 'Accepting new clients' : 'Not accepting clients';
  const hasSlidingScale = therapist.slidingScale === true;
  const minFeeDisplay = therapist.slidingScaleMinFee != null ? `From $${Number(therapist.slidingScaleMinFee).toFixed(0)}/session` : null;

  const bookmarkIcon = savedId
    ? <BookmarkCheck size={22} color={COLORS.primary} />
    : <Bookmark size={22} color={COLORS.primary} />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: true,
          headerBackButtonDisplayMode: 'minimal',
          headerRight: user ? () => (
            <TouchableOpacity
              onPress={handleBookmark}
              disabled={bookmarkLoading}
              style={{ padding: 8, opacity: bookmarkLoading ? 0.5 : 1 }}
              accessibilityLabel={savedId ? 'Remove from saved' : 'Save therapist'}
            >
              {bookmarkIcon}
            </TouchableOpacity>
          ) : undefined,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* Hero section */}
        <View
          style={{
            alignItems: 'center',
            paddingTop: 100,
            paddingBottom: 28,
            paddingHorizontal: 24,
            backgroundColor: COLORS.surface,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
          }}
        >
          {/* Photo */}
          <View style={{ marginBottom: 16 }}>
            {therapist.photoUrl ? (
              <Image
                source={resolveImageSource(therapist.photoUrl)}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  borderWidth: 3,
                  borderColor: COLORS.primaryMuted,
                }}
                contentFit="cover"
                accessibilityLabel={`Photo of ${therapist.name}`}
              />
            ) : (
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: COLORS.primaryMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 3,
                  borderColor: COLORS.primaryMuted,
                }}
              >
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: '700',
                    color: COLORS.primary,
                    fontFamily: 'DMSans_700Bold',
                  }}
                >
                  {initials}
                </Text>
              </View>
            )}
          </View>

          {/* Name */}
          <Text
            style={{
              fontSize: 24,
              fontWeight: '700',
              color: COLORS.text,
              fontFamily: 'DMSans_700Bold',
              textAlign: 'center',
              marginBottom: 4,
            }}
          >
            {therapist.name}
          </Text>

          {/* Title */}
          <Text
            style={{
              fontSize: 15,
              color: COLORS.textSecondary,
              fontFamily: 'DMSans_400Regular',
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            {therapist.title}
          </Text>

          {/* Location */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 }}>
            <MapPin size={14} color={COLORS.textTertiary} />
            <Text
              style={{
                fontSize: 14,
                color: COLORS.textTertiary,
                fontFamily: 'DMSans_400Regular',
              }}
            >
              {therapist.location}
            </Text>
          </View>

          {/* Accepting badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: therapist.acceptingNewClients ? '#E8F5E9' : COLORS.surfaceSecondary,
              }}
            >
              <CheckCircle
                size={14}
                color={therapist.acceptingNewClients ? COLORS.success : COLORS.textTertiary}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: therapist.acceptingNewClients ? COLORS.success : COLORS.textTertiary,
                  fontFamily: 'DMSans_600SemiBold',
                }}
              >
                {acceptingText}
              </Text>
            </View>
            {hasSlidingScale ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: '#E8F5E9',
                }}
              >
                <DollarSign size={14} color={COLORS.success} />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: COLORS.success,
                    fontFamily: 'DMSans_600SemiBold',
                  }}
                >
                  Sliding Scale
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Quick stats */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatColumn
              icon={<DollarSign size={20} color={COLORS.primary} />}
              value={feeDisplay}
              label={minFeeDisplay ?? 'Per session'}
            />
            <StatColumn
              icon={<Clock size={20} color={COLORS.primary} />}
              value={expDisplay}
              label="Experience"
            />
            <StatColumn
              icon={<Languages size={20} color={COLORS.primary} />}
              value={langDisplay}
              label={langDisplay === '1' ? 'Language' : 'Languages'}
            />
          </View>
        </View>

        {/* About */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 20,
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <SectionTitle title="About" />
          <Text
            style={{
              fontSize: 15,
              color: COLORS.textSecondary,
              fontFamily: 'DMSans_400Regular',
              lineHeight: 22,
            }}
            selectable
          >
            {therapist.bio}
          </Text>
        </View>

        {/* Specialties */}
        {specialties.length > 0 ? (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <SectionTitle title="Specialties" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {specialties.map((s) => (
                <TagChip key={s} label={s} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Therapy Types */}
        {therapyTypes.length > 0 ? (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <SectionTitle title="Therapy Types" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {therapyTypes.map((t) => (
                <TagChip key={t} label={t} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Insurance */}
        {insurances.length > 0 ? (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <SectionTitle title="Insurance Accepted" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {insurances.map((ins) => (
                <View
                  key={ins}
                  style={{
                    backgroundColor: COLORS.surfaceSecondary,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '500',
                      color: COLORS.textSecondary,
                      fontFamily: 'DMSans_500Medium',
                    }}
                  >
                    {ins}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Languages */}
        {languages.length > 0 ? (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <SectionTitle title="Languages" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {languages.map((lang) => (
                <View
                  key={lang}
                  style={{
                    backgroundColor: COLORS.surfaceSecondary,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '500',
                      color: COLORS.textSecondary,
                      fontFamily: 'DMSans_500Medium',
                    }}
                  >
                    {lang}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Request Session CTA */}
        {therapist.acceptingNewClients ? (
          <View style={{ marginHorizontal: 16, marginTop: 20 }}>
            <AnimatedPressable onPress={handleRequestSession}>
              <View
                style={{
                  backgroundColor: COLORS.primary,
                  borderRadius: 14,
                  paddingVertical: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  boxShadow: '0 4px 16px rgba(45, 122, 95, 0.3)',
                }}
              >
                <CalendarPlus size={18} color="#FFFFFF" />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: '#FFFFFF',
                    fontFamily: 'DMSans_700Bold',
                  }}
                >
                  Request Session
                </Text>
              </View>
            </AnimatedPressable>
          </View>
        ) : null}

        {/* Contact */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 20,
            gap: 10,
          }}
        >
          <SectionTitle title="Contact" />

          {/* Call */}
          <AnimatedPressable onPress={handleCall}>
            <View
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 14,
                paddingVertical: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 4px 16px rgba(45, 122, 95, 0.3)',
              }}
            >
              <Phone size={18} color="#FFFFFF" />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#FFFFFF',
                  fontFamily: 'DMSans_700Bold',
                }}
              >
                Call
              </Text>
            </View>
          </AnimatedPressable>

          {/* Email */}
          <AnimatedPressable onPress={handleEmail}>
            <View
              style={{
                backgroundColor: COLORS.primaryMuted,
                borderRadius: 14,
                paddingVertical: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                borderWidth: 1,
                borderColor: 'rgba(45, 122, 95, 0.15)',
              }}
            >
              <Mail size={18} color={COLORS.primary} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: COLORS.primary,
                  fontFamily: 'DMSans_600SemiBold',
                }}
              >
                Send email
              </Text>
            </View>
          </AnimatedPressable>

          {/* Website — only if exists */}
          {therapist.websiteUrl ? (
            <AnimatedPressable onPress={handleWebsite}>
              <View
                style={{
                  borderRadius: 14,
                  paddingVertical: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Globe size={18} color={COLORS.textSecondary} />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: COLORS.textSecondary,
                    fontFamily: 'DMSans_600SemiBold',
                  }}
                >
                  Visit website
                </Text>
              </View>
            </AnimatedPressable>
          ) : null}
        </View>

        {/* Disclaimer */}
        <DisclaimerBanner />
      </ScrollView>
    </View>
  );
}
