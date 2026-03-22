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
  TextInput,
  TouchableOpacity,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack, router, Redirect } from 'expo-router';
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
  BarChart2,
  CreditCard,
  Bell,
  Users,
  Stethoscope,
  Calendar,
  Eye,
  Search,
  X,
  FileText,
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

// ── Support types ─────────────────────────────────────────────────────────────

interface AdminSupportRequest {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'therapist' | 'other';
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
}

// ── Analytics types ───────────────────────────────────────────────────────────

interface AnalyticsData {
  total_users: number;
  total_therapists: number;
  active_therapists: number;
  total_bookings: number;
  pending_applications: number;
  profile_views_7d: number;
  searches_7d: number;
  top_specialties: { specialty: string; count: number }[];
  bookings_by_status: { pending: number; confirmed: number; declined: number };
}

// ── Subscription types ────────────────────────────────────────────────────────

interface AdminSubscription {
  id: string;
  therapist_id: string;
  therapist_name: string;
  therapist_title: string;
  plan: 'featured' | 'premium';
  status: 'active' | 'expired' | 'cancelled';
  amount_paid: number;
  expires_at?: string;
  notes?: string;
  created_at: string;
}

// ── Notification types ────────────────────────────────────────────────────────

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  target: 'all' | 'featured' | 'free';
  recipient_count: number;
  sent_at: string;
}

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
  accepting_new_clients: boolean;
}

