import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import { Clock, CheckCircle, XCircle, ChevronRight, ShieldOff } from 'lucide-react-native';
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

interface Application {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  name: string;
  title: string;
  location: string;
  email: string;
  created_at: string;
}

const STATUS_TABS = [
  { key: undefined, label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
] as const;

type StatusFilter = 'pending' | 'approved' | 'rejected' | undefined;

function getStatusColor(status: string) {
  if (status === 'approved') return COLORS.success;
  if (status === 'rejected') return COLORS.danger;
  return COLORS.warning;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'approved') return <CheckCircle size={14} color={COLORS.success} />;
  if (status === 'rejected') return <XCircle size={14} color={COLORS.danger} />;
  return <Clock size={14} color={COLORS.warning} />;
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async (status?: StatusFilter) => {
    setError(null);
    const path = status
      ? `/api/admin/applications?status=${status}`
      : '/api/admin/applications';
    console.log('[Admin] Fetching applications, path:', path);
    try {
      const data = await api.get<Application[]>(path);
      console.log('[Admin] Fetched', data.length, 'applications');
      setApplications(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load applications.';
      console.error('[Admin] Fetch error:', msg);
      setError(msg);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      setLoading(true);
      fetchApplications(statusFilter).finally(() => setLoading(false));
    }
  }, [authLoading, statusFilter, fetchApplications]);

  const handleRefresh = useCallback(async () => {
    console.log('[Admin] Pull-to-refresh triggered');
    setRefreshing(true);
    await fetchApplications(statusFilter);
    setRefreshing(false);
  }, [fetchApplications, statusFilter]);

  const handleFilterChange = (key: StatusFilter) => {
    console.log('[Admin] Filter changed to:', key ?? 'all');
    setStatusFilter(key);
  };

  const handleApplicationPress = (id: string, name: string) => {
    console.log('[Admin] Application tapped:', id, name);
    router.push(`/admin/application/${id}`);
  };

  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: 'Admin', headerBackButtonDisplayMode: 'minimal' }} />
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Stack.Screen options={{ title: 'Admin', headerBackButtonDisplayMode: 'minimal' }} />
        <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', marginBottom: 12, textAlign: 'center' }}>
          Sign in required
        </Text>
        <AnimatedPressable onPress={() => {
          console.log('[Admin] Sign in button pressed');
          router.push('/auth-screen');
        }}>
          <View style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>Sign In</Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  if (user.role !== 'admin') {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Stack.Screen options={{ title: 'Admin', headerBackButtonDisplayMode: 'minimal' }} />
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            backgroundColor: '#FEF2F2',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <ShieldOff size={32} color={COLORS.danger} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold', marginBottom: 8, textAlign: 'center' }}>
          Access Denied
        </Text>
        <Text style={{ fontSize: 15, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 22 }}>
          You don't have admin privileges to view this page.
        </Text>
      </View>
    );
  }

  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen
        options={{
          title: 'Admin Dashboard',
          headerLargeTitle: true,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />

      <FlatList
        data={applications}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        ListHeaderComponent={
          <View>
            {/* Stats row */}
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
              <StatCard label="Pending" value={pendingCount} color={COLORS.warning} />
              <StatCard label="Approved" value={approvedCount} color={COLORS.success} />
              <StatCard label="Rejected" value={rejectedCount} color={COLORS.danger} />
            </View>

            {/* Status filter tabs */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
              {STATUS_TABS.map((tab) => {
                const isActive = statusFilter === tab.key;
                return (
                  <AnimatedPressable
                    key={String(tab.key)}
                    onPress={() => handleFilterChange(tab.key)}
                    scaleValue={0.95}
                  >
                    <View
                      style={{
                        paddingHorizontal: 14,
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
            </View>

            {loading ? (
              <View style={{ paddingTop: 60, alignItems: 'center' }}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : error ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 15, color: COLORS.danger, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>
                  {error}
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View style={{ paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 }}>
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
                <CheckCircle size={28} color={COLORS.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', marginBottom: 8, textAlign: 'center' }}>
                No applications
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20 }}>
                {statusFilter ? `No ${statusFilter} applications found.` : 'No applications have been submitted yet.'}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => {
          const sc = getStatusColor(item.status);
          const submittedDate = new Date(item.created_at).toLocaleDateString('en-CA');
          return (
            <AnimatedPressable
              onPress={() => handleApplicationPress(item.id, item.name)}
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
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {/* Initials avatar */}
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: COLORS.primaryMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.primary, fontFamily: 'DMSans_700Bold' }}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
                    {item.location}
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
                    {submittedDate}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: sc + '18',
                      borderRadius: 20,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}
                  >
                    <StatusIcon status={item.status} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: sc, fontFamily: 'DMSans_600SemiBold', textTransform: 'capitalize' }}>
                      {item.status}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={COLORS.textTertiary} />
                </View>
              </View>
            </AnimatedPressable>
          );
        }}
      />
    </View>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        borderCurve: 'continuous',
        padding: 14,
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <Text style={{ fontSize: 26, fontWeight: '700', color, fontFamily: 'DMSans_700Bold', fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
        {label}
      </Text>
    </View>
  );
}
