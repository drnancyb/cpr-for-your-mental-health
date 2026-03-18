import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import {
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  ShieldOff,
  Plus,
  Pencil,
  Trash2,
  UserRound,
} from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

interface Therapist {
  id: string;
  name: string;
  title: string;
  location: string;
  photo_url?: string;
  gender: string;
  bio: string;
  specialties: string[];
  therapy_types: string[];
  insurances: string[];
  languages: string[];
  session_fee: number;
  years_experience: number;
  phone: string;
  email: string;
  website_url?: string;
}

const STATUS_TABS = [
  { key: undefined, label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
] as const;

type StatusFilter = 'pending' | 'approved' | 'rejected' | undefined;
type MainTab = 'applications' | 'therapists';

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

  // Main tab state
  const [mainTab, setMainTab] = useState<MainTab>('applications');

  // Applications state
  const [applications, setApplications] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsRefreshing, setAppsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [appsError, setAppsError] = useState<string | null>(null);

  // Therapists state
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [therapistsLoading, setTherapistsLoading] = useState(false);
  const [therapistsRefreshing, setTherapistsRefreshing] = useState(false);
  const [therapistsError, setTherapistsError] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Therapist | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Applications ──────────────────────────────────────────────────────────

  const fetchApplications = useCallback(async (status?: StatusFilter) => {
    setAppsError(null);
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
      console.error('[Admin] Fetch applications error:', msg);
      setAppsError(msg);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      setAppsLoading(true);
      fetchApplications(statusFilter).finally(() => setAppsLoading(false));
    }
  }, [authLoading, statusFilter, fetchApplications]);

  const handleAppsRefresh = useCallback(async () => {
    console.log('[Admin] Applications pull-to-refresh');
    setAppsRefreshing(true);
    await fetchApplications(statusFilter);
    setAppsRefreshing(false);
  }, [fetchApplications, statusFilter]);

  // ── Therapists ────────────────────────────────────────────────────────────

  const fetchTherapists = useCallback(async () => {
    setTherapistsError(null);
    console.log('[Admin] Fetching therapists GET /api/therapists');
    try {
      const data = await api.get<Therapist[]>('/api/therapists');
      console.log('[Admin] Fetched', data.length, 'therapists');
      setTherapists(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load therapists.';
      console.error('[Admin] Fetch therapists error:', msg);
      setTherapistsError(msg);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && mainTab === 'therapists' && therapists.length === 0 && !therapistsError) {
      setTherapistsLoading(true);
      fetchTherapists().finally(() => setTherapistsLoading(false));
    }
  }, [authLoading, mainTab, therapists.length, therapistsError, fetchTherapists]);

  const handleTherapistsRefresh = useCallback(async () => {
    console.log('[Admin] Therapists pull-to-refresh');
    setTherapistsRefreshing(true);
    await fetchTherapists();
    setTherapistsRefreshing(false);
  }, [fetchTherapists]);

  // ── Edit / Delete ─────────────────────────────────────────────────────────

  const handleEditTherapist = (t: Therapist) => {
    console.log('[Admin] Edit therapist pressed:', t.id, t.name);
    router.push({
      pathname: '/admin/add-therapist',
      params: {
        id: t.id,
        name: t.name,
        title: t.title,
        photo_url: t.photo_url ?? '',
        gender: t.gender,
        location: t.location,
        years_experience: String(t.years_experience),
        session_fee: String(t.session_fee),
        phone: t.phone,
        email: t.email,
        website_url: t.website_url ?? '',
        bio: t.bio,
        languages: JSON.stringify(t.languages),
        specialties: JSON.stringify(t.specialties),
        therapy_types: JSON.stringify(t.therapy_types),
        insurances: JSON.stringify(t.insurances),
      },
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    console.log('[Admin] Delete therapist confirmed:', deleteTarget.id, deleteTarget.name);
    setDeleting(true);
    try {
      await api.delete(`/api/admin/therapists/${deleteTarget.id}`);
      console.log('[Admin] Therapist deleted:', deleteTarget.id);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTherapists((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to delete therapist.';
      console.error('[Admin] Delete error:', msg);
      setTherapistsError(msg);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // ── Auth guards ───────────────────────────────────────────────────────────

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
        <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
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

  // ── Derived values ────────────────────────────────────────────────────────

  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen
        options={{
          title: 'Admin Dashboard',
          headerLargeTitle: true,
          headerBackButtonDisplayMode: 'minimal',
          headerRight: () => (
            <AnimatedPressable
              onPress={() => {
                console.log('[Admin] Add therapist button pressed');
                router.push('/admin/add-therapist');
              }}
              scaleValue={0.9}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: COLORS.primaryMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={18} color={COLORS.primary} strokeWidth={2.5} />
              </View>
            </AnimatedPressable>
          ),
        }}
      />

      {/* Main tabs */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 4,
          gap: 8,
          backgroundColor: COLORS.background,
        }}
      >
        <MainTabButton
          label="Applications"
          active={mainTab === 'applications'}
          onPress={() => {
            console.log('[Admin] Main tab: Applications');
            setMainTab('applications');
          }}
        />
        <MainTabButton
          label="Therapists"
          active={mainTab === 'therapists'}
          onPress={() => {
            console.log('[Admin] Main tab: Therapists');
            setMainTab('therapists');
          }}
        />
      </View>

      {mainTab === 'applications' ? (
        <FlatList
          data={applications}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={appsRefreshing} onRefresh={handleAppsRefresh} tintColor={COLORS.primary} />
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
                      onPress={() => {
                        console.log('[Admin] Status filter:', tab.key ?? 'all');
                        setStatusFilter(tab.key);
                      }}
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

              {appsLoading ? (
                <View style={{ paddingTop: 60, alignItems: 'center' }}>
                  <ActivityIndicator color={COLORS.primary} />
                </View>
              ) : appsError ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, color: COLORS.danger, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>
                    {appsError}
                  </Text>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            !appsLoading && !appsError ? (
              <View style={{ paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 }}>
                <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
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
          renderItem={({ item }) => {
            const sc = getStatusColor(item.status);
            const submittedDate = new Date(item.created_at).toLocaleDateString('en-CA');
            return (
              <AnimatedPressable
                onPress={() => {
                  console.log('[Admin] Application tapped:', item.id, item.name);
                  router.push(`/admin/application/${item.id}`);
                }}
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
                  }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: sc + '18', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
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
      ) : (
        <FlatList
          data={therapists}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={therapistsRefreshing} onRefresh={handleTherapistsRefresh} tintColor={COLORS.primary} />
          }
          ListHeaderComponent={
            therapistsLoading ? (
              <View style={{ paddingTop: 60, alignItems: 'center' }}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : therapistsError ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 15, color: COLORS.danger, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>
                  {therapistsError}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !therapistsLoading && !therapistsError ? (
              <View style={{ paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 }}>
                <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <UserRound size={28} color={COLORS.primary} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', marginBottom: 8, textAlign: 'center' }}>
                  No therapists yet
                </Text>
                <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20 }}>
                  Tap the + button to add the first therapist.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <TherapistRow
              therapist={item}
              onEdit={() => handleEditTherapist(item)}
              onDelete={() => {
                console.log('[Admin] Delete therapist pressed:', item.id, item.name);
                setDeleteTarget(item);
              }}
            />
          )}
        />
      )}

      {/* Delete confirmation modal */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 20,
              borderCurve: 'continuous',
              padding: 24,
              width: '100%',
              maxWidth: 360,
            }}
          >
            <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Trash2 size={24} color={COLORS.danger} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold', marginBottom: 8 }}>
              Delete therapist?
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', lineHeight: 20, marginBottom: 24 }}>
              This will permanently remove them from the app.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Admin] Delete modal: Cancel pressed');
                  setDeleteTarget(null);
                }}
                scaleValue={0.96}
                style={{ flex: 1 }}
              >
                <View
                  style={{
                    height: 46,
                    borderRadius: 12,
                    backgroundColor: COLORS.surfaceSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>
                    Cancel
                  </Text>
                </View>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={handleDeleteConfirm}
                disabled={deleting}
                scaleValue={0.96}
                style={{ flex: 1 }}
              >
                <View
                  style={{
                    height: 46,
                    borderRadius: 12,
                    backgroundColor: COLORS.danger,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                  }}
                >
                  {deleting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>
                      Delete therapist
                    </Text>
                  )}
                </View>
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MainTabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <AnimatedPressable onPress={onPress} scaleValue={0.95}>
      <View
        style={{
          paddingHorizontal: 18,
          paddingVertical: 9,
          borderRadius: 20,
          backgroundColor: active ? COLORS.primary : COLORS.surface,
          borderWidth: 1,
          borderColor: active ? COLORS.primary : COLORS.border,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: active ? '#fff' : COLORS.textSecondary,
            fontFamily: 'DMSans_600SemiBold',
          }}
        >
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

function TherapistRow({
  therapist,
  onEdit,
  onDelete,
}: {
  therapist: Therapist;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const initials = therapist.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 16,
        borderCurve: 'continuous',
        padding: 14,
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
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {therapist.photo_url ? (
          <Image
            source={{ uri: therapist.photo_url }}
            style={{ width: 46, height: 46, borderRadius: 23 }}
          />
        ) : (
          <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.primary, fontFamily: 'DMSans_700Bold' }}>
            {initials}
          </Text>
        )}
      </View>

      {/* Info */}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }} numberOfLines={1}>
          {therapist.name}
        </Text>
        <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }} numberOfLines={1}>
          {therapist.title}
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
          {therapist.location}
        </Text>
      </View>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <AnimatedPressable onPress={onEdit} scaleValue={0.88}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Pencil size={16} color={COLORS.primary} strokeWidth={2} />
          </View>
        </AnimatedPressable>
        <AnimatedPressable onPress={onDelete} scaleValue={0.88}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: '#FEF2F2',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Trash2 size={16} color={COLORS.danger} strokeWidth={2} />
          </View>
        </AnimatedPressable>
      </View>
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
