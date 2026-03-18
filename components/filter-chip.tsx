import React from 'react';
import { View, Text } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';

const COLORS = {
  surface: '#FFFFFF',
  surfaceSecondary: '#EDF2EF',
  text: '#1A2E25',
  textSecondary: '#5C7A6A',
  primary: '#2D7A5F',
  primaryMuted: '#E8F4EF',
  border: 'rgba(45, 122, 95, 0.08)',
};

interface FilterChipProps {
  label: string;
  isActive: boolean;
  activeCount?: number;
  onPress: () => void;
  icon?: React.ReactNode;
}

export function FilterChip({ label, isActive, activeCount, onPress, icon }: FilterChipProps) {
  const showBadge = isActive && activeCount && activeCount > 0;

  return (
    <AnimatedPressable onPress={onPress} scaleValue={0.95}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: isActive ? COLORS.primary : COLORS.surface,
          borderWidth: 1,
          borderColor: isActive ? COLORS.primary : COLORS.border,
          boxShadow: isActive
            ? '0 2px 8px rgba(45, 122, 95, 0.2)'
            : '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {icon && icon}
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: isActive ? '#FFFFFF' : COLORS.textSecondary,
            fontFamily: 'DMSans_600SemiBold',
          }}
        >
          {label}
        </Text>
        {showBadge ? (
          <View
            style={{
              backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : COLORS.primary,
              borderRadius: 10,
              minWidth: 18,
              height: 18,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 4,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: '#FFFFFF',
                fontFamily: 'DMSans_700Bold',
              }}
            >
              {activeCount}
            </Text>
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}
