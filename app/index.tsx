import React, { useEffect, useRef, useState, useCallback, use } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Animated,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SlidersHorizontal, User, MapPin, Users, Stethoscope, Heart, Shield } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { FilterChip } from '@/components/filter-chip';
import { TherapistCard, Therapist } from '@/components/therapist-card';
import { SkeletonCard } from '@/components/skeleton-card';
import { FiltersContext } from '@/contexts/FiltersContext';

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
  border: 'rgba(45, 122, 95, 0.08)',
};

const FILTER_CHIPS = [
  { key: 'location' as const, label: 'Location', icon: <MapPin size={13} color="inherit" /> },
  { key: 'gender' as const, label: 'Gender', icon: <Users size={13} color="inherit" /> },
  { key: 'specialty' as const, label: 'Specialty', icon: <Stethoscope size={13} color="inherit" /> },
  { key: 'therapy_type' as const, label: 'Therapy Type', icon: <Heart size={13} color="inherit" /> },
  { key: 'insurance' as const, label: 'Insurance', icon: <Shield size={13} color="inherit" /> },
];

export default function IndexScreen() {
  const { filters, updateFilter, clearFilters, activeFilterCount } = use(FiltersContext);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchRef = useRef('');

  const fetchTherapists = useCallback(async (searchOverride?: string) => {
    const searchValue = searchOverride !== undefined ? searchOverride : filters.search;
    const params = new URLSearchParams();
    if (filters.location) params.set('location', filters.location);
    if (filters.gender) params.set('gender', filters.gender);
    if (filters.specialty) params.set('specialty', filters.specialty);
    if (filters.therapy_type) params.set('therapy_type', filters.therapy_type);
    if (filters.insurance) params.set('insurance', filters.insurance);
    if (searchValue) params.set('search', searchValue);

    const queryString = params.toString();
    const url = queryString
      ? `${BASE_URL}/api/therapists?${queryString}`
      : `${BASE_URL}/api/therapists`;
    console.log('[IndexScreen] Fetching therapists:', url);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 100)}`);
      }
      const data = await response.json();
      console.log('[IndexScreen] Fetched therapists count:', data.total);
      setTherapists(data.therapists ?? []);
      setTotal(data.total ?? 0);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[IndexScreen] Fetch error:', msg);
      setError(msg);
    }
  }, [filters.location, filters.gender, filters.specialty, filters.therapy_type, filters.insurance, filters.search]);

  // Initial load and filter changes
  useEffect(() => {
    setLoading(true);
    fetchTherapists().finally(() => setLoading(false));
  }, [filters.location, filters.gender, filters.specialty, filters.therapy_type, filters.insurance]);

  // Debounced search
  const handleSearchChange = useCallback((text: string) => {
    updateFilter('search', text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      if (text !== lastSearchRef.current) {
        lastSearchRef.current = text;
        console.log('[IndexScreen] Search debounced, querying:', text);
        setLoading(true);
        fetchTherapists(text).finally(() => setLoading(false));
      }
    }, 300);
  }, [updateFilter, fetchTherapists]);

  const handleRefresh = useCallback(async () => {
    console.log('[IndexScreen] Pull-to-refresh triggered');
    setRefreshing(true);
    await fetchTherapists();
    setRefreshing(false);
  }, [fetchTherapists]);

  const handleOpenFilters = useCallback(() => {
    console.log('[IndexScreen] Opening filter sheet');
    router.push('/filter-sheet');
  }, []);

  const handleClearFilters = useCallback(() => {
    console.log('[IndexScreen] Clearing all filters');
    clearFilters();
  }, [clearFilters]);

  const acceptingCount = therapists.filter(t => t.accepting_new_clients).length;

  const renderItem = useCallback(({ item, index }: { item: Therapist; index: number }) => (
    <TherapistCard therapist={item} index={index} />
  ), []);

  const keyExtractor = useCallback((item: Therapist) => item.id, []);

  const ListHeader = (
    <View>
      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
      >
        <AnimatedPressable
          onPress={handleOpenFilters}
          scaleValue={0.95}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: activeFilterCount > 0 ? COLORS.primary : COLORS.surface,
              borderWidth: 1,
              borderColor: activeFilterCount > 0 ? COLORS.primary : COLORS.border,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <SlidersHorizontal
              size={14}
              color={activeFilterCount > 0 ? '#FFFFFF' : COLORS.textSecondary}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: activeFilterCount > 0 ? '#FFFFFF' : COLORS.textSecondary,
                fontFamily: 'DMSans_600SemiBold',
              }}
            >
              Filters
            </Text>
            {activeFilterCount > 0 ? (
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.3)',
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
                  {activeFilterCount}
                </Text>
              </View>
            ) : null}
          </View>
        </AnimatedPressable>

        {FILTER_CHIPS.map((chip) => {
          const isActive = !!filters[chip.key];
          const activeLabel = isActive ? filters[chip.key]! : chip.label;
          return (
            <FilterChip
              key={chip.key}
              label={activeLabel}
              isActive={isActive}
              onPress={handleOpenFilters}
            />
          );
        })}
      </ScrollView>

      {/* Result count */}
      {!loading ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text
            style={{
              fontSize: 13,
              color: COLORS.textSecondary,
              fontFamily: 'DMSans_400Regular',
            }}
          >
            {acceptingCount}
            {' '}
            <Text style={{ fontFamily: 'DMSans_600SemiBold', color: COLORS.primary }}>
              {acceptingCount === 1 ? 'therapist' : 'therapists'}
            </Text>
            {' '}accepting new clients
          </Text>
        </View>
      ) : null}
    </View>
  );

  const EmptyState = (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        paddingHorizontal: 32,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          backgroundColor: COLORS.primaryMuted,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <User size={32} color={COLORS.primary} />
      </View>
      <Text
        style={{
          fontSize: 18,
          fontWeight: '600',
          color: COLORS.text,
          fontFamily: 'DMSans_600SemiBold',
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        No therapists found
      </Text>
      <Text
        style={{
          fontSize: 15,
          color: COLORS.textSecondary,
          fontFamily: 'DMSans_400Regular',
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: 24,
        }}
      >
        Try adjusting your filters or search terms to find the right therapist for you.
      </Text>
      {activeFilterCount > 0 ? (
        <AnimatedPressable onPress={handleClearFilters}>
          <View
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 12,
              paddingHorizontal: 24,
              paddingVertical: 12,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: '#FFFFFF',
                fontFamily: 'DMSans_600SemiBold',
              }}
            >
              Clear filters
            </Text>
          </View>
        </AnimatedPressable>
      ) : null}
    </View>
  );

  const ErrorState = (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        paddingHorizontal: 32,
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: '600',
          color: COLORS.text,
          fontFamily: 'DMSans_600SemiBold',
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        Couldn't load therapists
      </Text>
      <Text
        style={{
          fontSize: 15,
          color: COLORS.textSecondary,
          fontFamily: 'DMSans_400Regular',
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: 24,
        }}
      >
        Check your connection and try again.
      </Text>
      <AnimatedPressable onPress={() => { setLoading(true); fetchTherapists().finally(() => setLoading(false)); }}>
        <View
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 12,
            paddingHorizontal: 24,
            paddingVertical: 12,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: '#FFFFFF',
              fontFamily: 'DMSans_600SemiBold',
            }}
          >
            Try again
          </Text>
        </View>
      </AnimatedPressable>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen
        options={{
          title: 'Find a Therapist',
          headerLargeTitle: true,
          headerSearchBarOptions: {
            placeholder: 'Search by name or specialty...',
            onChangeText: (e) => handleSearchChange(e.nativeEvent.text),
            onCancelButtonPress: () => handleSearchChange(''),
            tintColor: COLORS.primary,
            textColor: COLORS.text,
          },
        }}
      />

      {loading ? (
        <FlatList
          data={[1, 2, 3, 4]}
          keyExtractor={(item) => String(item)}
          renderItem={() => <SkeletonCard />}
          ListHeaderComponent={<View style={{ height: 80 }} />}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
        />
      ) : error ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {ListHeader}
          {ErrorState}
        </ScrollView>
      ) : (
        <FlatList
          data={therapists}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={EmptyState}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
