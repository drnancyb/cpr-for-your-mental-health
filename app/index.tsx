import React, { useEffect, useRef, useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Animated,
  RefreshControl,
  TouchableOpacity,
  ActionSheetIOS,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, router, Redirect } from 'expo-router';
import { SlidersHorizontal, User, MapPin, Users, Stethoscope, Heart, Shield, FilePen, ShieldCheck, LogOut, LogIn, Bookmark, ChevronDown } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { FilterChip } from '@/components/filter-chip';
import { TherapistCard, Therapist } from '@/components/therapist-card';
import { SkeletonCard } from '@/components/skeleton-card';
import { FiltersContext } from '@/contexts/FiltersContext';
import { useAuth } from '@/contexts/AuthContext';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { NotificationBell } from "@/components/NotificationBell";
import { api } from '@/utils/api';

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
  const { filters, updateFilter, clearFilters, activeFilterCount } = useContext(FiltersContext);
  const { user, loading: authLoading, signOut } = useAuth();

  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc'>('default');
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
    if (sortBy !== 'default') params.set('sort', sortBy);

    const queryString = params.toString();
    const url = queryString
      ? `${BASE_URL}/api/therapists?${queryString}`
      : `${BASE_URL}/api/therapists`;

    console.log('[Index] Fetching therapists:', url);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 100)}`);
      }
      const data = await response.json();
      console.log('[Index] Fetched', data.therapists?.length ?? 0, 'therapists');
      setTherapists(data.therapists ?? []);
      setTotal(data.total ?? 0);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Index] Fetch error:', msg);
      setError(msg);
    }
  }, [filters.location, filters.gender, filters.specialty, filters.therapy_type, filters.insurance, filters.search, sortBy]);

  useEffect(() => {
    setLoading(true);
    fetchTherapists().finally(() => setLoading(false));
  }, [filters.location, filters.gender, filters.specialty, filters.therapy_type, filters.insurance, sortBy]);

  const handleSearchChange = useCallback((text: string) => {
    updateFilter('search', text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      if (text !== lastSearchRef.current) {
        lastSearchRef.current = text;
        console.log('[Index] Search debounced, query:', text);
        setLoading(true);
        fetchTherapists(text).finally(() => setLoading(false));
        // Fire-and-forget analytics event
        api.post('/api/analytics/events', { event_type: 'search', metadata: { query: text, filters: filters } }).catch(() => {});
      }
    }, 300);
  }, [updateFilter, fetchTherapists, filters]);

  const handleRefresh = useCallback(async () => {
    console.log('[Index] Pull-to-refresh triggered');
    setRefreshing(true);
    await fetchTherapists();
    setRefreshing(false);
  }, [fetchTherapists]);

  const handleOpenFilters = useCallback(() => {
    console.log('[Index] Filters button pressed');
    router.push('/filter-sheet');
  }, []);

  const handleClearFilters = useCallback(() => {
    console.log('[Index] Clear filters pressed');
    clearFilters();
  }, [clearFilters]);

  const handleSortPress = useCallback(() => {
    console.log('[Index] Sort chip pressed, current sortBy:', sortBy);
    const options = ['Default', 'Price: Low to High', 'Price: High to Low', 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 3 },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            console.log('[Index] Sort selected: default');
            setSortBy('default');
          } else if (buttonIndex === 1) {
            console.log('[Index] Sort selected: price_asc');
            setSortBy('price_asc');
          } else if (buttonIndex === 2) {
            console.log('[Index] Sort selected: price_desc');
            setSortBy('price_desc');
          }
        },
      );
    } else {
      Alert.alert('Sort by', undefined, [
        { text: 'Default', onPress: () => { console.log('[Index] Sort selected: default'); setSortBy('default'); } },
        { text: 'Price: Low to High', onPress: () => { console.log('[Index] Sort selected: price_asc'); setSortBy('price_asc'); } },
        { text: 'Price: High to Low', onPress: () => { console.log('[Index] Sort selected: price_desc'); setSortBy('price_desc'); } },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [sortBy]);

  const handleUserAvatarPress = useCallback(() => {
    console.log('[Index] User avatar pressed, user:', user?.email);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'My Preferences', 'Therapist Portal', 'My Bookings', 'View My Application', 'Advertise Your Practice', 'Contact & Support', 'Admin Setup', 'Sign Out'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 8,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            console.log('[Index] My Preferences selected');
            router.push('/preferences');
          } else if (buttonIndex === 2) {
            console.log('[Index] Therapist Portal selected');
            router.push('/therapist-portal');
          } else if (buttonIndex === 3) {
            console.log('[Index] My Bookings selected');
            router.push('/my-bookings');
          } else if (buttonIndex === 4) {
            console.log('[Index] View Application selected');
            router.push('/apply');
          } else if (buttonIndex === 5) {
            console.log('[Index] Advertise selected');
            router.push('/advertise');
          } else if (buttonIndex === 6) {
            console.log('[Index] Contact & Support selected');
            router.push('/support');
          } else if (buttonIndex === 7) {
            console.log('[Index] Admin Setup selected');
            router.push('/admin-setup');
          } else if (buttonIndex === 8) {
            console.log('[Index] Sign Out selected');
            signOut();
          }
        },
      );
    } else {
      Alert.alert(
        user?.name ?? 'Account',
        user?.email ?? '',
        [
          { text: 'My Preferences', onPress: () => { console.log('[Index] My Preferences pressed'); router.push('/preferences'); } },
          { text: 'Therapist Portal', onPress: () => { console.log('[Index] Therapist Portal pressed'); router.push('/therapist-portal'); } },
          { text: 'My Bookings', onPress: () => { console.log('[Index] My Bookings pressed'); router.push('/my-bookings'); } },
          { text: 'View My Application', onPress: () => { console.log('[Index] View Application pressed'); router.push('/apply'); } },
          { text: 'Advertise Your Practice', onPress: () => { console.log('[Index] Advertise pressed'); router.push('/advertise'); } },
          { text: 'Contact & Support', onPress: () => { console.log('[Index] Contact & Support pressed'); router.push('/support'); } },
          { text: 'Admin Setup', onPress: () => { console.log('[Index] Admin Setup pressed'); router.push('/admin-setup'); } },
          { text: 'Sign Out', style: 'destructive', onPress: () => { console.log('[Index] Sign Out pressed'); signOut(); } },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    }
  }, [user, signOut]);

  const renderItem = useCallback(({ item, index }: { item: Therapist; index: number }) => (
    <TherapistCard therapist={item} index={index} />
  ), []);

  const keyExtractor = useCallback((item: Therapist) => item.id, []);

  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F4F7F5', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2D7A5F" />
      </View>
    );
  }
  if (!user) {
    return <Redirect href="/auth-screen" />;
  }

  const acceptingCount = therapists.filter(t => t.accepting_new_clients).length;

  const sortChipLabel = sortBy === 'price_asc' ? 'Price: Low–High' : sortBy === 'price_desc' ? 'Price: High–Low' : 'Sort';
  const sortChipActive = sortBy !== 'default';

  const userInitials = user.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  // Header right buttons
  const HeaderRight = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {user?.role === 'admin' && (
        <TouchableOpacity
          onPress={() => {
            console.log('[Index] Admin dashboard button pressed');
            router.push('/admin');
          }}
          activeOpacity={0.7}
          style={{ padding: 8 }}
          accessibilityLabel="Admin dashboard"
        >
          <ShieldCheck size={20} color={COLORS.primary} />
        </TouchableOpacity>
      )}
      {user ? (
        <TouchableOpacity
          onPress={() => {
            console.log('[Index] Saved therapists button pressed');
            router.push('/saved');
          }}
          activeOpacity={0.7}
          style={{ padding: 8 }}
          accessibilityLabel="Saved therapists"
        >
          <Bookmark size={20} color={COLORS.primary} />
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        onPress={() => {
          console.log('[Index] Apply button pressed');
          router.push('/apply');
        }}
        activeOpacity={0.7}
        style={{ padding: 8 }}
        accessibilityLabel="Apply as therapist"
      >
        <FilePen size={20} color={COLORS.primary} />
      </TouchableOpacity>
      {user ? (
        <TouchableOpacity
          onPress={handleUserAvatarPress}
          activeOpacity={0.7}
          style={{ padding: 4 }}
          accessibilityLabel="Account menu"
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: COLORS.primary + '30',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.primary, fontFamily: 'DMSans_700Bold' }}>
              {userInitials}
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => {
            console.log('[Index] Sign in button pressed');
            router.push('/auth-screen');
          }}
          activeOpacity={0.7}
          style={{ padding: 8 }}
          accessibilityLabel="Sign in"
        >
          <LogIn size={20} color={COLORS.primary} />
        </TouchableOpacity>
      )}
    </View>
  );

  const ListHeader = (
    <View>
      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
      >
                <NotificationBell />
        
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

        <AnimatedPressable onPress={handleSortPress} scaleValue={0.95}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: sortChipActive ? COLORS.primary : COLORS.surface,
              borderWidth: 1,
              borderColor: sortChipActive ? COLORS.primary : COLORS.border,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: sortChipActive ? '#FFFFFF' : COLORS.textSecondary,
                fontFamily: 'DMSans_600SemiBold',
              }}
            >
              {sortChipLabel}
            </Text>
            <ChevronDown size={13} color={sortChipActive ? '#FFFFFF' : COLORS.textSecondary} />
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
      <AnimatedPressable onPress={() => {
        console.log('[Index] Retry button pressed');
        setLoading(true);
        fetchTherapists().finally(() => setLoading(false));
      }}>
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
          headerTransparent: false,
          headerBlurEffect: 'systemMaterial',
          headerRight: () => HeaderRight,
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
          ListFooterComponent={<DisclaimerBanner />}
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
