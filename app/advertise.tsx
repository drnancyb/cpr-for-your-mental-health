import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Star, TrendingUp, Users } from 'lucide-react-native';
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
  accent: '#4CAF82',
  border: 'rgba(45, 122, 95, 0.08)',
  gold: '#F59E0B',
  goldMuted: 'rgba(251, 191, 36, 0.12)',
};

const BENEFITS = [
  {
    icon: Star,
    title: 'Featured Placement',
    description: 'Appear at the top of search results where clients are looking',
    color: '#F59E0B',
    bg: '#FFFBEB',
  },
  {
    icon: TrendingUp,
    title: 'More Visibility',
    description: 'Reach more clients actively seeking mental health support',
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

const PRICING = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$29',
    period: '/month',
    badge: null,
    highlight: false,
  },
  {
    id: 'annual',
    label: 'Annual',
    price: '$199',
    period: '/year',
    badge: 'Save 43%',
    highlight: true,
  },
];

export default function AdvertiseScreen() {
  const handleGetFeatured = () => {
    console.log('[Advertise] Get Featured button pressed — navigating to paywall');
    router.push('/paywall');
  };

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
            Get more clients.
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
            Promote your practice and connect with clients who are actively looking for help.
          </Text>
        </View>

        {/* Benefits */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24, gap: 12 }}>
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

        {/* Pricing */}
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
            Choose a plan
          </Text>
          {PRICING.map((plan) => (
            <View
              key={plan.id}
              style={{
                backgroundColor: plan.highlight ? COLORS.primary : COLORS.surface,
                borderRadius: 16,
                borderCurve: 'continuous',
                padding: 20,
                borderWidth: plan.highlight ? 0 : 1,
                borderColor: COLORS.border,
                boxShadow: plan.highlight
                  ? '0 4px 16px rgba(45, 122, 95, 0.25)'
                  : '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: '700',
                    color: plan.highlight ? '#FFFFFF' : COLORS.text,
                    fontFamily: 'DMSans_700Bold',
                  }}
                >
                  {plan.label}
                </Text>
                {plan.badge ? (
                  <View
                    style={{
                      backgroundColor: COLORS.gold,
                      borderRadius: 20,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: '#FFFFFF',
                        fontFamily: 'DMSans_700Bold',
                      }}
                    >
                      {plan.badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 8 }}>
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: '700',
                    color: plan.highlight ? '#FFFFFF' : COLORS.text,
                    fontFamily: 'DMSans_700Bold',
                    letterSpacing: -0.5,
                  }}
                >
                  {plan.price}
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    color: plan.highlight ? 'rgba(255,255,255,0.7)' : COLORS.textSecondary,
                    fontFamily: 'DMSans_400Regular',
                  }}
                >
                  {plan.period}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={{ paddingHorizontal: 16, paddingTop: 28, gap: 12 }}>
          <TouchableOpacity
            onPress={handleGetFeatured}
            activeOpacity={0.85}
            style={{
              backgroundColor: COLORS.accent,
              borderRadius: 16,
              borderCurve: 'continuous',
              paddingVertical: 18,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(76, 175, 130, 0.4)',
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: '700',
                color: '#FFFFFF',
                fontFamily: 'DMSans_700Bold',
                letterSpacing: -0.2,
              }}
            >
              Get Featured
            </Text>
          </TouchableOpacity>

          <Text
            style={{
              fontSize: 12,
              color: COLORS.textTertiary,
              fontFamily: 'DMSans_400Regular',
              textAlign: 'center',
              lineHeight: 18,
            }}
          >
            Billed through the App Store / Google Play. Cancel anytime.
          </Text>
        </View>

        {/* Disclaimer */}
        <DisclaimerBanner />
      </ScrollView>
    </View>
  );
}
