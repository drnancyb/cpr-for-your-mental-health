import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import {
  LogIn,
  UserRound,
  MapPin,
  CheckCircle,
  XCircle,
  Pencil,
  ChevronRight,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  Bell,
  Upload,
  X,
  FileText,
  Save,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '@/contexts/NotificationContext';
import * as DocumentPicker from 'expo-document-picker';
import { authClient } from '@/lib/auth';

const BASE_URL = 'https://77zgefkppvrujkkwanvht7mztqqrxrhy.app.specular.dev';

async function uploadLicenseDocument(
  fileUri: string,
  fileName: string,
  mimeType: string,
  token: string | null,
): Promise<string> {
  console.log('[TherapistPortal] Uploading document:', fileName, 'mimeType:', mimeType);
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/api/upload/license-document`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[TherapistPortal] Upload failed, status:', res.status, text);
    throw new Error(text || `Upload failed (${res.status})`);
  }

  const json = await res.json();
  console.log('[TherapistPortal] Upload success, url:', json.url);
  return json.url as string;
}

function docDisplayName(url: string, index: number): string {
  try {
    const parts = url.split('/');
    const last = parts[parts.length - 1];
    if (last && last.length > 0) return decodeURIComponent(last);
  } catch {}
  return `Document ${index + 1}`;
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
  border: 'rgba(45, 122, 95, 0.08)',
  success: '#34A853',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

interface TherapistProfile {
  id: string;
  name: string;
  title: string;
  location: string;
  acceptingNewClients: boolean;
  photoUrl?: string;
  bio: string;
  specialties: string[];
  therapyTypes: string[];
  insurances: string[];
  languages: string[];
  sessionFee: number | string;
  yearsExperience: number;
  phone: string;
  email: string;
  websiteUrl?: string;
  gender: string;
  license_documents?: string[];
}

interface Inquiry {
  id: string;
  contact_method: 'email' | 'phone';
  preferred_date?: string;
  message: string;
  status: 'pending' | 'confirmed' | 'declined';
  created_at: string;
  user?: { name: string; email: string };
}

interface PortalSubscription {
  id: string;
  plan: 'featured' | 'premium';
  status: 'active' | 'expired' | 'cancelled';
  amount_paid: number;
  expires_at?: string;
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textTertiary,
        fontFamily: 'DMSans_600SemiBold',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 12,
      }}
    >
      {title}
    </Text>
  );
}

function StatusBadge({ status }: { status: string }) {
  let color = COLORS.warning;
  let bg = '#FEF3C7';
  let label = status;

  if (status === 'confirmed' || status === 'active' || status === 'resolved') {
    color = COLORS.success; bg = '#D1FAE5';
  } else if (status === 'declined' || status === 'expired') {
    color = COLORS.danger; bg = '#FEE2E2';
  } else if (status === 'in_progress') {
    color = COLORS.info; bg = '#DBEAFE';
  } else if (status === 'cancelled') {
    color = COLORS.textTertiary; bg = COLORS.surfaceSecondary;
  }

  const labelText = label.replace('_', ' ');

  return (
    <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color, fontFamily: 'DMSans_600SemiBold', textTransform: 'capitalize' }}>
        {labelText}
      </Text>
    </View>
  );
}

export default function TherapistPortalScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useNotifications();

  const [profile, setProfile] = useState<TherapistProfile | null | undefined>(undefined);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [subscription, setSubscription] = useState<PortalSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptingClients, setAcceptingClients] = useState<boolean>(false);
  const [licenseDocuments, setLicenseDocuments] = useState<string[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [savingDocs, setSavingDocs] = useState(false);

  useEffect(() => {
    setAcceptingClients(profile?.acceptingNewClients ?? false);
  }, [profile?.acceptingNewClients]);

  useEffect(() => {
    setLicenseDocuments(profile?.license_documents ?? []);
  }, [profile?.license_documents]);

  const handlePickDocument = useCallback(async () => {
    console.log('[TherapistPortal] Upload Document button pressed');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) {
        console.log('[TherapistPortal] Document picker cancelled');
        return;
      }
      const asset = result.assets[0];
      const fileName = asset.name ?? `document_${Date.now()}`;
      const mimeType = asset.mimeType ?? 'application/octet-stream';
      console.log('[TherapistPortal] Document picked:', fileName);
      setUploadingDoc(true);
      try {
        const { data: session } = await authClient.getSession();
        const token = session?.session?.token ?? null;
        const url = await uploadLicenseDocument(asset.uri, fileName, mimeType, token);
        setLicenseDocuments((prev) => [...prev, url]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        console.error('[TherapistPortal] Document upload error:', msg);
        Alert.alert('Upload Failed', msg);
      } finally {
        setUploadingDoc(false);
      }
    } catch (e) {
      console.error('[TherapistPortal] Document picker error:', e);
    }
  }, []);

  const handleRemoveDocument = useCallback((index: number) => {
    console.log('[TherapistPortal] Remove document at index:', index);
    setLicenseDocuments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSaveDocuments = useCallback(async () => {
    console.log('[TherapistPortal] Save license documents pressed, count:', licenseDocuments.length);
    setSavingDocs(true);
    try {
      await api.post('/api/therapist/license-documents', { document_urls: licenseDocuments });
      console.log('[TherapistPortal] License documents saved successfully');
      Alert.alert('Saved', 'Your license documents have been updated.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save documents';
      console.error('[TherapistPortal] Save documents error:', msg);
      Alert.alert('Save Failed', msg);
    } finally {
      setSavingDocs(false);
    }
  }, [licenseDocuments]);

  const toggleAccepting = useCallback(async () => {
    const next = !acceptingClients;
    console.log('[TherapistPortal] Toggle accepting clients:', next);
    setAcceptingClients(next);
    try {
      await api.patch('/api/therapist/profile', { accepting_new_clients: next });
      console.log('[TherapistPortal] Accepting clients updated to:', next);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update availability';
      console.error('[TherapistPortal] Toggle accepting error:', msg);
      setAcceptingClients(!next);
      Alert.alert('Update Failed', 'Could not update your availability. Please try again.');
    }
  }, [acceptingClients]);

  const handleBellPress = useCallback(async () => {
    console.log('[TherapistPortal] Bell icon pressed, hasPermission:', hasPermission);
    if (!hasPermission) {
      console.log('[TherapistPortal] Requesting notification permission');
      await requestPermission();
    } else {
      console.log('[TherapistPortal] Navigating to notification preferences');
      router.push('/notification-preferences');
    }
  }, [hasPermission, requestPermission]);

  const fetchAll = useCallback(async () => {
    console.log('[TherapistPortal] Fetching portal data');
    setError(null);
    try {
      const [profileData, inquiriesData, subData] = await Promise.all([
        api.get<TherapistProfile | null>('/api/therapist/profile').catch(() => null),
        api.get<{ inquiries: Inquiry[] }>('/api/therapist/inquiries').catch(() => ({ inquiries: [] })),
        api.get<PortalSubscription | null>('/api/therapist/subscription').catch(() => null),
      ]);
      console.log('[TherapistPortal] Profile:', profileData ? profileData.name : 'none');
      console.log('[TherapistPortal] Inquiries:', inquiriesData.inquiries?.length ?? 0);
      console.log('[TherapistPortal] Subscription:', subData ? subData.plan : 'none');
      setProfile(profileData);
      setInquiries(inquiriesData.inquiries ?? []);
      setSubscription(subData);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load portal data';
      console.error('[TherapistPortal] Fetch error:', msg);
      setError(msg);
    }
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchAll().finally(() => setLoading(false));
  }, [user, fetchAll]);

  const handleRefresh = useCallback(async () => {
    console.log('[TherapistPortal] Pull-to-refresh');
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const handleEditProfile = useCallback(() => {
    console.log('[TherapistPortal] Edit profile pressed, navigating to /therapist/edit-profile');
    router.push('/therapist/edit-profile');
  }, []);

  const bellButton = (
    <TouchableOpacity onPress={handleBellPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Bell size={22} color={hasPermission ? COLORS.primary : COLORS.textTertiary} />
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Stack.Screen options={{ title: 'Therapist Portal', headerRight: () => bellButton }} />
        <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <LogIn size={32} color={COLORS.primary} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold', marginBottom: 8, textAlign: 'center' }}>
          Sign in required
        </Text>
        <Text style={{ fontSize: 15, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
          Sign in to access your therapist portal.
        </Text>
        <AnimatedPressable onPress={() => { console.log('[TherapistPortal] Sign in pressed'); router.push('/auth-screen'); }}>
          <View style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>Sign In</Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: 'Therapist Portal', headerRight: () => bellButton }} />
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Stack.Screen options={{ title: 'Therapist Portal', headerRight: () => bellButton }} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', marginBottom: 8, textAlign: 'center' }}>
          Couldn't load portal
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginBottom: 20 }}>
          {error}
        </Text>
        <AnimatedPressable onPress={() => { console.log('[TherapistPortal] Retry pressed'); setLoading(true); fetchAll().finally(() => setLoading(false)); }}>
          <View style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>Try again</Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  // No profile found
  if (profile === null) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Stack.Screen options={{ title: 'Therapist Portal', headerRight: () => bellButton }} />
        <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <UserRound size={32} color={COLORS.primary} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold', marginBottom: 8, textAlign: 'center' }}>
          No listing found
        </Text>
        <Text style={{ fontSize: 15, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
          No listing found for your account. Apply to be listed in the directory.
        </Text>
        <AnimatedPressable onPress={() => { console.log('[TherapistPortal] Apply pressed'); router.push('/apply'); }}>
          <View style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>Apply to be Listed</Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  // Profile exists — show portal
  const totalInquiries = inquiries.length;
  const pendingInquiries = inquiries.filter((i) => i.status === 'pending').length;
  const confirmedInquiries = inquiries.filter((i) => i.status === 'confirmed').length;
  const recentInquiries = inquiries.slice(0, 5);
  const hasMore = totalInquiries > 5;

  const planLabel = subscription?.plan === 'premium' ? 'Premium' : 'Featured';
  const planColor = subscription?.plan === 'premium' ? '#7C3AED' : COLORS.success;
  const planBg = subscription?.plan === 'premium' ? '#EDE9FE' : '#D1FAE5';

  const expiryDisplay = subscription?.expires_at
    ? new Date(subscription.expires_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const amountDisplay = subscription ? `$${Number(subscription.amount_paid).toFixed(2)}` : '';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen options={{ title: 'Therapist Portal', headerRight: () => bellButton }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32, paddingTop: 8 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Section 1 — Your Profile */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
          <SectionTitle title="Your Profile" />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.primary, fontFamily: 'DMSans_700Bold' }}>
                {profile.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold' }} numberOfLines={1}>
                {profile.name}
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }} numberOfLines={1}>
                {profile.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <MapPin size={12} color={COLORS.textTertiary} />
                <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
                  {profile.location}
                </Text>
              </View>
            </View>
          </View>

          {/* Accepting clients toggle row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: acceptingClients ? 'rgba(52, 168, 83, 0.2)' : COLORS.border,
            }}
          >
            <View style={{ marginRight: 12 }}>
              {acceptingClients
                ? <CheckCircle size={22} color="#4CAF50" />
                : <XCircle size={22} color={COLORS.textTertiary} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>
                Accepting New Clients
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>
                Visible to clients browsing your profile
              </Text>
            </View>
            <Switch
              value={acceptingClients}
              onValueChange={toggleAccepting}
              trackColor={{ false: '#ccc', true: '#4CAF50' }}
              thumbColor="#ffffff"
            />
          </View>

          <AnimatedPressable onPress={handleEditProfile} scaleValue={0.97}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: COLORS.primaryMuted,
                borderRadius: 12,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: 'rgba(45, 122, 95, 0.15)',
              }}
            >
              <Pencil size={15} color={COLORS.primary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' }}>
                Edit Profile
              </Text>
            </View>
          </AnimatedPressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <AlertCircle size={12} color={COLORS.textTertiary} />
            <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular', flex: 1 }}>
              Profile changes are reviewed by our team before going live
            </Text>
          </View>
        </View>

        {/* Section 2 — Inquiries */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
          <SectionTitle title="Inquiries" />

          {/* Stats row */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Total', value: totalInquiries, color: COLORS.primary },
              { label: 'Pending', value: pendingInquiries, color: COLORS.warning },
              { label: 'Confirmed', value: confirmedInquiries, color: COLORS.success },
            ].map((stat) => (
              <View
                key={stat.label}
                style={{
                  flex: 1,
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 12,
                  padding: 12,
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 22, fontWeight: '700', color: stat.color, fontFamily: 'DMSans_700Bold' }}>
                  {stat.value}
                </Text>
                <Text style={{ fontSize: 11, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Inquiry cards */}
          {recentInquiries.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ fontSize: 14, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
                No inquiries yet
              </Text>
            </View>
          ) : (
            recentInquiries.map((inquiry) => {
              const contactIcon = inquiry.contact_method === 'email'
                ? <Mail size={13} color={COLORS.textTertiary} />
                : <Phone size={13} color={COLORS.textTertiary} />;
              const dateDisplay = inquiry.preferred_date
                ? new Date(inquiry.preferred_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : null;
              const msgPreview = inquiry.message.length > 60 ? inquiry.message.slice(0, 60) + '…' : inquiry.message;

              return (
                <View
                  key={inquiry.id}
                  style={{
                    backgroundColor: COLORS.surfaceSecondary,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {contactIcon}
                      <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>
                        {inquiry.contact_method === 'email' ? 'Email' : 'Phone'}
                      </Text>
                      {dateDisplay ? (
                        <>
                          <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>·</Text>
                          <Calendar size={12} color={COLORS.textTertiary} />
                          <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
                            {dateDisplay}
                          </Text>
                        </>
                      ) : null}
                    </View>
                    <StatusBadge status={inquiry.status} />
                  </View>
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', lineHeight: 18 }} numberOfLines={1}>
                    {msgPreview}
                  </Text>
                </View>
              );
            })
          )}

          {hasMore ? (
            <AnimatedPressable
              onPress={() => { console.log('[TherapistPortal] View all inquiries pressed'); router.push('/my-bookings'); }}
              scaleValue={0.97}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' }}>
                  View All
                </Text>
                <ChevronRight size={15} color={COLORS.primary} />
              </View>
            </AnimatedPressable>
          ) : null}
        </View>

        {/* Section 2b — License Documents */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
          <SectionTitle title="License Documents" />

          <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', lineHeight: 18, marginBottom: 12 }}>
            Upload your registration certificate, license, or any official proof of licensure (PDF, JPG, PNG)
          </Text>

          {licenseDocuments.map((url, index) => {
            const displayName = docDisplayName(url, index);
            return (
              <View
                key={url + index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <FileText size={16} color={COLORS.primary} />
                <Text
                  style={{ flex: 1, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans_400Regular' }}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
                <AnimatedPressable onPress={() => handleRemoveDocument(index)} scaleValue={0.9}>
                  <View style={{ padding: 4 }}>
                    <X size={16} color={COLORS.danger} />
                  </View>
                </AnimatedPressable>
              </View>
            );
          })}

          <AnimatedPressable onPress={handlePickDocument} disabled={uploadingDoc} scaleValue={0.97}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: uploadingDoc ? COLORS.surfaceSecondary : COLORS.primaryMuted,
                borderRadius: 12,
                paddingVertical: 13,
                borderWidth: 1,
                borderColor: uploadingDoc ? 'transparent' : 'rgba(45, 122, 95, 0.2)',
                borderStyle: 'dashed',
                marginBottom: licenseDocuments.length > 0 ? 10 : 0,
              }}
            >
              {uploadingDoc ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Upload size={16} color={COLORS.primary} />
              )}
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' }}>
                {uploadingDoc ? 'Uploading…' : 'Upload Document'}
              </Text>
            </View>
          </AnimatedPressable>

          {licenseDocuments.length > 0 && (
            <AnimatedPressable onPress={handleSaveDocuments} disabled={savingDocs} scaleValue={0.97}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: COLORS.primary,
                  borderRadius: 12,
                  paddingVertical: 13,
                  opacity: savingDocs ? 0.7 : 1,
                }}
              >
                {savingDocs ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Save size={16} color="#fff" />
                )}
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>
                  {savingDocs ? 'Saving…' : 'Save Documents'}
                </Text>
              </View>
            </AnimatedPressable>
          )}
        </View>

        {/* Section 3 — Subscription */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
          <SectionTitle title="Subscription" />

          {subscription ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={{ backgroundColor: planBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: planColor, fontFamily: 'DMSans_700Bold' }}>
                    {planLabel}
                  </Text>
                </View>
                <StatusBadge status={subscription.status} />
              </View>

              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>Amount paid</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>{amountDisplay}</Text>
                </View>
                {expiryDisplay ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>Expires</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>{expiryDisplay}</Text>
                  </View>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                <AlertCircle size={12} color={COLORS.textTertiary} />
                <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular', flex: 1 }}>
                  Manage billing through the App Store or Google Play
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <Text style={{ fontSize: 14, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
                No active subscription
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