const STATUS_TABS = [
  { key: undefined, label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
] as const;

type StatusFilter = 'pending' | 'approved' | 'rejected' | undefined;
type MainTab = 'applications' | 'therapists' | 'bookings' | 'analytics' | 'subscriptions' | 'notifications' | 'support' | 'contact';

interface AdminBooking {
  id: string;
  therapist_id: string;
  user_id: string;
  preferred_date?: string;
  message: string;
  contact_method: 'email' | 'phone';
  status: 'pending' | 'confirmed' | 'declined';
  admin_notes?: string;
  created_at: string;
  therapist: {
    id: string;
    name: string;
    title: string;
    photo_url: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

function getStatusColor(status: string) {
  if (status === 'approved' || status === 'active' || status === 'confirmed') return COLORS.success;
  if (status === 'rejected' || status === 'expired' || status === 'declined') return COLORS.danger;
  if (status === 'cancelled') return COLORS.textTertiary;
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

  // Bookings state
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsRefreshing, setBookingsRefreshing] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<AdminBooking | null>(null);
  const [declineNotes, setDeclineNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Analytics state
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsError, setSubsError] = useState<string | null>(null);
  const [showAddSub, setShowAddSub] = useState(false);
  const [editSub, setEditSub] = useState<AdminSubscription | null>(null);
  const [subForm, setSubForm] = useState({ therapist_id: '', therapist_name: '', plan: 'featured' as 'featured' | 'premium', status: 'active' as 'active' | 'expired' | 'cancelled', amount_paid: '', expires_at: '', notes: '' });
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [subSearchResults, setSubSearchResults] = useState<Therapist[]>([]);
  const [subSubmitting, setSubSubmitting] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [notifsError, setNotifsError] = useState<string | null>(null);
  const [showSendNotif, setShowSendNotif] = useState(false);
  const [notifForm, setNotifForm] = useState({ title: '', message: '', target: 'all' as 'all' | 'featured' | 'free' });
  const [notifSubmitting, setNotifSubmitting] = useState(false);

  // Support state
  const [supportRequests, setSupportRequests] = useState<AdminSupportRequest[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportRefreshing, setSupportRefreshing] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [expandedSupportId, setExpandedSupportId] = useState<string | null>(null);
  const [supportActionLoading, setSupportActionLoading] = useState<string | null>(null);

  // ── Support ───────────────────────────────────────────────────────────────

  const fetchSupportRequests = useCallback(async () => {
    setSupportError(null);
    console.log('[Admin] Fetching support requests GET /api/admin/support');
    try {
      const data = await api.get<AdminSupportRequest[]>('/api/admin/support');
      console.log('[Admin] Fetched', data.length, 'support requests');
      setSupportRequests(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load support requests.';
      console.error('[Admin] Fetch support error:', msg);
      setSupportError(msg);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && mainTab === 'support' && supportRequests.length === 0 && !supportError) {
      setSupportLoading(true);
      fetchSupportRequests().finally(() => setSupportLoading(false));
    }
  }, [authLoading, mainTab, supportRequests.length, supportError, fetchSupportRequests]);

  const handleSupportRefresh = useCallback(async () => {
    console.log('[Admin] Support pull-to-refresh');
    setSupportRefreshing(true);
    await fetchSupportRequests();
    setSupportRefreshing(false);
  }, [fetchSupportRequests]);

  const handleSupportStatusUpdate = useCallback(async (id: string, status: 'in_progress' | 'resolved') => {
    console.log('[Admin] Update support status:', id, status);
    setSupportActionLoading(id + '_' + status);
    try {
      const updated = await api.patch<AdminSupportRequest>(`/api/admin/support/${id}`, { status });
      console.log('[Admin] Support request updated:', id, status);
      setSupportRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: updated.status } : r));
    } catch (e) {
      console.error('[Admin] Support status update error:', e instanceof Error ? e.message : e);
    } finally {
      setSupportActionLoading(null);
    }
  }, []);

  // ── Analytics ─────────────────────────────────────────────────────────────

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsError(null);
    console.log('[Admin] Fetching analytics GET /api/admin/analytics');
    try {
      const data = await api.get<AnalyticsData>('/api/admin/analytics');
      console.log('[Admin] Analytics fetched');
      setAnalytics(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load analytics.';
      console.error('[Admin] Fetch analytics error:', msg);
      setAnalyticsError(msg);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && mainTab === 'analytics' && !analytics && !analyticsError) {
      setAnalyticsLoading(true);
      fetchAnalytics().finally(() => setAnalyticsLoading(false));
    }
  }, [authLoading, mainTab, analytics, analyticsError, fetchAnalytics]);

  // ── Subscriptions ─────────────────────────────────────────────────────────

  const fetchSubscriptions = useCallback(async () => {
    setSubsError(null);
    console.log('[Admin] Fetching subscriptions GET /api/admin/subscriptions');
    try {
      const data = await api.get<AdminSubscription[]>('/api/admin/subscriptions');
      console.log('[Admin] Fetched', data.length, 'subscriptions');
      setSubscriptions(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load subscriptions.';
      console.error('[Admin] Fetch subscriptions error:', msg);
      setSubsError(msg);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && mainTab === 'subscriptions' && subscriptions.length === 0 && !subsError) {
      setSubsLoading(true);
      fetchSubscriptions().finally(() => setSubsLoading(false));
    }
  }, [authLoading, mainTab, subscriptions.length, subsError, fetchSubscriptions]);

  const searchTherapistsForSub = useCallback(async (q: string) => {
    if (!q.trim()) { setSubSearchResults([]); return; }
    console.log('[Admin] Searching therapists for sub:', q);
    try {
      const data = await api.get<{ therapists: Therapist[]; total: number }>(`/api/therapists?search=${encodeURIComponent(q)}`);
      setSubSearchResults(data.therapists.slice(0, 5));
    } catch {
      setSubSearchResults([]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchTherapistsForSub(subSearchQuery), 300);
    return () => clearTimeout(t);
  }, [subSearchQuery, searchTherapistsForSub]);

  const openAddSub = () => {
    console.log('[Admin] Open add subscription modal');
    setSubForm({ therapist_id: '', therapist_name: '', plan: 'featured', status: 'active', amount_paid: '', expires_at: '', notes: '' });
    setSubSearchQuery('');
    setSubSearchResults([]);
    setEditSub(null);
    setShowAddSub(true);
  };

  const openEditSub = (sub: AdminSubscription) => {
    console.log('[Admin] Open edit subscription modal:', sub.id);
    setSubForm({
      therapist_id: sub.therapist_id,
      therapist_name: sub.therapist_name,
      plan: sub.plan,
      status: sub.status,
      amount_paid: String(sub.amount_paid),
      expires_at: sub.expires_at ?? '',
      notes: sub.notes ?? '',
    });
    setSubSearchQuery(sub.therapist_name);
    setSubSearchResults([]);
    setEditSub(sub);
    setShowAddSub(true);
  };

  const handleSubSubmit = async () => {
    if (!subForm.therapist_id) return;
    console.log('[Admin] Submit subscription, editing:', editSub?.id ?? 'new');
    setSubSubmitting(true);
    try {
      const body = {
        therapist_id: subForm.therapist_id,
        plan: subForm.plan,
        status: subForm.status,
        amount_paid: Number(subForm.amount_paid) || 0,
        expires_at: subForm.expires_at || undefined,
        notes: subForm.notes || undefined,
      };
      if (editSub) {
        const updated = await api.patch<AdminSubscription>(`/api/admin/subscriptions/${editSub.id}`, body);
        console.log('[Admin] Subscription updated:', editSub.id);
        setSubscriptions((prev) => prev.map((s) => s.id === editSub.id ? updated : s));
      } else {
        const created = await api.post<AdminSubscription>('/api/admin/subscriptions', body);
        console.log('[Admin] Subscription created:', created.id);
        setSubscriptions((prev) => [created, ...prev]);
      }
      setShowAddSub(false);
    } catch (e) {
      console.error('[Admin] Sub submit error:', e instanceof Error ? e.message : e);
    } finally {
      setSubSubmitting(false);
    }
  };

  // ── Notifications ─────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    setNotifsError(null);
    console.log('[Admin] Fetching notifications GET /api/admin/notifications');
    try {
      const data = await api.get<AdminNotification[]>('/api/admin/notifications');
      console.log('[Admin] Fetched', data.length, 'notifications');
      setNotifications(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load notifications.';
      console.error('[Admin] Fetch notifications error:', msg);
      setNotifsError(msg);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && mainTab === 'notifications' && notifications.length === 0 && !notifsError) {
      setNotifsLoading(true);
      fetchNotifications().finally(() => setNotifsLoading(false));
    }
  }, [authLoading, mainTab, notifications.length, notifsError, fetchNotifications]);

  const handleSendNotification = async () => {
    if (!notifForm.title.trim() || !notifForm.message.trim()) return;
    console.log('[Admin] Send notification pressed, target:', notifForm.target);
    setNotifSubmitting(true);
    try {
      const created = await api.post<AdminNotification>('/api/admin/notifications', {
        title: notifForm.title.trim(),
        message: notifForm.message.trim(),
        target: notifForm.target,
      });
      console.log('[Admin] Notification sent:', created.id);
      setNotifications((prev) => [created, ...prev]);
      setShowSendNotif(false);
      setNotifForm({ title: '', message: '', target: 'all' });
    } catch (e) {
      console.error('[Admin] Send notification error:', e instanceof Error ? e.message : e);
    } finally {
      setNotifSubmitting(false);
    }
  };

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
      const data = await api.get<{ therapists: Therapist[]; total: number }>('/api/therapists');
      console.log('[Admin] Fetched', data.therapists.length, 'therapists');
      setTherapists(data.therapists);
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

  // ── Bookings ──────────────────────────────────────────────────────────────

  const fetchBookings = useCallback(async () => {
    setBookingsError(null);
    console.log('[Admin] Fetching bookings GET /api/admin/bookings');
    try {
      const data = await api.get<{ bookings: AdminBooking[] }>('/api/admin/bookings');
      console.log('[Admin] Fetched', data.bookings.length, 'bookings');
      setBookings(data.bookings);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load bookings.';
      console.error('[Admin] Fetch bookings error:', msg);
      setBookingsError(msg);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && mainTab === 'bookings' && bookings.length === 0 && !bookingsError) {
      setBookingsLoading(true);
      fetchBookings().finally(() => setBookingsLoading(false));
    }
  }, [authLoading, mainTab, bookings.length, bookingsError, fetchBookings]);

  const handleBookingsRefresh = useCallback(async () => {
    console.log('[Admin] Bookings pull-to-refresh');
    setBookingsRefreshing(true);
    await fetchBookings();
    setBookingsRefreshing(false);
  }, [fetchBookings]);

  const handleConfirmBooking = useCallback(async (booking: AdminBooking) => {
    console.log('[Admin] Confirm booking pressed:', booking.id);
    setActionLoading(booking.id + '_confirm');
    try {
      const updated = await api.patch<AdminBooking>(`/api/admin/bookings/${booking.id}`, { status: 'confirmed' });
      console.log('[Admin] Booking confirmed:', booking.id);
      setBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, status: updated.status } : b));
    } catch (e) {
      console.error('[Admin] Confirm booking error:', e instanceof Error ? e.message : e);
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleDeclineSubmit = useCallback(async () => {
    if (!declineTarget) return;
    console.log('[Admin] Decline booking submitted:', declineTarget.id, 'notes:', declineNotes);
    setActionLoading(declineTarget.id + '_decline');
    try {
      const body: { status: string; admin_notes?: string } = { status: 'declined' };
      if (declineNotes.trim()) body.admin_notes = declineNotes.trim();
      const updated = await api.patch<AdminBooking>(`/api/admin/bookings/${declineTarget.id}`, body);
      console.log('[Admin] Booking declined:', declineTarget.id);
      setBookings((prev) => prev.map((b) => b.id === declineTarget.id ? { ...b, status: updated.status, admin_notes: updated.admin_notes } : b));
      setDeclineTarget(null);
      setDeclineNotes('');
    } catch (e) {
      console.error('[Admin] Decline booking error:', e instanceof Error ? e.message : e);
    } finally {
      setActionLoading(null);
    }
  }, [declineTarget, declineNotes]);

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
        accepting_new_clients: String(t.accepting_new_clients),
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
    console.log('[Admin] No user — redirecting to /admin-login');
    return <Redirect href="/admin-login" />;
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
          headerLargeTitle: false,
          headerBackButtonDisplayMode: 'minimal',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Admin] Therapist Applications button pressed');
                  router.push('/admin/applications');
                }}
                scaleValue={0.9}
              >
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={17} color={COLORS.primary} strokeWidth={2} />
                </View>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Admin] Content button pressed');
                  router.push('/admin/content');
                }}
                scaleValue={0.9}
              >
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={17} color={COLORS.primary} strokeWidth={2} />
                </View>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Admin] Add therapist button pressed');
                  router.push('/admin/add-therapist');
                }}
                scaleValue={0.9}
              >
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={18} color={COLORS.primary} strokeWidth={2.5} />
                </View>
              </AnimatedPressable>
            </View>
          ),
        }}
      />

      {/* Main tabs — horizontally scrollable */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' }}
        style={{ backgroundColor: COLORS.background, flexGrow: 0, borderBottomWidth: 1, borderBottomColor: COLORS.border }}
      >
        <MainTabButton label="Applications" active={mainTab === 'applications'} onPress={() => { console.log('[Admin] Main tab: Applications'); setMainTab('applications'); }} />
        <MainTabButton label="Therapists" active={mainTab === 'therapists'} onPress={() => { console.log('[Admin] Main tab: Therapists'); setMainTab('therapists'); }} />
        <MainTabButton label="Bookings" active={mainTab === 'bookings'} onPress={() => { console.log('[Admin] Main tab: Bookings'); setMainTab('bookings'); }} />
        <MainTabButton label="Analytics" active={mainTab === 'analytics'} onPress={() => { console.log('[Admin] Main tab: Analytics'); setMainTab('analytics'); }} />
        <MainTabButton label="Subscriptions" active={mainTab === 'subscriptions'} onPress={() => { console.log('[Admin] Main tab: Subscriptions'); setMainTab('subscriptions'); }} />
        <MainTabButton label="Notifications" active={mainTab === 'notifications'} onPress={() => { console.log('[Admin] Main tab: Notifications'); setMainTab('notifications'); }} />
        <MainTabButton label="Support" active={mainTab === 'support'} onPress={() => { console.log('[Admin] Main tab: Support'); setMainTab('support'); }} />
        <MainTabButton label="Contact Messages" active={mainTab === 'contact'} onPress={() => { console.log('[Admin] Main tab: Contact Messages'); router.push('/admin/contact-messages'); }} />
      </ScrollView>

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
      ) : mainTab === 'therapists' ? (
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
      ) : mainTab === 'analytics' ? (
        <AnalyticsTab
          analytics={analytics}
          loading={analyticsLoading}
          error={analyticsError}
        />
      ) : mainTab === 'subscriptions' ? (
        <SubscriptionsTab
          subscriptions={subscriptions}
          loading={subsLoading}
          error={subsError}
          onAdd={openAddSub}
          onEdit={openEditSub}
        />
      ) : mainTab === 'notifications' ? (
        <NotificationsTab
          notifications={notifications}
          loading={notifsLoading}
          error={notifsError}
          onSend={() => {
            console.log('[Admin] Open send notification modal');
            setShowSendNotif(true);
          }}
        />
      ) : mainTab === 'support' ? (
        <FlatList
          data={supportRequests}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={supportRefreshing} onRefresh={handleSupportRefresh} tintColor={COLORS.primary} />
          }
          ListHeaderComponent={
            supportLoading ? (
              <View style={{ paddingTop: 60, alignItems: 'center' }}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : supportError ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 15, color: COLORS.danger, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>
                  {supportError}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !supportLoading && !supportError ? (
              <View style={{ paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 }}>
                <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Bell size={28} color={COLORS.primary} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', marginBottom: 8, textAlign: 'center' }}>
                  No support requests
                </Text>
                <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20 }}>
                  Support messages will appear here.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const isExpanded = expandedSupportId === item.id;
            const submittedDate = new Date(item.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
            const roleBg = item.role === 'therapist' ? COLORS.primaryMuted : item.role === 'client' ? '#EDE9FE' : COLORS.surfaceSecondary;
            const roleColor = item.role === 'therapist' ? COLORS.primary : item.role === 'client' ? '#7C3AED' : COLORS.textSecondary;
            const statusColor = item.status === 'resolved' ? COLORS.success : item.status === 'in_progress' ? '#3B82F6' : COLORS.warning;
            const statusBg = item.status === 'resolved' ? '#D1FAE5' : item.status === 'in_progress' ? '#DBEAFE' : '#FEF3C7';
            const statusLabel = item.status === 'in_progress' ? 'In Progress' : item.status.charAt(0).toUpperCase() + item.status.slice(1);
            const inProgressLoading = supportActionLoading === item.id + '_in_progress';
            const resolvedLoading = supportActionLoading === item.id + '_resolved';
            const msgPreview = item.message.length > 80 ? item.message.slice(0, 80) + '…' : item.message;

            return (
              <AnimatedPressable
                onPress={() => {
                  console.log('[Admin] Support card tapped:', item.id, 'expanded:', !isExpanded);
                  setExpandedSupportId(isExpanded ? null : item.id);
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
                    padding: 14,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  {/* Header row */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View style={{ backgroundColor: roleBg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: roleColor, fontFamily: 'DMSans_600SemiBold', textTransform: 'capitalize' }}>
                            {item.role}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
                        {item.email}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={{ backgroundColor: statusBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: statusColor, fontFamily: 'DMSans_600SemiBold' }}>
                          {statusLabel}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
                        {submittedDate}
                      </Text>
                    </View>
                  </View>

                  {/* Subject */}
                  <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', marginBottom: 4 }} numberOfLines={1}>
                    {item.subject}
                  </Text>

                  {/* Message preview or full */}
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', lineHeight: 18 }} numberOfLines={isExpanded ? undefined : 2}>
                    {isExpanded ? item.message : msgPreview}
                  </Text>

                  {/* Action buttons */}
                  {item.status !== 'resolved' ? (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                      {item.status === 'open' ? (
                        <AnimatedPressable
                          onPress={() => handleSupportStatusUpdate(item.id, 'in_progress')}
                          disabled={inProgressLoading || resolvedLoading}
                          scaleValue={0.96}
                          style={{ flex: 1 }}
                        >
                          <View style={{ height: 36, borderRadius: 10, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 }}>
                            {inProgressLoading ? (
                              <ActivityIndicator color="#3B82F6" size="small" />
                            ) : (
                              <Text style={{ fontSize: 12, fontWeight: '600', color: '#3B82F6', fontFamily: 'DMSans_600SemiBold' }}>Mark In Progress</Text>
                            )}
                          </View>
                        </AnimatedPressable>
                      ) : null}
                      <AnimatedPressable
                        onPress={() => handleSupportStatusUpdate(item.id, 'resolved')}
                        disabled={inProgressLoading || resolvedLoading}
                        scaleValue={0.96}
                        style={{ flex: 1 }}
                      >
                        <View style={{ height: 36, borderRadius: 10, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 }}>
                          {resolvedLoading ? (
                            <ActivityIndicator color={COLORS.success} size="small" />
                          ) : (
                            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.success, fontFamily: 'DMSans_600SemiBold' }}>Mark Resolved</Text>
                          )}
                        </View>
                      </AnimatedPressable>
                    </View>
                  ) : null}
                </View>
              </AnimatedPressable>
            );
          }}
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={bookingsRefreshing} onRefresh={handleBookingsRefresh} tintColor={COLORS.primary} />
          }
          ListHeaderComponent={
            bookingsLoading ? (
              <View style={{ paddingTop: 60, alignItems: 'center' }}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : bookingsError ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 15, color: COLORS.danger, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>
                  {bookingsError}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !bookingsLoading && !bookingsError ? (
              <View style={{ paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 }}>
                <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Clock size={28} color={COLORS.primary} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', marginBottom: 8, textAlign: 'center' }}>
                  No bookings yet
                </Text>
                <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20 }}>
                  Session requests will appear here.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const initials = item.therapist.name.split(' ').slice(0, 2).map((w: string) => w.charAt(0).toUpperCase()).join('');
            const isPending = item.status === 'pending';
            const confirmLoading = actionLoading === item.id + '_confirm';
            const declineLoading = actionLoading === item.id + '_decline';
            const dateDisplay = item.preferred_date
              ? new Date(item.preferred_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : null;
            const statusConfig = {
              pending: { color: COLORS.warning, bg: '#FEF3C7', label: 'Pending' },
              confirmed: { color: COLORS.success, bg: '#D1FAE5', label: 'Confirmed' },
              declined: { color: COLORS.danger, bg: '#FEE2E2', label: 'Declined' },
            }[item.status] ?? { color: COLORS.textTertiary, bg: COLORS.surfaceSecondary, label: item.status };
            const messagePreview = item.message.length > 60 ? item.message.slice(0, 60) + '…' : item.message;
            const userLabel = item.user ? item.user.name : item.user_id.slice(0, 8);

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
                }}
              >
                {/* Header row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {item.therapist.photo_url ? (
                      <Image source={{ uri: item.therapist.photo_url }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                    ) : (
                      <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.primary, fontFamily: 'DMSans_700Bold' }}>{initials}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }} numberOfLines={1}>
                      {item.therapist.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }} numberOfLines={1}>
                      {userLabel}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: statusConfig.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: statusConfig.color, fontFamily: 'DMSans_600SemiBold' }}>
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>

                {/* Date + contact */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                  {dateDisplay ? (
                    <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
                      {dateDisplay}
                    </Text>
                  ) : null}
                  <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular', textTransform: 'capitalize' }}>
                    {item.contact_method}
                  </Text>
                </View>

                {/* Message */}
                <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', lineHeight: 18, marginBottom: isPending ? 12 : 0 }}>
                  {messagePreview}
                </Text>

                {/* Action buttons for pending */}
                {isPending ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <AnimatedPressable
                      onPress={() => handleConfirmBooking(item)}
                      disabled={confirmLoading || declineLoading}
                      scaleValue={0.96}
                      style={{ flex: 1 }}
                    >
                      <View style={{ height: 38, borderRadius: 10, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                        {confirmLoading ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <CheckCircle size={14} color="#fff" />
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>Confirm</Text>
                          </>
                        )}
                      </View>
                    </AnimatedPressable>
                    <AnimatedPressable
                      onPress={() => {
                        console.log('[Admin] Decline button pressed for booking:', item.id);
                        setDeclineTarget(item);
                        setDeclineNotes('');
                      }}
                      disabled={confirmLoading || declineLoading}
                      scaleValue={0.96}
                      style={{ flex: 1 }}
                    >
                      <View style={{ height: 38, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                        {declineLoading ? (
                          <ActivityIndicator color={COLORS.danger} size="small" />
                        ) : (
                          <>
                            <XCircle size={14} color={COLORS.danger} />
                            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.danger, fontFamily: 'DMSans_600SemiBold' }}>Decline</Text>
                          </>
                        )}
                      </View>
                    </AnimatedPressable>
                  </View>
                ) : null}

                {/* Admin notes */}
                {item.admin_notes ? (
                  <View style={{ marginTop: 8, backgroundColor: COLORS.surfaceSecondary, borderRadius: 8, padding: 8 }}>
                    <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
                      {item.admin_notes}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          }}
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

      {/* Add/Edit Subscription modal */}
      <Modal visible={showAddSub} transparent animationType="slide" onRequestClose={() => setShowAddSub(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => setShowAddSub(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold' }}>{editSub ? 'Edit Subscription' : 'Add Subscription'}</Text>
                  <AnimatedPressable onPress={() => setShowAddSub(false)} scaleValue={0.9}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                      <X size={16} color={COLORS.textSecondary} />
                    </View>
                  </AnimatedPressable>
                </View>

                {/* Therapist search */}
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold', marginBottom: 6 }}>Therapist</Text>
                <TextInput
                  value={subSearchQuery}
                  onChangeText={(t) => { setSubSearchQuery(t); if (!editSub) setSubForm((f) => ({ ...f, therapist_id: '', therapist_name: '' })); }}
                  placeholder="Search therapist by name..."
                  placeholderTextColor={COLORS.textTertiary}
                  style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_400Regular', borderWidth: 1, borderColor: COLORS.border, marginBottom: 4 }}
                />
                {subSearchResults.length > 0 && !subForm.therapist_id && (
                  <View style={{ backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8, overflow: 'hidden' }}>
                    {subSearchResults.map((t) => (
                      <AnimatedPressable key={t.id} onPress={() => { console.log('[Admin] Therapist selected for sub:', t.id, t.name); setSubForm((f) => ({ ...f, therapist_id: t.id, therapist_name: t.name })); setSubSearchQuery(t.name); setSubSearchResults([]); }} scaleValue={0.97}>
                        <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>{t.name}</Text>
                          <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>{t.title}</Text>
                        </View>
                      </AnimatedPressable>
                    ))}
                  </View>
                )}

                {/* Plan */}
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold', marginBottom: 6, marginTop: 8 }}>Plan</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {(['featured', 'premium'] as const).map((p) => (
                    <AnimatedPressable key={p} onPress={() => { console.log('[Admin] Sub plan selected:', p); setSubForm((f) => ({ ...f, plan: p })); }} scaleValue={0.95} style={{ flex: 1 }}>
                      <View style={{ height: 40, borderRadius: 10, backgroundColor: subForm.plan === p ? COLORS.primary : COLORS.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: subForm.plan === p ? COLORS.primary : COLORS.border }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: subForm.plan === p ? '#fff' : COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold', textTransform: 'capitalize' }}>{p}</Text>
                      </View>
                    </AnimatedPressable>
                  ))}
                </View>

                {/* Status */}
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold', marginBottom: 6 }}>Status</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {(['active', 'expired', 'cancelled'] as const).map((s) => (
                    <AnimatedPressable key={s} onPress={() => { console.log('[Admin] Sub status selected:', s); setSubForm((f) => ({ ...f, status: s })); }} scaleValue={0.95} style={{ flex: 1 }}>
                      <View style={{ height: 40, borderRadius: 10, backgroundColor: subForm.status === s ? COLORS.primary : COLORS.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: subForm.status === s ? COLORS.primary : COLORS.border }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: subForm.status === s ? '#fff' : COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold', textTransform: 'capitalize' }}>{s}</Text>
                      </View>
                    </AnimatedPressable>
                  ))}
                </View>

                {/* Amount */}
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold', marginBottom: 6 }}>Amount Paid ($)</Text>
                <TextInput value={subForm.amount_paid} onChangeText={(t) => setSubForm((f) => ({ ...f, amount_paid: t }))} placeholder="0.00" placeholderTextColor={COLORS.textTertiary} keyboardType="decimal-pad" style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_400Regular', borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 }} />

                {/* Expires at */}
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold', marginBottom: 6 }}>Expires At (optional, YYYY-MM-DD)</Text>
                <TextInput value={subForm.expires_at} onChangeText={(t) => setSubForm((f) => ({ ...f, expires_at: t }))} placeholder="2025-12-31" placeholderTextColor={COLORS.textTertiary} style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_400Regular', borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 }} />

                {/* Notes */}
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold', marginBottom: 6 }}>Notes (optional)</Text>
                <TextInput value={subForm.notes} onChangeText={(t) => setSubForm((f) => ({ ...f, notes: t }))} placeholder="Internal notes..." placeholderTextColor={COLORS.textTertiary} multiline numberOfLines={2} textAlignVertical="top" style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_400Regular', borderWidth: 1, borderColor: COLORS.border, minHeight: 60, marginBottom: 20 }} />

                <AnimatedPressable onPress={handleSubSubmit} disabled={!subForm.therapist_id || subSubmitting} scaleValue={0.97}>
                  <View style={{ height: 52, borderRadius: 14, backgroundColor: subForm.therapist_id ? COLORS.primary : COLORS.textTertiary, alignItems: 'center', justifyContent: 'center' }}>
                    {subSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>{editSub ? 'Save Changes' : 'Add Subscription'}</Text>}
                  </View>
                </AnimatedPressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Send Notification modal */}
      <Modal visible={showSendNotif} transparent animationType="slide" onRequestClose={() => setShowSendNotif(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => setShowSendNotif(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold' }}>Send Notification</Text>
                  <AnimatedPressable onPress={() => setShowSendNotif(false)} scaleValue={0.9}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                      <X size={16} color={COLORS.textSecondary} />
                    </View>
                  </AnimatedPressable>
                </View>

                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold', marginBottom: 6 }}>Title</Text>
                <TextInput value={notifForm.title} onChangeText={(t) => setNotifForm((f) => ({ ...f, title: t }))} placeholder="Notification title..." placeholderTextColor={COLORS.textTertiary} style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_400Regular', borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 }} />

                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold', marginBottom: 6 }}>Message</Text>
                <TextInput value={notifForm.message} onChangeText={(t) => setNotifForm((f) => ({ ...f, message: t }))} placeholder="Notification message..." placeholderTextColor={COLORS.textTertiary} multiline numberOfLines={4} textAlignVertical="top" style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_400Regular', borderWidth: 1, borderColor: COLORS.border, minHeight: 90, marginBottom: 12 }} />

                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold', marginBottom: 6 }}>Target</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {([['all', 'All Therapists'], ['featured', 'Featured'], ['free', 'Free']] as const).map(([val, lbl]) => (
                    <AnimatedPressable key={val} onPress={() => { console.log('[Admin] Notif target selected:', val); setNotifForm((f) => ({ ...f, target: val })); }} scaleValue={0.95} style={{ flex: 1 }}>
                      <View style={{ height: 40, borderRadius: 10, backgroundColor: notifForm.target === val ? COLORS.primary : COLORS.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: notifForm.target === val ? COLORS.primary : COLORS.border }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: notifForm.target === val ? '#fff' : COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>{lbl}</Text>
                      </View>
                    </AnimatedPressable>
                  ))}
                </View>

                <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 10, padding: 10, marginBottom: 20 }}>
                  <Text style={{ fontSize: 13, color: COLORS.primary, fontFamily: 'DMSans_400Regular' }}>Sends to all therapists in the directory</Text>
                </View>

                <AnimatedPressable onPress={handleSendNotification} disabled={!notifForm.title.trim() || !notifForm.message.trim() || notifSubmitting} scaleValue={0.97}>
                  <View style={{ height: 52, borderRadius: 14, backgroundColor: notifForm.title.trim() && notifForm.message.trim() ? COLORS.primary : COLORS.textTertiary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                    {notifSubmitting ? <ActivityIndicator color="#fff" /> : <><Bell size={18} color="#fff" /><Text style={{ fontSize: 16, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>Send</Text></>}
                  </View>
                </AnimatedPressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Decline booking modal */}
      <Modal
        visible={!!declineTarget}
        transparent
        animationType="fade"
        onRequestClose={() => { setDeclineTarget(null); setDeclineNotes(''); }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{ backgroundColor: COLORS.surface, borderRadius: 20, borderCurve: 'continuous', padding: 24, width: '100%', maxWidth: 360 }}>
            <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <XCircle size={24} color={COLORS.danger} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold', marginBottom: 4 }}>
              Decline booking?
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', lineHeight: 20, marginBottom: 16 }}>
              Optionally add a note for the user.
            </Text>
            <TextInput
              value={declineNotes}
              onChangeText={setDeclineNotes}
              placeholder="Optional notes..."
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                padding: 12,
                fontSize: 14,
                color: COLORS.text,
                fontFamily: 'DMSans_400Regular',
                minHeight: 80,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Admin] Decline modal: Cancel pressed');
                  setDeclineTarget(null);
                  setDeclineNotes('');
                }}
                scaleValue={0.96}
                style={{ flex: 1 }}
              >
                <View style={{ height: 46, borderRadius: 12, backgroundColor: COLORS.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>Cancel</Text>
                </View>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={handleDeclineSubmit}
                disabled={actionLoading !== null}
                scaleValue={0.96}
                style={{ flex: 1 }}
              >
                <View style={{ height: 46, borderRadius: 12, backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                  {actionLoading !== null ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>Decline</Text>
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
        <Text style={{ fontSize: 14, fontWeight: '600', color: active ? '#fff' : COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

function TherapistRow({ therapist, onEdit, onDelete }: { therapist: Therapist; onEdit: () => void; onDelete: () => void }) {
  const initials = therapist.name.split(' ').slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');
  return (
    <View style={{ backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 10, borderRadius: 16, borderCurve: 'continuous', padding: 14, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
        {therapist.photo_url ? (
          <Image source={{ uri: therapist.photo_url }} style={{ width: 46, height: 46, borderRadius: 23 }} />
        ) : (
          <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.primary, fontFamily: 'DMSans_700Bold' }}>{initials}</Text>
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }} numberOfLines={1}>{therapist.name}</Text>
        <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }} numberOfLines={1}>{therapist.title}</Text>
        <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>{therapist.location}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <AnimatedPressable onPress={onEdit} scaleValue={0.88}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
            <Pencil size={16} color={COLORS.primary} strokeWidth={2} />
          </View>
        </AnimatedPressable>
        <AnimatedPressable onPress={onDelete} scaleValue={0.88}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={16} color={COLORS.danger} strokeWidth={2} />
          </View>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, borderCurve: 'continuous', padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: COLORS.border }}>
      <Text style={{ fontSize: 26, fontWeight: '700', color, fontFamily: 'DMSans_700Bold', fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>{label}</Text>
    </View>
  );
}

function SkeletonCard() {
  return (
    <View style={{ backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border }}>
      <View style={{ height: 14, width: '60%', backgroundColor: COLORS.surfaceSecondary, borderRadius: 7, marginBottom: 8 }} />
      <View style={{ height: 12, width: '40%', backgroundColor: COLORS.surfaceSecondary, borderRadius: 6 }} />
    </View>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────

function AnalyticsTab({ analytics, loading, error }: { analytics: AnalyticsData | null; loading: boolean; error: string | null }) {
  if (loading) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 12 }}>
        {[1,2,3,4].map((i) => <SkeletonCard key={i} />)}
      </ScrollView>
    );
  }
  if (error) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}><Text style={{ color: COLORS.danger, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>{error}</Text></View>;
  }
  if (!analytics) return null;

  const bookingsByStatus = analytics.bookings_by_status ?? { pending: 0, confirmed: 0, declined: 0 };
  const topSpecialties = analytics.top_specialties ?? [];

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
        {/* 2-column stat grid */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <AnalyticStatCard label="Total Users" value={analytics.total_users} icon={<Users size={18} color={COLORS.primary} />} color={COLORS.primary} />
          <AnalyticStatCard label="Total Therapists" value={analytics.total_therapists} icon={<Stethoscope size={18} color="#7C3AED" />} color="#7C3AED" />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <AnalyticStatCard label="Active Therapists" value={analytics.active_therapists} icon={<CheckCircle size={18} color={COLORS.success} />} color={COLORS.success} />
          <AnalyticStatCard label="Total Bookings" value={analytics.total_bookings} icon={<Calendar size={18} color="#0EA5E9" />} color="#0EA5E9" />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <AnalyticStatCard label="Pending Apps" value={analytics.pending_applications} icon={<Clock size={18} color={COLORS.warning} />} color={COLORS.warning} />
          <AnalyticStatCard label="Profile Views (7d)" value={analytics.profile_views_7d} icon={<Eye size={18} color="#EC4899" />} color="#EC4899" />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <AnalyticStatCard label="Searches (7d)" value={analytics.searches_7d} icon={<Search size={18} color={COLORS.textSecondary} />} color={COLORS.textSecondary} />
          <View style={{ flex: 1 }} />
        </View>

        {/* Top Specialties */}
        {topSpecialties.length > 0 && (
          <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, borderCurve: 'continuous', padding: 16, borderWidth: 1, borderColor: COLORS.border, marginTop: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', marginBottom: 12 }}>Top Specialties</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {topSpecialties.slice(0, 5).map((s) => (
                <View key={s.specialty} style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' }}>{s.specialty}</Text>
                  <View style={{ backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff', fontFamily: 'DMSans_700Bold' }}>{s.count}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bookings by Status */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, borderCurve: 'continuous', padding: 16, borderWidth: 1, borderColor: COLORS.border }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', marginBottom: 12 }}>Bookings by Status</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.warning, fontFamily: 'DMSans_700Bold' }}>{bookingsByStatus.pending}</Text>
              <Text style={{ fontSize: 12, color: COLORS.warning, fontFamily: 'DMSans_600SemiBold', fontWeight: '600' }}>Pending</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#D1FAE5', borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.success, fontFamily: 'DMSans_700Bold' }}>{bookingsByStatus.confirmed}</Text>
              <Text style={{ fontSize: 12, color: COLORS.success, fontFamily: 'DMSans_600SemiBold', fontWeight: '600' }}>Confirmed</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.danger, fontFamily: 'DMSans_700Bold' }}>{bookingsByStatus.declined}</Text>
              <Text style={{ fontSize: 12, color: COLORS.danger, fontFamily: 'DMSans_600SemiBold', fontWeight: '600' }}>Declined</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function AnalyticStatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <AnimatedPressable scaleValue={0.97} style={{ flex: 1 }}>
      <View style={{ backgroundColor: COLORS.surface, borderRadius: 14, borderCurve: 'continuous', padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </View>
        <Text style={{ fontSize: 22, fontWeight: '700', color, fontFamily: 'DMSans_700Bold', fontVariant: ['tabular-nums'] }}>{value}</Text>
        <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>{label}</Text>
      </View>
    </AnimatedPressable>
  );
}

// ── Subscriptions Tab ─────────────────────────────────────────────────────────

function SubscriptionsTab({ subscriptions, loading, error, onAdd, onEdit }: {
  subscriptions: AdminSubscription[];
  loading: boolean;
  error: string | null;
  onAdd: () => void;
  onEdit: (sub: AdminSubscription) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      {/* Tab header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>
          {subscriptions.length > 0 ? `${subscriptions.length} subscriptions` : 'Subscriptions'}
        </Text>
        <AnimatedPressable onPress={onAdd} scaleValue={0.9}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={18} color={COLORS.primary} strokeWidth={2.5} />
          </View>
        </AnimatedPressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, gap: 10, padding: 16 }}>
          {[1,2,3].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: COLORS.danger, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={subscriptions}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={{ paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 }}>
              <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <CreditCard size={28} color={COLORS.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', marginBottom: 8, textAlign: 'center' }}>No subscriptions yet</Text>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20 }}>Tap + to add a subscription manually.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const planColor = item.plan === 'premium' ? '#7C3AED' : COLORS.success;
            const planBg = item.plan === 'premium' ? '#EDE9FE' : '#D1FAE5';
            const statusColor = getStatusColor(item.status);
            const statusBg = item.status === 'active' ? '#D1FAE5' : item.status === 'expired' ? '#FEE2E2' : COLORS.surfaceSecondary;
            const amountDisplay = '$' + Number(item.amount_paid).toFixed(2);
            const expiryDisplay = item.expires_at ? new Date(item.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
            return (
              <AnimatedPressable onPress={() => { console.log('[Admin] Edit subscription tapped:', item.id); onEdit(item); }} scaleValue={0.98}>
                <View style={{ backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 10, borderRadius: 16, borderCurve: 'continuous', padding: 14, borderWidth: 1, borderColor: COLORS.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }} numberOfLines={1}>{item.therapist_name}</Text>
                      <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }} numberOfLines={1}>{item.therapist_title}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <View style={{ backgroundColor: planBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: planColor, fontFamily: 'DMSans_600SemiBold', textTransform: 'capitalize' }}>{item.plan}</Text>
                      </View>
                      <View style={{ backgroundColor: statusBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: statusColor, fontFamily: 'DMSans_600SemiBold', textTransform: 'capitalize' }}>{item.status}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>{amountDisplay}</Text>
                    {expiryDisplay ? <Text style={{ fontSize: 13, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>Expires {expiryDisplay}</Text> : null}
                  </View>
                  {item.notes ? <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular', marginTop: 6 }} numberOfLines={1}>{item.notes}</Text> : null}
                </View>
              </AnimatedPressable>
            );
          }}
        />
      )}
    </View>
  );
}

// ── Notifications Tab ─────────────────────────────────────────────────────────

function NotificationsTab({ notifications, loading, error, onSend }: {
  notifications: AdminNotification[];
  loading: boolean;
  error: string | null;
  onSend: () => void;
}) {
  const targetConfig: Record<string, { label: string; color: string; bg: string }> = {
    all: { label: 'All Therapists', color: '#0EA5E9', bg: '#E0F2FE' },
    featured: { label: 'Featured', color: COLORS.success, bg: '#D1FAE5' },
    free: { label: 'Free', color: COLORS.textSecondary, bg: COLORS.surfaceSecondary },
  };

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <View style={{ flex: 1, gap: 10, padding: 16 }}>
          {[1,2,3].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: COLORS.danger, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={{ paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 }}>
              <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Bell size={28} color={COLORS.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', marginBottom: 8, textAlign: 'center' }}>No broadcasts yet</Text>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20 }}>Send your first notification below.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const tc = targetConfig[item.target] ?? targetConfig.all;
            const sentDate = new Date(item.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return (
              <View style={{ backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 10, borderRadius: 16, borderCurve: 'continuous', padding: 14, borderWidth: 1, borderColor: COLORS.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', marginBottom: 2 }}>{item.title}</Text>
                    <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }} numberOfLines={1}>{item.message}</Text>
                  </View>
                  <View style={{ backgroundColor: tc.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: tc.color, fontFamily: 'DMSans_600SemiBold' }}>{tc.label}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>{item.recipient_count} recipients</Text>
                  <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>{sentDate}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
      {/* Send button */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: COLORS.background }}>
        <AnimatedPressable onPress={onSend} scaleValue={0.97}>
          <View style={{ height: 52, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <Bell size={18} color="#fff" />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>Send Notification</Text>
          </View>
        </AnimatedPressable>
      </View>
    </View>
  );
}
