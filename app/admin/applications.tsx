import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Animated,
} from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import { Clock, CheckCircle, XCircle, ChevronRight, ClipboardList } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';

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
  danger: '#EF4444',
  success: '#34A853',
  warning: '#F59E0B',
};

type StatusFilter = 'pending' | 'approved' | 'rejected' | undefined;

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: undefined, label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

interface Application {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  name: string;
  title?: string;
  email: string;
  location?: string;
  city?: string;
  created_at: string;
}

function getStatusColor(status: string) {
  if (status === 'approved') return COLORS.success;
  if (status === 'rejected') return COLORS.danger;
  return COLORS.warning;
}

function StatusBadge({ status }: { status: string }) {
  const color = getStatusColor(status);
  const bg = color + '18';
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  const Icon =
    status === 'approved' ? CheckCircle : status === 'rejected' ? XCircle : Clock;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: bg,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Icon size={13} color={color} />
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color,
          fontFamily: 'DMSans_600SemiBold',
          textTransform: 'capitalize',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);
  return (
    <Animated.View
      style={{
        opacity,
        backgroundColor: COLORS.surface,
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.surfaceSecondary }} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ width: '60%', height: 14, borderRadius: 7, backgroundColor: COLORS.surfaceSecondary }} />
        <View style={{ width: '40%', height: 12, borderRadius: 6, backgroundColor: COLORS.surfaceSecondary }} />
        <View style={{ width: '30%', height: 10, borderRadius: 5, backgroundColor: COLORS.surfaceSecondary }} />
      </View>
      <View style={{ width: 64, height: 24, borderRadius: 12, backgroundColor: COLORS.surfaceSecondary }} />
    </Animated.View>
  );
}

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: index * 50, useNativeDriver: true }),
    ]).start();
  }, [index, opacity, translateY]);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function ApplicationsListScreen() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<StatusFilter>(undefined);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async (status: StatusFilter) => {
    setError(null);
    const path = status
      ? `/api/admin/applications?status=${status}`
      : '/api/admin/applications';
    console.log('[Applications] Fetching GET', path);
    try {
      const data = await api.get<Application[]>(path);
      console.log('[Applications] Fetched', data.length, 'applications, filter:', status ?? 'all');
      setApplications(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load applications.';
      console.error('[Applications] Fetch error:', msg);
      setError(msg);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setApplications([]);
    fetchApplications(activeFilter).finally(() => setLoading(false));
  }, [activeFilter, fetchApplications]);

  // Refetch when screen comes back into focus (after approve/reject)
  useFocusEffect(
    useCallback(() => {
      console.log('[Applications] Screen focused — refetching');
      fetchApplications(activeFilter);
    }, [activeFilter, fetchApplications])
  );

  const handleRefresh = useCallback(async () => {
    console.log('[Applications] Pull-to-refresh, filter:', activeFilter ?? 'all');
    setRefreshing(true);
    await fetchApplications(activeFilter);
    setRefreshing(false);
  }, [fetchApplications, activeFilter]);

  const handleFilterPress = (filter: StatusFilter) => {
    console.log('[Applications] Filter pressed:', filter ?? 'all');
    setActiveFilter(filter);
  };

  const handleCardPress = (item: Application) => {
    console.log('[Applications] Card tapped:', item.id, item.name);
    router.push(`/admin/applications/${item.id}`);
  };

  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;

  const filterLabel = activeFilter
    ? activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)
    : 'All';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen
        options={{
          title: 'Applications',
          headerLargeTitle: true,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 8,
          gap: 8,
          flexDirection: 'row',
        }}
        style={{ flexGrow: 0, backgroundColor: COLORS.background }}
      >
        {STATUS_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <AnimatedPressable
              key={String(tab.key)}
              onPress={() => handleFilterPress(tab.key)}
              scaleValue={0.95}
            >
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isActive ? COLORS.primary : COLORS.surface,
                  borderWidth: 1,
                  borderColor: isActive ? COLORS.primary : COLORS.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: isActive ? '#fff' : COLORS.textSecondary,
                    fontFamily: 'DMSans_600SemiBold',
                  }}
                >
                  {tab.label}
                </Text>
              </View>
            </AnimatedPressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={{ paddingTop: 8 }}>
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text
            style={{
              fontSize: 15,
              color: COLORS.danger,
              fontFamily: 'DMSans_400Regular',
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            {error}
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Applications] Retry pressed');
              setLoading(true);
              fetchApplications(activeFilter).finally(() => setLoading(false));
            }}
          >
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
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#fff',
                  fontFamily: 'DMSans_600SemiBold',
                }}
              >
                Try again
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListHeaderComponent={
            applications.length > 0 && activeFilter === undefined ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  paddingHorizontal: 16,
                  paddingBottom: 8,
                  paddingTop: 4,
                }}
              >
                <StatPill label="Pending" value={pendingCount} color={COLORS.warning} />
                <StatPill label="Approved" value={approvedCount} color={COLORS.success} />
                <StatPill label="Rejected" value={rejectedCount} color={COLORS.danger} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View
              style={{
                paddingTop: 80,
                alignItems: 'center',
                paddingHorizontal: 32,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  backgroundColor: COLORS.primaryMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <ClipboardList size={28} color={COLORS.primary} />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: COLORS.text,
                  fontFamily: 'DMSans_600SemiBold',
                  marginBottom: 8,
                  textAlign: 'center',
                }}
              >
                No {filterLabel.toLowerCase()} applications
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: COLORS.textSecondary,
                  fontFamily: 'DMSans_400Regular',
                  textAlign: 'center',
                  lineHeight: 20,
                }}
              >
                {activeFilter === 'pending'
                  ? 'New applications will appear here for review.'
                  : activeFilter
                  ? `No applications have been ${activeFilter} yet.`
                  : 'No applications have been submitted yet.'}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const location = item.city ?? item.location ?? '';
            const _sd = item.created_at ? new Date(item.created_at) : null;
            const submittedDate = (_sd && !isNaN(_sd.getTime()))
              ? _sd.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
              : '—';
            const initial = item.name ? item.name.charAt(0).toUpperCase() : '?';
            return (
              <AnimatedListItem index={index}>
                <AnimatedPressable
                  onPress={() => handleCardPress(item)}
                  scaleValue={0.98}
                >
                  <View
                    style={{
                      backgroundColor: COLORS.surface,
                      marginHorizontal: 16,
                      marginBottom: 10,
                      borderRadius: 16,
                      borderCurve: 'continuous',
                      padding: 16,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    {/* Avatar */}
                    <View
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 23,
                        backgroundColor: COLORS.primaryMuted,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 17,
                          fontWeight: '700',
                          color: COLORS.primary,
                          fontFamily: 'DMSans_700Bold',
                        }}
                      >
                        {initial}
                      </Text>
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '600',
                          color: COLORS.text,
                          fontFamily: 'DMSans_600SemiBold',
                        }}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: COLORS.textSecondary,
                          fontFamily: 'DMSans_400Regular',
                        }}
                        numberOfLines={1}
                      >
                        {item.email}
                      </Text>
                      {location ? (
                        <Text
                          style={{
                            fontSize: 12,
                            color: COLORS.textTertiary,
                            fontFamily: 'DMSans_400Regular',
                          }}
                        >
                          {location}
                        </Text>
                      ) : null}
                      <Text
                        style={{
                          fontSize: 11,
                          color: COLORS.textTertiary,
                          fontFamily: 'DMSans_400Regular',
                          marginTop: 2,
                        }}
                      >
                        {submittedDate}
                      </Text>
                    </View>

                    {/* Status + chevron */}
                    <View style={{ alignItems: 'flex-end', gap: 8 }}>
                      <StatusBadge status={item.status} />
                      <ChevronRight size={16} color={COLORS.textTertiary} />
                    </View>
                  </View>
                </AnimatedPressable>
              </AnimatedListItem>
            );
          }}
        />
      )}
    </View>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  const bg = color + '14';
  const valueStr = String(value);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: bg,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: color + '28',
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: '700', color, fontFamily: 'DMSans_700Bold' }}>
        {valueStr}
      </Text>
      <Text style={{ fontSize: 11, color, fontFamily: 'DMSans_400Regular', marginTop: 2, opacity: 0.8 }}>
        {label}
      </Text>
    </View>
  );
}
