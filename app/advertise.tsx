import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Zap, CheckCircle, Square, CheckSquare, Star, TrendingUp, Users, Tag } from 'lucide-react-native';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import * as Haptics from 'expo-haptics';

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
  border: 'rgba(45, 122, 95, 0.08)',
  gold: '#F59E0B',
  goldMuted: 'rgba(251, 191, 36, 0.12)',
  amber: '#D97706',
  amberMuted: '#FEF3C7',
};

const BENEFITS = [
  {
    icon: Star,
    title: 'Featured Placement',
    description: 'Appear at the top of search results in the directory of providers',
    color: '#F59E0B',
    bg: '#FFFBEB',
  },
  {
    icon: TrendingUp,
    title: 'More Visibility',
    description: 'Help more clients actively seeking mental health support find you',
    color: '#2D7A5F',
    bg: '#E8F4EF',
  },
  {
    icon: Users,
    title: 'Highlighted Profile',
    description: 'Your card stands out with a featured badge in the directory',
    color: '#6366F1',
    bg: '#EEF2FF',
  },
];

const PROVIDER_TERMS = [
  'This platform functions solely as an advertising platform and directory service.',
  'Any fees paid are advertising and listing fees for visibility and placement only.',
  'Fees are not based on client inquiries, bookings, or outcomes.',
  'No guarantee of client inquiries or conversions is provided.',
  'You are responsible for maintaining appropriate licensure and practicing within your professional scope and ethical guidelines.',
];

const FREE_FEATURES = [
  'Basic profile in the directory of providers',
  'Listed in search results',
  'Standard visibility',
];

const FEATURED_FEATURES = [
  'Appears at top of search results',
  'Highlighted profile card',
  '"Accepting New Clients" badge',
  'More visibility to active searchers',
];

const PREMIUM_FEATURES = [
  'Priority placement in search',
  'Expanded profile (bio, photo, specialties)',
  'Multiple locations',
  'Direct contact buttons',
];

