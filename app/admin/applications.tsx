import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Stack, router } from 'expo-router';
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

type StatusFilter = 'pending' | 'approved' | 'rejected';

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

interface Application {
  id: string;
  status: StatusFilter;
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

export default function ApplicationsListScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<StatusFilter>('pending');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async (status: StatusFilter) => {
    setError(null);
    const path = `/api/admin/applications?status=${status}`;
    console.log('[Applications] Fetching GET', path);
    try {
      const data = await api.get<Application[]>(path);
      console.log('[Applications] Fetched', data.length, status, 'applications');
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
    fetchApplications(activeTab).finally(() => setLoading(false));
  }, [activeTab, fetchApplications]);

  const handleRefresh = useCallback(async () => {
    console.log('[Applications] Pull-to-refresh, tab:', activeTab);
    setRefreshing(true);
    await fetchApplications(activeTab);
    setRefreshing(false);
  }, [fetchApplications, activeTab]);

  const handleTabPress = (tab: StatusFilter) => {
    console.log('[Applications] Tab pressed:', tab);
    setActiveTab(tab);
  };

  const handleCardPress = (item: Application) => {
    console.log('[Applications] Card tapped:', item.id, item.name);
    router.push(`/admin/application-detail?id=${item.id}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen
        options={{
          title: 'Therapist Applications',
          headerLargeTitle: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />

      {/* Segment control */}
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: 16,
          marginTop: 12,
          marginBottom: 8,
          backgroundColor: COLORS.surfaceSecondary,
          borderRadius: 12,
          borderCurve: 'continuous',
          padding: 3,
          gap: 2,
        }}
      >
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handleTabPress(tab.key)}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: isActive ? COLORS.surface : 'transparent',
                alignItems: 'center',
                shadowColor: isActive ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isActive ? 0.08 : 0,
                shadowRadius: 2,
                elevation: isActive ? 2 : 0,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? '600' : '400',
                  color: isActive ? COLORS.text : COLORS.textSecondary,
                  fontFamily: isActive ? 'DMSans_600SemiBold' : 'DMSans_400Regular',
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text
            style={{
              fontSize: 15,
              color: COLORS.danger,
              fontFamily: 'DMSans_400Regular',
              textAlign: 'center',
            }}
          >
            {error}
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Applications] Retry pressed');
              setLoading(true);
              fetchApplications(activeTab).finally(() => setLoading(false));
            }}
            style={{ marginTop: 16 }}
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
                Retry
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
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
                No {activeTab} applications
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
                {activeTab === 'pending'
                  ? 'New applications will appear here for review.'
                  : `No applications have been ${activeTab} yet.`}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const location = item.city ?? item.location ?? '';
            const submittedDate = new Date(item.created_at).toLocaleDateString('en-CA', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const initial = item.name ? item.name.charAt(0).toUpperCase() : '?';
            return (
              <AnimatedPressable
                onPress={() => handleCardPress(item)}
                scaleValue={0.98}
              >
                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    marginBottom: 10,
                    borderRadius: 16,
                    borderCurve: 'continuous',
                    padding: 16,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
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
            );
          }}
        />
      )}
    </View>
  );
}
