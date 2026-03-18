import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { router } from 'expo-router';

const DISCLAIMER_FULL =
  'This platform is an independent directory of providers designed to help users find mental health professionals in British Columbia. We do not provide medical or mental health services, nor do we offer clinical advice, diagnosis, or treatment. All therapists listed on this platform are independent practitioners and are solely responsible for the services they provide. Users are encouraged to verify the credentials, licensing, and suitability of any provider before engaging in services. Use of this platform does not establish a therapist-client relationship with this service. Any relationship formed is strictly between the user and the mental health professional. This platform does not endorse or recommend any specific provider. If you are in crisis or require immediate assistance, please contact local emergency services.';

const TEASER = 'Independent directory of providers. Not a medical service. Tap to read more.';
const CRISIS_LINE = 'Crisis line: 1-800-SUICIDE (784-2433)';

const COLLAPSED_HEIGHT = 44;
const EXPANDED_HEIGHT = 260;

export function DisclaimerBanner() {
  const [expanded, setExpanded] = useState(false);
  const heightValue = useSharedValue(COLLAPSED_HEIGHT);

  const toggle = useCallback(() => {
    const next = !expanded;
    console.log('[DisclaimerBanner] Toggled:', next ? 'expanded' : 'collapsed');
    setExpanded(next);
    heightValue.value = withTiming(next ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, heightValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: heightValue.value,
    overflow: 'hidden',
  }));

  const chevronColor = '#92400E';

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          marginHorizontal: 16,
          marginTop: 12,
          marginBottom: 8,
          borderRadius: 10,
          borderLeftWidth: 3,
          borderLeftColor: '#F59E0B',
          backgroundColor: 'rgba(251, 191, 36, 0.12)',
          borderWidth: 1,
          borderColor: 'rgba(245, 158, 11, 0.2)',
        },
      ]}
    >
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.75}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 12,
          gap: 6,
        }}
        accessibilityLabel={expanded ? 'Collapse disclaimer' : 'Expand disclaimer'}
        accessibilityRole="button"
      >
        <Text
          style={{
            flex: 1,
            fontSize: 11,
            color: '#78350F',
            fontFamily: 'DMSans_600SemiBold',
            fontWeight: '600',
            lineHeight: 16,
          }}
          numberOfLines={expanded ? undefined : 1}
        >
          {expanded ? 'Disclaimer' : TEASER}
        </Text>
        {expanded
          ? <ChevronUp size={14} color={chevronColor} />
          : <ChevronDown size={14} color={chevronColor} />
        }
      </TouchableOpacity>

      {expanded ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}>
          <Text
            style={{
              fontSize: 11,
              color: '#78350F',
              fontFamily: 'DMSans_400Regular',
              lineHeight: 17,
            }}
          >
            {DISCLAIMER_FULL}
          </Text>
          <View
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              borderRadius: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderLeftWidth: 2,
              borderLeftColor: '#EF4444',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: '#B91C1C',
                fontFamily: 'DMSans_700Bold',
                lineHeight: 16,
              }}
            >
              {CRISIS_LINE}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => {
                console.log('[DisclaimerBanner] Privacy Policy link pressed');
                router.push('/privacy-policy');
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: '#92400E',
                  fontFamily: 'DMSans_600SemiBold',
                  fontWeight: '600',
                  textDecorationLine: 'underline',
                  lineHeight: 16,
                }}
              >
                Privacy Policy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                console.log('[DisclaimerBanner] Admin Setup link pressed');
                router.push('/admin-setup');
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: '#92400E',
                  fontFamily: 'DMSans_400Regular',
                  opacity: 0.6,
                  lineHeight: 16,
                }}
              >
                Admin
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}
