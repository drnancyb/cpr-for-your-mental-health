import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import { CheckCircle, XCircle, MapPin, Mail, Phone, Globe, Clock, DollarSign, Briefcase } from 'lucide-react-native';
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
  bio: string;
  location: string;
  gender: string;
  email: string;
  phone: string;
  website_url?: string;
  photo_url?: string;
  session_fee: number;
  years_experience: number;
  specialties: string[];
  therapy_types: string[];
  insurances: string[];
  languages: string[];
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

function getStatusColor(status: string) {
  if (status === 'approved') return COLORS.success;
  if (status === 'rejected') return COLORS.danger;
  return COLORS.warning;
}

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const fetchApplication = useCallback(async () => {
    console.log('[AppDetail] Fetching application:', id);
    try {
      const data = await api.get<Application>(`/api/admin/applications/${id}`);
      console.log('[AppDetail] Loaded application:', data.name, 'status:', data.status);
      setApplication(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load application.';
      console.error('[AppDetail] Fetch error:', msg);
      setError(msg);
    }
  }, [id]);

  useEffect(() => {
    fetchApplication().finally(() => setLoading(false));
  }, [fetchApplication]);

  const handleApprove = async () => {
    console.log('[AppDetail] Approve pressed for application:', id);
    setActionLoading(true);
    try {
      const updated = await api.patch<Application>(`/api/admin/applications/${id}`, {
        status: 'approved',
      });
      console.log('[AppDetail] Application approved successfully');
      setApplication(updated);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to approve.';
      console.error('[AppDetail] Approve error:', msg);
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectionNotes.trim()) {
      setRejectError('Please provide a reason for rejection.');
      return;
    }
    console.log('[AppDetail] Reject submitted for application:', id, 'notes:', rejectionNotes);
    setActionLoading(true);
    setRejectError(null);
    try {
      const updated = await api.patch<Application>(`/api/admin/applications/${id}`, {
        status: 'rejected',
        admin_notes: rejectionNotes.trim(),
      });
      console.log('[AppDetail] Application rejected successfully');
      setApplication(updated);
      setShowRejectModal(false);
      setRejectionNotes('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to reject.';
      console.error('[AppDetail] Reject error:', msg);
      setRejectError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: 'Application', headerBackButtonDisplayMode: 'minimal' }} />
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (error || !application) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Stack.Screen options={{ title: 'Application', headerBackButtonDisplayMode: 'minimal' }} />
        <Text style={{ fontSize: 16, color: COLORS.danger, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>
          {error || 'Application not found.'}
        </Text>
      </View>
    );
  }

  const sc = getStatusColor(application.status);
  const sessionFeeDisplay = `$${Number(application.session_fee).toFixed(0)} / session`;
  const experienceDisplay = `${application.years_experience} year${application.years_experience !== 1 ? 's' : ''}`;
  const submittedDate = new Date(application.created_at).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 16 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <Stack.Screen
          options={{
            title: application.name,
            headerBackButtonDisplayMode: 'minimal',
            headerLargeTitle: false,
          }}
        />

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
            <Text style={{ fontSize: 15, fontWeight: '700', color: sc, fontFamily: 'DMSans_700Bold', textTransform: 'capitalize' }}>
              {application.status === 'pending' ? 'Pending Review' : application.status}
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>
              Submitted {submittedDate}
            </Text>
          </View>
        </View>

        {/* Approved banner */}
        {application.status === 'approved' && (
          <View
            style={{
              backgroundColor: '#F0FDF4',
              borderRadius: 12,
              borderCurve: 'continuous',
              padding: 14,
              borderWidth: 1,
              borderColor: '#BBF7D0',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <CheckCircle size={18} color={COLORS.success} />
            <Text style={{ fontSize: 13, color: '#166534', fontFamily: 'DMSans_400Regular', flex: 1, lineHeight: 18 }}>
              Approved — Live on App
            </Text>
          </View>
        )}

        {/* Rejected banner */}
        {application.status === 'rejected' && (
          <View
            style={{
              backgroundColor: '#FEF2F2',
              borderRadius: 12,
              borderCurve: 'continuous',
              padding: 14,
              borderWidth: 1,
              borderColor: '#FECACA',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: application.admin_notes ? 8 : 0 }}>
              <XCircle size={18} color={COLORS.danger} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.danger, fontFamily: 'DMSans_600SemiBold' }}>
                Rejected
              </Text>
            </View>
            {application.admin_notes ? (
              <Text style={{ fontSize: 13, color: '#991B1B', fontFamily: 'DMSans_400Regular', lineHeight: 18 }}>
                {application.admin_notes}
              </Text>
            ) : null}
          </View>
        )}

        {/* Applicant info */}
        <InfoCard title="Applicant">
          <InfoRow label="Name" value={application.name} />
          <InfoRow label="Title" value={application.title} />
          <InfoRow label="Gender" value={application.gender} />
          <InfoRow label="Location" value={application.location} icon={<MapPin size={13} color={COLORS.textTertiary} />} />
          <InfoRow label="Email" value={application.email} icon={<Mail size={13} color={COLORS.textTertiary} />} />
          <InfoRow label="Phone" value={application.phone} icon={<Phone size={13} color={COLORS.textTertiary} />} />
          {application.website_url ? (
            <InfoRow label="Website" value={application.website_url} icon={<Globe size={13} color={COLORS.textTertiary} />} />
          ) : null}
        </InfoCard>

        {/* Professional */}
        <InfoCard title="Professional Details">
          <InfoRow label="Session fee" value={sessionFeeDisplay} icon={<DollarSign size={13} color={COLORS.textTertiary} />} />
          <InfoRow label="Experience" value={experienceDisplay} icon={<Briefcase size={13} color={COLORS.textTertiary} />} />
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular', textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Bio
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_400Regular', lineHeight: 21 }} selectable>
              {application.bio}
            </Text>
          </View>
        </InfoCard>

        {/* Specialties */}
        <InfoCard title="Specialties & Services">
          <TagRow label="Specialties" tags={application.specialties} />
          <TagRow label="Therapy types" tags={application.therapy_types} />
          <TagRow label="Insurances" tags={application.insurances} />
          <TagRow label="Languages" tags={application.languages} />
        </InfoCard>

        {/* Action buttons — pending only */}
        {application.status === 'pending' && (
          <View style={{ flexDirection: 'row', gap: 12 }}>
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
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>
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
                <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.danger, fontFamily: 'DMSans_600SemiBold' }}>
                  Reject
                </Text>
              </View>
            </AnimatedPressable>
          </View>
        )}
      </ScrollView>

      {/* Reject modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          console.log('[AppDetail] Reject modal dismissed');
          setShowRejectModal(false);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'flex-end',
          }}
        >
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <XCircle size={20} color={COLORS.danger} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold', flex: 1 }}>
                Reject application
              </Text>
              <AnimatedPressable onPress={() => {
                console.log('[AppDetail] Reject modal cancel pressed');
                setShowRejectModal(false);
                setRejectionNotes('');
                setRejectError(null);
              }}>
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
                  <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' }}>✕</Text>
                </View>
              </AnimatedPressable>
            </View>

            <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', lineHeight: 20 }}>
              Provide a reason for rejection. This will be shared with the applicant.
            </Text>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>
                Rejection reason
              </Text>
              <TextInput
                value={rejectionNotes}
                onChangeText={setRejectionNotes}
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
              <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FECACA' }}>
                <Text style={{ fontSize: 13, color: COLORS.danger, fontFamily: 'DMSans_400Regular' }}>
                  {rejectError}
                </Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <AnimatedPressable
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionNotes('');
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
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>
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
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>
                      Confirm reject
                    </Text>
                  )}
                </View>
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
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
      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textTertiary, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {icon}
        <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
          {label}
        </Text>
      </View>
      <Text style={{ fontSize: 13, color: COLORS.text, fontFamily: 'DMSans_600SemiBold', flex: 1, textAlign: 'right' }} numberOfLines={2} selectable>
        {value}
      </Text>
    </View>
  );
}

function TagRow({ label, tags }: { label: string; tags: string[] }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {tags.map((tag) => (
          <View
            key={tag}
            style={{
              backgroundColor: COLORS.primaryMuted,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' }}>
              {tag}
            </Text>
          </View>
        ))}
        {tags.length === 0 && (
          <Text style={{ fontSize: 13, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
            None listed
          </Text>
        )}
      </View>
    </View>
  );
}
