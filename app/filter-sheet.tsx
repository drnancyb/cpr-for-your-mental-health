import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { FiltersContext, Filters } from '@/contexts/FiltersContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  border: 'rgba(45, 122, 95, 0.08)',
  divider: 'rgba(45, 122, 95, 0.05)',
};

interface FilterOptions {
  locations: string[];
  genders: string[];
  specialties: string[];
  therapy_types: string[];
  insurances: string[];
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <AnimatedPressable onPress={onPress} scaleValue={0.95}>
      <View style={{
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: selected ? '#2D7A5F' : 'transparent',
        borderWidth: 1.5,
        borderColor: selected ? '#2D7A5F' : 'rgba(45,122,95,0.25)',
      }}>
        <Text style={{
          fontSize: 14,
          color: selected ? '#FFFFFF' : '#5C7A6A',
          fontFamily: selected ? 'DMSans_600SemiBold' : 'DMSans_400Regular',
        }}>{label}</Text>
      </View>
    </AnimatedPressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textTertiary,
        fontFamily: 'DMSans_600SemiBold',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 8,
      }}
    >
      {title}
    </Text>
  );
}

export default function FilterSheet() {
  const { filters, setFilters } = useContext(FiltersContext);
  const insets = useSafeAreaInsets();

  const [localFilters, setLocalFilters] = useState<Filters>({ ...filters });
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);

  React.useEffect(() => {
    console.log('[FilterSheet] Fetching filter options');
    fetch(`${BASE_URL}/api/filters`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
        }
        return res.json();
      })
      .then((data: FilterOptions) => {
        console.log('[FilterSheet] Filter options loaded');
        setOptions(data);
      })
      .catch((err) => {
        console.error('[FilterSheet] Failed to load filter options:', err.message);
      })
      .finally(() => setLoadingOptions(false));
  }, []);

  const handleApply = () => {
    console.log('[FilterSheet] Applying filters:', localFilters);
    setFilters(localFilters);
    router.back();
  };

  const handleClearAll = () => {
    console.log('[FilterSheet] Clearing all filters');
    const cleared: Filters = {
      location: [],
      gender: null,
      specialty: null,
      therapy_type: null,
      insurance: null,
      search: localFilters.search,
      slidingScale: false,
    };
    setLocalFilters(cleared);
  };

  const handleClose = () => {
    console.log('[FilterSheet] Closing filter sheet without applying');
    router.back();
  };

  const setLocal = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleLocation = (value: string) => {
    console.log('[FilterSheet] Toggle location:', value);
    setLocalFilters(prev => {
      const current = prev.location;
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, location: next };
    });
  };

  const toggle = <K extends keyof Omit<Filters, 'search' | 'location'>>(key: K, value: string) => {
    const current = localFilters[key];
    setLocal(key, (current === value ? null : value) as Filters[K]);
  };

  const genderOptions = options?.genders ?? ['Male', 'Female', 'Non-binary'];

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}
      >
        <AnimatedPressable onPress={handleClose} scaleValue={0.9}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: COLORS.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} color={COLORS.textSecondary} />
          </View>
        </AnimatedPressable>

        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: COLORS.text,
            fontFamily: 'DMSans_600SemiBold',
          }}
        >
          Filters
        </Text>

        <AnimatedPressable onPress={handleClearAll} scaleValue={0.95}>
          <Text
            style={{
              fontSize: 15,
              color: COLORS.primary,
              fontFamily: 'DMSans_600SemiBold',
              fontWeight: '600',
            }}
          >
            Clear all
          </Text>
        </AnimatedPressable>
      </View>

      {loadingOptions ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {/* Location */}
          <SectionHeader title="Location" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
            {(options?.locations ?? []).map((loc) => (
              <Chip
                key={loc}
                label={loc}
                selected={localFilters.location.includes(loc)}
                onPress={() => toggleLocation(loc)}
              />
            ))}
          </View>

          {/* Gender */}
          <SectionHeader title="Gender" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
            {genderOptions.map((g) => (
              <Chip
                key={g}
                label={g}
                selected={localFilters.gender === g}
                onPress={() => toggle('gender', g)}
              />
            ))}
          </View>

          {/* Specialty */}
          <SectionHeader title="Specialty" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
            {(options?.specialties ?? []).map((s) => (
              <Chip
                key={s}
                label={s}
                selected={localFilters.specialty === s}
                onPress={() => toggle('specialty', s)}
              />
            ))}
          </View>

          {/* Therapy Type */}
          <SectionHeader title="Therapy Type" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
            {(options?.therapy_types ?? []).map((t) => (
              <Chip
                key={t}
                label={t}
                selected={localFilters.therapy_type === t}
                onPress={() => toggle('therapy_type', t)}
              />
            ))}
          </View>

          {/* Insurance */}
          <SectionHeader title="Insurance" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
            {(options?.insurances ?? []).map((ins) => (
              <Chip
                key={ins}
                label={ins}
                selected={localFilters.insurance === ins}
                onPress={() => toggle('insurance', ins)}
              />
            ))}
          </View>

          {/* Sliding Scale */}
          <SectionHeader title="Fees" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
            <Chip
              label="Sliding Scale Available"
              selected={localFilters.slidingScale}
              onPress={() => {
                console.log('[FilterSheet] Toggle slidingScale:', !localFilters.slidingScale);
                setLocalFilters(prev => ({ ...prev, slidingScale: !prev.slidingScale }));
              }}
            />
          </View>
        </ScrollView>
      )}

      {/* Footer */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 16,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        }}
      >
        <AnimatedPressable onPress={handleApply}>
          <View
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              boxShadow: '0 4px 16px rgba(45, 122, 95, 0.3)',
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: '#FFFFFF',
                fontFamily: 'DMSans_700Bold',
              }}
            >
              Show results
            </Text>
          </View>
        </AnimatedPressable>
      </View>
    </View>
  );
}
