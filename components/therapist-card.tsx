import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { Image } from 'expo-image';
import { MapPin, ChevronRight, DollarSign, Clock } from 'lucide-react-native';
import { router } from 'expo-router';
import { AnimatedPressable } from './AnimatedPressable';
import type { ImageSourcePropType } from 'react-native';

const COLORS = {
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
  divider: 'rgba(45, 122, 95, 0.05)',
};

export interface Therapist {
  id: string;
  name: string;
  photo_url: string;
  title: string;
  bio: string;
  location: string;
  gender: string;
  specialties: string[];
  therapy_types: string[];
  insurances: string[];
  accepting_new_clients: boolean;
  session_fee: number;
  languages: string[];
  years_experience: number;
  phone: string;
  email: string;
  website_url?: string;
  created_at: string;
  is_pinned?: boolean;
}

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

interface TherapistCardProps {
  therapist: Therapist;
  index: number;
}

export function TherapistCard({ therapist, index }: TherapistCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  const displayedSpecialties = therapist.specialties.slice(0, 3);
  const feeDisplay = `$${Number(therapist.session_fee).toFixed(0)} / session`;
  const expDisplay = `${therapist.years_experience} yrs`;
  const initials = getInitials(therapist.name);
  const isPinned = therapist.is_pinned === true;

  const handlePress = () => {
    console.log('[TherapistCard] Pressed therapist card:', therapist.id, therapist.name);
    router.push(`/therapist/${therapist.id}`);
  };

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <AnimatedPressable onPress={handlePress} scaleValue={0.98}>
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            marginHorizontal: 16,
            marginBottom: 12,
            borderWidth: isPinned ? 1.5 : 1,
            borderColor: isPinned ? '#F59E0B' : COLORS.border,
            borderCurve: 'continuous',
            boxShadow: isPinned
              ? '0 1px 3px rgba(245,158,11,0.10), 0 4px 12px rgba(245,158,11,0.08)'
              : '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
          }}
        >
          {/* Pinned "Featured" badge */}
          {isPinned ? (
            <View
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                backgroundColor: '#F59E0B',
                borderRadius: 20,
                paddingHorizontal: 8,
                paddingVertical: 2,
                zIndex: 1,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: '#FFFFFF',
                  fontFamily: 'DMSans_700Bold',
                  letterSpacing: 0.3,
                }}
              >
                Featured
              </Text>
            </View>
          ) : null}

          {/* Top row: photo + info */}
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: isPinned ? 22 : 0 }}>
            {/* Photo with accepting badge */}
            <View style={{ position: 'relative' }}>
              {therapist.photo_url ? (
                <Image
                  source={resolveImageSource(therapist.photo_url)}
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                  contentFit="cover"
                  accessibilityLabel={`Photo of ${therapist.name}`}
                />
              ) : (
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: COLORS.primaryMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '700',
                      color: COLORS.primary,
                      fontFamily: 'DMSans_700Bold',
                    }}
                  >
                    {initials}
                  </Text>
                </View>
              )}
              {therapist.accepting_new_clients ? (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 1,
                    right: 1,
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: COLORS.success,
                    borderWidth: 2,
                    borderColor: COLORS.surface,
                  }}
                />
              ) : null}
            </View>

            {/* Name, title, location */}
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: '600',
                    color: COLORS.text,
                    fontFamily: 'DMSans_600SemiBold',
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {therapist.name}
                </Text>
                <ChevronRight size={16} color={COLORS.textTertiary} />
              </View>
              <Text
                style={{
                  fontSize: 13,
                  color: COLORS.textSecondary,
                  fontFamily: 'DMSans_400Regular',
                }}
                numberOfLines={1}
              >
                {therapist.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <MapPin size={12} color={COLORS.textTertiary} />
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.textTertiary,
                    fontFamily: 'DMSans_400Regular',
                  }}
                  numberOfLines={1}
                >
                  {therapist.location}
                </Text>
              </View>
            </View>
          </View>

          {/* Specialty tags */}
          {displayedSpecialties.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {displayedSpecialties.map((specialty) => (
                <View
                  key={specialty}
                  style={{
                    backgroundColor: COLORS.primaryMuted,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: COLORS.primary,
                      fontFamily: 'DMSans_600SemiBold',
                    }}
                  >
                    {specialty}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Bottom row: fee + experience */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: COLORS.divider,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <DollarSign size={13} color={COLORS.primary} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: COLORS.primary,
                  fontFamily: 'DMSans_600SemiBold',
                }}
              >
                {feeDisplay}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Clock size={13} color={COLORS.textTertiary} />
              <Text
                style={{
                  fontSize: 13,
                  color: COLORS.textSecondary,
                  fontFamily: 'DMSans_400Regular',
                }}
              >
                {expDisplay}
              </Text>
            </View>
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}
