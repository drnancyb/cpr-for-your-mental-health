import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

const COLORS = {
  surface: '#FFFFFF',
  surfaceSecondary: '#EDF2EF',
  border: 'rgba(45, 122, 95, 0.08)',
};

function SkeletonBlock({
  width,
  height = 14,
  borderRadius = 7,
  style,
}: {
  width: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: COLORS.surfaceSecondary,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
      }}
    >
      {/* Top row */}
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        {/* Avatar */}
        <SkeletonBlock width={56} height={56} borderRadius={28} />
        {/* Name + title */}
        <View style={{ flex: 1, gap: 8, paddingTop: 4 }}>
          <SkeletonBlock width="70%" height={16} />
          <SkeletonBlock width="50%" height={12} />
          <SkeletonBlock width="40%" height={12} />
        </View>
      </View>
      {/* Tags row */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        <SkeletonBlock width={80} height={24} borderRadius={12} />
        <SkeletonBlock width={100} height={24} borderRadius={12} />
        <SkeletonBlock width={70} height={24} borderRadius={12} />
      </View>
      {/* Bottom row */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 14,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        }}
      >
        <SkeletonBlock width={80} height={12} />
        <SkeletonBlock width={60} height={12} />
      </View>
    </View>
  );
}
