import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import {
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Globe,
} from 'lucide-react-native';
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
  // Personal
  full_name?: string;
  name?: string;
  email: string;
  phone?: string;
  // Professional
  license_number?: string;
  license_type?: string;
  years_experience?: number;
  specializations?: string[];
  specialties?: string[];
  languages?: string[];
  insurance_accepted?: string[];
  insurances?: string[];
  accepting_new_clients?: boolean;
  bio?: string;
  // Location
  location?: string;
  city?: string;
  website_url?: string;
  // Meta
  rejection_reason?: string;
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
}

function getStatusColor(status: string) {
  if (status === 'approved') return COLORS.success;
  if (status === 'rejected') return COLORS.danger;
  return COLORS.warning;
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        borderCurve: 'continuous',
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: COLORS.textTertiary,
          fontFamily: 'DMSans_700Bold',
          textTransform: 'uppercase',
          letterSpacing: 0.7,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  if (!value) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {icon}
        <Text
          style={{
            fontSize: 13,
            color: COLORS.textSecondary,
            fontFamily: 'DMSans_400Regular',
          }}
        >
          {label}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 13,
          color: COLORS.text,
          fontFamily: 'DMSans_600SemiBold',
          flex: 1,
          textAlign: 'right',
        }}
        numberOfLines={3}
        selectable
      >
        {value}
      </Text>
    </View>
  );
}