export default function AdvertiseScreen() {
  const [termsAgreed, setTermsAgreed] = useState(false);

  const handleToggleTerms = () => {
    console.log('[Advertise] Terms checkbox toggled — new value:', !termsAgreed);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTermsAgreed((prev) => !prev);
  };

  const handleGetFeatured = () => {
    console.log('[Advertise] Get Featured button pressed — navigating to paywall');
    router.push('/paywall');
  };

  const handleGetListedFree = () => {
    console.log('[Advertise] Get Listed Free button pressed — navigating to apply');
    router.push('/apply');
  };

  const handleNotifyMe = () => {
    console.log('[Advertise] Notify Me button pressed (Premium — coming soon, disabled)');
  };

  const featuredButtonOpacity = termsAgreed ? 1 : 0.4;
  const featuredButtonShadow = termsAgreed ? '0 4px 20px rgba(45, 122, 95, 0.35)' : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen options={{ title: 'Advertise Your Practice', headerLargeTitle: false }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* Hero */}
        <View
          style={{
            backgroundColor: COLORS.primary,
            paddingTop: 40,
            paddingBottom: 36,
            paddingHorizontal: 24,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
            }}
          >
            <Text style={{ fontSize: 36 }}>⭐</Text>
          </View>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '700',
              color: '#FFFFFF',
              fontFamily: 'DMSans_700Bold',
              textAlign: 'center',
              marginBottom: 10,
              letterSpacing: -0.3,
            }}
          >
            Get more visibility.
          </Text>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '700',
              color: 'rgba(255,255,255,0.85)',
              fontFamily: 'DMSans_700Bold',
              textAlign: 'center',
              marginBottom: 14,
              letterSpacing: -0.3,
            }}
          >
            Stand out in the directory.
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: 'rgba(255,255,255,0.75)',
              fontFamily: 'DMSans_400Regular',
              textAlign: 'center',
              lineHeight: 22,
              maxWidth: 280,
            }}
          >
            Advertising and listing fees give your practice better visibility and placement in our directory of providers.
          </Text>
        </View>

        {/* Founding Member Banner */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          <View
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 18,
              borderCurve: 'continuous',
              padding: 20,
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(45, 122, 95, 0.3)',
            }}
          >
            {/* Decorative circle */}
            <View
              style={{
                position: 'absolute',
                top: -30,
                right: -30,
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: 'rgba(255,255,255,0.07)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: -20,
                left: -20,
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Zap size={18} color="#FFFFFF" fill="#FFFFFF" />
              </View>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '700',
                  color: '#FFFFFF',
                  fontFamily: 'DMSans_700Bold',
                  letterSpacing: -0.2,
                }}
              >
                Founding Member Offer
              </Text>
            </View>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                color: '#FFFFFF',
                fontFamily: 'DMSans_700Bold',
                letterSpacing: -0.3,
                marginBottom: 6,
              }}
            >
              Free for 3 months
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.8)',
                fontFamily: 'DMSans_400Regular',
                lineHeight: 20,
                marginBottom: 12,
              }}
            >
              Lock in early access before we open to the public. Limited spots available.
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
                alignSelf: 'flex-start',
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#4ade80',
                }}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.9)',
                  fontFamily: 'DMSans_600SemiBold',
                }}
              >
                Join now before spots fill up
              </Text>
            </View>
          </View>
        </View>

        {/* Benefits */}
        <View style={{ paddingHorizontal: 16, paddingTop: 28, gap: 12 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: COLORS.textTertiary,
              fontFamily: 'DMSans_700Bold',
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              marginBottom: 4,
            }}
          >
            What you get
          </Text>
          {BENEFITS.map((benefit) => {
            const IconComponent = benefit.icon;
            return (
              <View
                key={benefit.title}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 16,
                  borderCurve: 'continuous',
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: benefit.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconComponent size={22} color={benefit.color} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: COLORS.text,
                      fontFamily: 'DMSans_600SemiBold',
                    }}
                  >
                    {benefit.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: COLORS.textSecondary,
                      fontFamily: 'DMSans_400Regular',
                      lineHeight: 18,
                    }}
                  >
                    {benefit.description}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Pricing Tiers */}
        <View style={{ paddingHorizontal: 16, paddingTop: 28, gap: 14 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: COLORS.textTertiary,
              fontFamily: 'DMSans_700Bold',
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              marginBottom: 4,
            }}
          >
            Choose a plan
          </Text>

          {/* Tier 1 — Free */}
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 20,
              borderWidth: 1,
              borderColor: COLORS.border,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: '700',
                color: COLORS.text,
                fontFamily: 'DMSans_700Bold',
                marginBottom: 4,
              }}
            >
              Free Listing
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 4 }}>
              <Text
                style={{
                  fontSize: 30,
                  fontWeight: '700',
                  color: COLORS.text,
                  fontFamily: 'DMSans_700Bold',
                  letterSpacing: -0.5,
                }}
              >
                $0
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: COLORS.textSecondary,
                  fontFamily: 'DMSans_400Regular',
                }}
              >
                / month
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: COLORS.textTertiary,
                fontFamily: 'DMSans_400Regular',
                marginBottom: 16,
              }}
            >
              No credit card required
            </Text>
            <View style={{ gap: 8, marginBottom: 18 }}>
              {FREE_FEATURES.map((feature) => (
                <View key={feature} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={15} color={COLORS.textTertiary} />
                  <Text
                    style={{
                      fontSize: 13,
                      color: COLORS.textSecondary,
                      fontFamily: 'DMSans_400Regular',
                      flex: 1,
                    }}
                  >
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              onPress={handleGetListedFree}
              activeOpacity={0.8}
              style={{
                borderWidth: 1.5,
                borderColor: COLORS.primary,
                borderRadius: 12,
                borderCurve: 'continuous',
                paddingVertical: 13,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: COLORS.primary,
                  fontFamily: 'DMSans_600SemiBold',
                }}
              >
                Get Listed Free
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tier 2 — Featured (elevated) */}
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 18,
              borderCurve: 'continuous',
              padding: 22,
              borderWidth: 2,
              borderColor: COLORS.accent,
              boxShadow: '0 6px 24px rgba(45, 122, 95, 0.18)',
              marginHorizontal: -2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: COLORS.text,
                  fontFamily: 'DMSans_700Bold',
                }}
              >
                Featured Listing
              </Text>
              <View
                style={{
                  backgroundColor: COLORS.accent,
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: '#FFFFFF',
                    fontFamily: 'DMSans_700Bold',
                    letterSpacing: 0.2,
                  }}
                >
                  Most Popular
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 4 }}>
              <Text
                style={{
                  fontSize: 30,
                  fontWeight: '700',
                  color: COLORS.primary,
                  fontFamily: 'DMSans_700Bold',
                  letterSpacing: -0.5,
                }}
              >
                $29.99
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: COLORS.textSecondary,
                  fontFamily: 'DMSans_400Regular',
                }}
              >
                / month
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 }}>
              <Tag size={12} color={COLORS.gold} />
              <Text
                style={{
                  fontSize: 11,
                  color: COLORS.gold,
                  fontFamily: 'DMSans_400Regular',
                  fontStyle: 'italic',
                }}
              >
                Introductory offer — valid through June 30, 2026
              </Text>
            </View>
            <View style={{ gap: 8, marginBottom: 18 }}>
              {FEATURED_FEATURES.map((feature) => (
                <View key={feature} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={15} color={COLORS.accent} />
                  <Text
                    style={{
                      fontSize: 13,
                      color: COLORS.text,
                      fontFamily: 'DMSans_400Regular',
                      flex: 1,
                    }}
                  >
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              onPress={termsAgreed ? handleGetFeatured : undefined}
              activeOpacity={termsAgreed ? 0.85 : 1}
              style={{
                backgroundColor: COLORS.accent,
                borderRadius: 12,
                borderCurve: 'continuous',
                paddingVertical: 15,
                alignItems: 'center',
                boxShadow: featuredButtonShadow,
                opacity: featuredButtonOpacity,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#FFFFFF',
                  fontFamily: 'DMSans_700Bold',
                  letterSpacing: -0.2,
                }}
              >
                Get Featured
              </Text>
            </TouchableOpacity>
            {!termsAgreed && (
              <Text
                style={{
                  fontSize: 11,
                  color: COLORS.textTertiary,
                  fontFamily: 'DMSans_400Regular',
                  textAlign: 'center',
                  marginTop: 8,
                }}
              >
                Agree to terms below to continue
              </Text>
            )}
          </View>

          {/* Tier 3 — Premium (coming soon) */}
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 20,
              borderWidth: 1,
              borderColor: 'rgba(217, 119, 6, 0.2)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              opacity: 0.85,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '700',
                  color: COLORS.text,
                  fontFamily: 'DMSans_700Bold',
                }}
              >
                Premium Listing
              </Text>
              <View
                style={{
                  backgroundColor: COLORS.amberMuted,
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: COLORS.amber,
                    fontFamily: 'DMSans_700Bold',
                    letterSpacing: 0.2,
                  }}
                >
                  Coming Soon
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 4 }}>
              <Text
                style={{
                  fontSize: 30,
                  fontWeight: '700',
                  color: COLORS.text,
                  fontFamily: 'DMSans_700Bold',
                  letterSpacing: -0.5,
                }}
              >
                $40–$75
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: COLORS.textSecondary,
                  fontFamily: 'DMSans_400Regular',
                }}
              >
                / month
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: COLORS.textTertiary,
                fontFamily: 'DMSans_400Regular',
                marginBottom: 16,
              }}
            >
              Advertising and listing fees only
            </Text>
            <View style={{ gap: 8, marginBottom: 18 }}>
              {PREMIUM_FEATURES.map((feature) => (
                <View key={feature} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={15} color={COLORS.amber} />
                  <Text
                    style={{
                      fontSize: 13,
                      color: COLORS.textSecondary,
                      fontFamily: 'DMSans_400Regular',
                      flex: 1,
                    }}
                  >
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              onPress={handleNotifyMe}
              activeOpacity={1}
              disabled
              style={{
                borderWidth: 1.5,
                borderColor: 'rgba(217, 119, 6, 0.3)',
                borderRadius: 12,
                borderCurve: 'continuous',
                paddingVertical: 13,
                alignItems: 'center',
                opacity: 0.5,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: COLORS.amber,
                  fontFamily: 'DMSans_600SemiBold',
                }}
              >
                Notify Me
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Terms for Providers */}
        <View style={{ paddingHorizontal: 16, paddingTop: 28, gap: 12 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: COLORS.textTertiary,
              fontFamily: 'DMSans_700Bold',
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              marginBottom: 4,
            }}
          >
            {'⚖️ Terms for Providers'}
          </Text>
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: COLORS.border,
              overflow: 'hidden',
            }}
          >
            {PROVIDER_TERMS.map((term, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: index < PROVIDER_TERMS.length - 1 ? 1 : 0,
                  borderBottomColor: COLORS.border,
                }}
              >
                <CheckCircle size={16} color="#6BAF8A" style={{ marginTop: 2, flexShrink: 0 }} />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: COLORS.textSecondary,
                    fontFamily: 'DMSans_400Regular',
                    lineHeight: 19,
                  }}
                >
                  {term}
                </Text>
              </View>
            ))}

            {/* Checkbox row */}
            <Pressable
              onPress={handleToggleTerms}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 16,
                paddingVertical: 14,
                backgroundColor: termsAgreed ? 'rgba(76, 175, 130, 0.06)' : COLORS.surfaceSecondary,
                borderTopWidth: 1,
                borderTopColor: COLORS.border,
              }}
            >
              {termsAgreed ? (
                <CheckSquare size={20} color={COLORS.primary} />
              ) : (
                <Square size={20} color={COLORS.textTertiary} />
              )}
              <Text
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: '600',
                  color: termsAgreed ? COLORS.primary : COLORS.textSecondary,
                  fontFamily: 'DMSans_600SemiBold',
                  lineHeight: 18,
                }}
              >
                {'I have read and agree to the Terms for Providers'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Disclaimer */}
        <DisclaimerBanner />
      </ScrollView>
    </View>
  );
}