function TagRow({ label, tags }: { label: string; tags: string[] }) {
  const safeTags = Array.isArray(tags) ? tags : [];
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          fontSize: 11,
          color: COLORS.textTertiary,
          fontFamily: 'DMSans_400Regular',
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {safeTags.map((tag) => (
          <View
            key={tag}
            style={{
              backgroundColor: COLORS.primaryMuted,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: COLORS.primary,
                fontFamily: 'DMSans_600SemiBold',
              }}
            >
              {tag}
            </Text>
          </View>
        ))}
        {safeTags.length === 0 && (
          <Text
            style={{
              fontSize: 13,
              color: COLORS.textTertiary,
              fontFamily: 'DMSans_400Regular',
            }}
          >
            None listed
          </Text>
        )}
      </View>
    </View>
  );
}

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useAuth(); // ensures admin auth guard in parent layout

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const fetchApplication = useCallback(async () => {
    console.log('[AppDetail] GET /api/admin/applications/' + id);
    try {
      const data = await api.get<Application>(`/api/admin/applications/${id}`);
      const displayName = data.full_name ?? data.name ?? 'Unknown';
      console.log('[AppDetail] Loaded:', displayName, 'status:', data.status);
      setApplication(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load application.';
      console.warn('[AppDetail] Fetch error:', msg);
      setError(msg);
    }
  }, [id]);

  useEffect(() => {
    fetchApplication().finally(() => setLoading(false));
  }, [fetchApplication]);

  const handleApprove = () => {
    console.log('[AppDetail] Approve button pressed for application:', id);
    Alert.alert(
      'Approve application',
      'This will approve the application and make the therapist live on the app.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => console.log('[AppDetail] Approve cancelled') },
        {
          text: 'Approve',
          onPress: async () => {
            console.log('[AppDetail] Approve confirmed — PATCH /api/admin/applications/' + id + '/status');
            setActionLoading(true);
            try {
              await api.patch(`/api/admin/applications/${id}/status`, { status: 'approved' });
              console.log('[AppDetail] Application approved successfully');
              router.back();
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Failed to approve.';
              console.warn('[AppDetail] Approve error:', msg);
              Alert.alert('Error', msg);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectSubmit = async () => {
    console.log('[AppDetail] Reject submit pressed for application:', id, 'reason:', rejectReason);
    setRejectError(null);
    setActionLoading(true);
    try {
      const body: { status: string; rejection_reason?: string } = { status: 'rejected' };
      if (rejectReason.trim()) body.rejection_reason = rejectReason.trim();
      console.log('[AppDetail] PATCH /api/admin/applications/' + id + '/status', body);
      await api.patch(`/api/admin/applications/${id}/status`, body);
      console.log('[AppDetail] Application rejected successfully');
      setShowRejectModal(false);
      setRejectReason('');
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to reject.';
      console.warn('[AppDetail] Reject error:', msg);
      setRejectError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack.Screen options={{ title: 'Application', headerBackButtonDisplayMode: 'minimal' }} />
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (error || !application) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <Stack.Screen options={{ title: 'Application', headerBackButtonDisplayMode: 'minimal' }} />
        <Text
          style={{
            fontSize: 16,
            color: COLORS.danger,
            fontFamily: 'DMSans_400Regular',
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          {error ?? 'Application not found.'}
        </Text>
        <AnimatedPressable
          onPress={() => {
            console.log('[AppDetail] Retry pressed');
            setLoading(true);
            setError(null);
            fetchApplication().finally(() => setLoading(false));
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
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>
              Try again
            </Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  const sc = getStatusColor(application.status);
  const displayName = application.full_name ?? application.name ?? 'Unknown';
  const location = application.city ?? application.location ?? '';
  const specializations = application.specializations ?? application.specialties ?? [];
  const insurances = application.insurance_accepted ?? application.insurances ?? [];
  const isPending = application.status === 'pending';

  const experienceDisplay =
    application.years_experience != null
      ? `${application.years_experience} year${application.years_experience !== 1 ? 's' : ''}`
      : '';

  const _sd = application.created_at ? new Date(application.created_at) : null;
  const submittedDate = (_sd && !isNaN(_sd.getTime()))
    ? _sd.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const statusLabel =
    application.status === 'pending'
      ? 'Pending Review'
      : application.status.charAt(0).toUpperCase() + application.status.slice(1);

  const acceptingLabel =
    application.accepting_new_clients != null
      ? application.accepting_new_clients
        ? 'Yes'
        : 'No'
      : '';

  const rejectionNote = application.rejection_reason ?? application.admin_notes ?? '';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Application',
          headerLargeTitle: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          {/* Status banner */}
          <View
            style={{
              backgroundColor: sc + '14',
              borderRadius: 14,
              borderCurve: 'continuous',
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderWidth: 1,
              borderColor: sc + '28',
            }}
          >
            {application.status === 'approved' ? (
              <CheckCircle size={22} color={sc} />
            ) : application.status === 'rejected' ? (
              <XCircle size={22} color={sc} />
            ) : (
              <Clock size={22} color={sc} />
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '700',
                  color: sc,
                  fontFamily: 'DMSans_700Bold',
                }}
              >
                {statusLabel}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: COLORS.textSecondary,
                  fontFamily: 'DMSans_400Regular',
                  marginTop: 2,
                }}
              >
                Submitted {submittedDate}
              </Text>
            </View>
          </View>

          {/* Rejection reason banner */}
          {application.status === 'rejected' && rejectionNote ? (
            <View
              style={{
                backgroundColor: '#FEF2F2',
                borderRadius: 12,
                borderCurve: 'continuous',
                padding: 14,
                borderWidth: 1,
                borderColor: '#FECACA',
                gap: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <XCircle size={16} color={COLORS.danger} />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: COLORS.danger,
                    fontFamily: 'DMSans_600SemiBold',
                  }}
                >
                  Rejection reason
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 13,
                  color: '#991B1B',
                  fontFamily: 'DMSans_400Regular',
                  lineHeight: 18,
                }}
              >
                {rejectionNote}
              </Text>
            </View>
          ) : null}

          {/* Applicant info */}
          <InfoCard title="Applicant">
            <InfoRow label="Full name" value={displayName} />
            <InfoRow
              label="Email"
              value={application.email}
              icon={<Mail size={13} color={COLORS.textTertiary} />}
            />
            {application.phone ? (
              <InfoRow
                label="Phone"
                value={application.phone}
                icon={<Phone size={13} color={COLORS.textTertiary} />}
              />
            ) : null}
            {location ? (
              <InfoRow
                label="Location"
                value={location}
                icon={<MapPin size={13} color={COLORS.textTertiary} />}
              />
            ) : null}
            {application.website_url ? (
              <InfoRow
                label="Website"
                value={application.website_url}
                icon={<Globe size={13} color={COLORS.textTertiary} />}
              />
            ) : null}
          </InfoCard>

          {/* Professional details */}
          <InfoCard title="Professional Details">
            {application.license_number ? (
              <InfoRow label="License number" value={application.license_number} />
            ) : null}
            {application.license_type ? (
              <InfoRow label="License type" value={application.license_type} />
            ) : null}
            {experienceDisplay ? (
              <InfoRow
                label="Experience"
                value={experienceDisplay}
                icon={<Briefcase size={13} color={COLORS.textTertiary} />}
              />
            ) : null}
            {acceptingLabel ? (
              <InfoRow label="Accepting new clients" value={acceptingLabel} />
            ) : null}
            {application.bio ? (
              <View style={{ gap: 6 }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: COLORS.textTertiary,
                    fontFamily: 'DMSans_400Regular',
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                  }}
                >
                  Bio
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: COLORS.text,
                    fontFamily: 'DMSans_400Regular',
                    lineHeight: 21,
                  }}
                  selectable
                >
                  {application.bio}
                </Text>
              </View>
            ) : null}
          </InfoCard>

          {/* Specialties & services */}
          <InfoCard title="Specialties & Services">
            <TagRow label="Specializations" tags={specializations} />
            <TagRow label="Languages" tags={application.languages ?? []} />
            <TagRow label="Insurance accepted" tags={insurances} />
          </InfoCard>

          {/* Action buttons — pending only */}
          {isPending ? (
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <AnimatedPressable
                onPress={handleApprove}
                disabled={actionLoading}
                style={{ flex: 1 }}
              >
                <View
                  style={{
                    flex: 1,
                    backgroundColor: COLORS.success,
                    borderRadius: 14,
                    borderCurve: 'continuous',
                    paddingVertical: 16,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: actionLoading ? 0.7 : 1,
                  }}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <CheckCircle size={18} color="#fff" />
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '600',
                          color: '#fff',
                          fontFamily: 'DMSans_600SemiBold',
                        }}
                      >
                        Approve
                      </Text>
                    </>
                  )}
                </View>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={() => {
                  console.log('[AppDetail] Reject button pressed');
                  setShowRejectModal(true);
                }}
                disabled={actionLoading}
                style={{ flex: 1 }}
              >
                <View
                  style={{
                    flex: 1,
                    backgroundColor: COLORS.surface,
                    borderRadius: 14,
                    borderCurve: 'continuous',
                    paddingVertical: 16,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                    borderWidth: 1.5,
                    borderColor: COLORS.danger + '60',
                  }}
                >
                  <XCircle size={18} color={COLORS.danger} />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: COLORS.danger,
                      fontFamily: 'DMSans_600SemiBold',
                    }}
                  >
                    Reject
                  </Text>
                </View>
              </AnimatedPressable>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Reject modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          console.log('[AppDetail] Reject modal dismissed via back');
          setShowRejectModal(false);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'flex-end',
          }}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderCurve: 'continuous',
                padding: 24,
                gap: 16,
              }}
            >
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <XCircle size={20} color={COLORS.danger} />
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: '700',
                    color: COLORS.text,
                    fontFamily: 'DMSans_700Bold',
                    flex: 1,
                  }}
                >
                  Reject application
                </Text>
                <AnimatedPressable
                  onPress={() => {
                    console.log('[AppDetail] Reject modal cancel pressed');
                    setShowRejectModal(false);
                    setRejectReason('');
                    setRejectError(null);
                  }}
                >
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: COLORS.surfaceSecondary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: COLORS.textSecondary,
                        fontWeight: '600',
                      }}
                    >
                      ✕
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>

              <Text
                style={{
                  fontSize: 14,
                  color: COLORS.textSecondary,
                  fontFamily: 'DMSans_400Regular',
                  lineHeight: 20,
                }}
              >
                Optionally provide a reason for rejection. This may be shared with the applicant.
              </Text>

              <View style={{ gap: 6 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: COLORS.textSecondary,
                    fontFamily: 'DMSans_600SemiBold',
                  }}
                >
                  Rejection reason (optional)
                </Text>
                <TextInput
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder="Explain why this application is being rejected..."
                  placeholderTextColor={COLORS.textTertiary}
                  multiline
                  autoFocus
                  style={{
                    backgroundColor: COLORS.surfaceSecondary,
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 14,
                    color: COLORS.text,
                    fontFamily: 'DMSans_400Regular',
                    minHeight: 100,
                    textAlignVertical: 'top',
                  }}
                />
              </View>

              {rejectError ? (
                <View
                  style={{
                    backgroundColor: '#FEF2F2',
                    borderRadius: 10,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: '#FECACA',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: COLORS.danger,
                      fontFamily: 'DMSans_400Regular',
                    }}
                  >
                    {rejectError}
                  </Text>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <AnimatedPressable
                  onPress={() => {
                    console.log('[AppDetail] Reject modal cancel button pressed');
                    setShowRejectModal(false);
                    setRejectReason('');
                    setRejectError(null);
                  }}
                  style={{ flex: 1 }}
                >
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: COLORS.surfaceSecondary,
                      borderRadius: 12,
                      borderCurve: 'continuous',
                      paddingVertical: 14,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: COLORS.textSecondary,
                        fontFamily: 'DMSans_600SemiBold',
                      }}
                    >
                      Cancel
                    </Text>
                  </View>
                </AnimatedPressable>

                <AnimatedPressable
                  onPress={handleRejectSubmit}
                  disabled={actionLoading}
                  style={{ flex: 1 }}
                >
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: COLORS.danger,
                      borderRadius: 12,
                      borderCurve: 'continuous',
                      paddingVertical: 14,
                      alignItems: 'center',
                      opacity: actionLoading ? 0.7 : 1,
                    }}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#fff',
                          fontFamily: 'DMSans_600SemiBold',
                        }}
                      >
                        Confirm reject
                      </Text>
                    )}
                  </View>
                </AnimatedPressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}
