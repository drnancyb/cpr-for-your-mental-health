import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  MapPin,
  Mail,
  Phone,
  Globe,
  Clock,
  DollarSign,
  Briefcase,
  Send,
  MessageSquare,
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
  borderStrong: '#D4E8DF',
  danger: '#EF4444',
  success: '#34A853',
  warning: '#F59E0B',
};

interface ApplicationMessage {
  id: string;
  message: string;
  created_at: string;
  sender?: string;
}

interface Application {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  name: string;
  title?: string;
  bio?: string;
  location?: string;
  city?: string;
  gender?: string;
  email: string;
  phone?: string;
  website_url?: string;
  photo_url?: string;
  session_fee?: number;
  years_experience?: number;
  specialties?: string[];
  therapy_types?: string[];
  insurances?: string[];
  languages?: string[];
  accepting_new_clients?: boolean;
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
  messages?: ApplicationMessage[];
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
  const { user } = useAuth();

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action state
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Messages state
  const [messages, setMessages] = useState<ApplicationMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const fetchApplication = useCallback(async () => {
    console.log('[AppDetail] Fetching GET /api/admin/applications/' + id);
    try {
      const data = await api.get<Application>(`/api/admin/applications/${id}`);
      console.log('[AppDetail] Loaded:', data.name, 'status:', data.status);
      setApplication(data);
      if (Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load application.';
      console.error('[AppDetail] Fetch error:', msg);
      setError(msg);
    }
  }, [id]);

  const fetchMessages = useCallback(async () => {
    console.log('[AppDetail] Fetching messages GET /api/admin/applications/' + id + '/messages');
    try {
      const data = await api.get<ApplicationMessage[]>(`/api/admin/applications/${id}/messages`);
      console.log('[AppDetail] Fetched', data.length, 'messages');
      setMessages(data);
    } catch (e: unknown) {
      console.error('[AppDetail] Fetch messages error:', e instanceof Error ? e.message : e);
    }
  }, [id]);

  useEffect(() => {
    Promise.all([fetchApplication(), fetchMessages()]).finally(() => setLoading(false));
  }, [fetchApplication, fetchMessages]);

  const handleApprove = async () => {
    console.log('[AppDetail] Approve button pressed for application:', id);
    setActionLoading(true);
    try {
      await api.post(`/api/admin/applications/${id}/approve`, {});
      console.log('[AppDetail] Application approved successfully');
      Alert.alert('Approved', 'The application has been approved and the therapist is now live.', [
        {
          text: 'OK',
          onPress: () => {
            console.log('[AppDetail] Approve alert dismissed, navigating back');
            router.back();
          },
        },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to approve.';
      console.error('[AppDetail] Approve error:', msg);
      Alert.alert('Error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async () => {
    console.log('[AppDetail] Reject submit pressed for application:', id, 'reason:', rejectReason);
    setRejectError(null);
    setActionLoading(true);
    try {
      const body: { reason?: string } = {};
      if (rejectReason.trim()) body.reason = rejectReason.trim();
      await api.post(`/api/admin/applications/${id}/reject`, body);
      console.log('[AppDetail] Application rejected successfully');
      setShowRejectModal(false);
      setRejectReason('');
      Alert.alert('Rejected', 'The application has been rejected.', [
        {
          text: 'OK',
          onPress: () => {
            console.log('[AppDetail] Reject alert dismissed, navigating back');
            router.back();
          },
        },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to reject.';
      console.error('[AppDetail] Reject error:', msg);
      setRejectError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async () => {
    const text = messageText.trim();
    if (!text) return;
    console.log('[AppDetail] Send message pressed, text length:', text.length);
    setSendingMessage(true);
    try {
      const created = await api.post<ApplicationMessage>(
        `/api/admin/applications/${id}/messages`,
        { message: text },
      );
      console.log('[AppDetail] Message sent, id:', created.id);
      setMessages((prev) => [...prev, created]);
      setMessageText('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to send message.';
      console.error('[AppDetail] Send message error:', msg);
      Alert.alert('Error', msg);
    } finally {
      setSendingMessage(false);
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
        <Stack.Screen
          options={{ title: 'Application', headerBackButtonDisplayMode: 'minimal' }}
        />
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
        <Stack.Screen
          options={{ title: 'Application', headerBackButtonDisplayMode: 'minimal' }}
        />
        <Text
          style={{
            fontSize: 16,
            color: COLORS.danger,
            fontFamily: 'DMSans_400Regular',
            textAlign: 'center',
          }}
        >
          {error || 'Application not found.'}
        </Text>
      </View>
    );
  }

  const sc = getStatusColor(application.status);
  const sessionFeeDisplay =
    application.session_fee != null
      ? `$${Number(application.session_fee).toFixed(0)} / session`
      : 'Not specified';
  const experienceDisplay =
    application.years_experience != null
      ? `${application.years_experience} year${application.years_experience !== 1 ? 's' : ''}`
      : 'Not specified';
  const submittedDate = new Date(application.created_at).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const location = application.city ?? application.location ?? '';
  const isPending = application.status === 'pending';
  const statusLabel =
    application.status === 'pending'
      ? 'Pending Review'
      : application.status.charAt(0).toUpperCase() + application.status.slice(1);

  return (
    <>
      <Stack.Screen
        options={{
          title: application.name,
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
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
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

          {/* Rejected notes banner */}
          {application.status === 'rejected' && application.admin_notes ? (
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
                {application.admin_notes}
              </Text>
            </View>
          ) : null}

          {/* Applicant info */}
          <InfoCard title="Applicant">
            <InfoRow label="Name" value={application.name} />
            <InfoRow label="Email" value={application.email} icon={<Mail size={13} color={COLORS.textTertiary} />} />
            {application.phone ? (
              <InfoRow label="Phone" value={application.phone} icon={<Phone size={13} color={COLORS.textTertiary} />} />
            ) : null}
            {location ? (
              <InfoRow label="City" value={location} icon={<MapPin size={13} color={COLORS.textTertiary} />} />
            ) : null}
            {application.website_url ? (
              <InfoRow label="Website" value={application.website_url} icon={<Globe size={13} color={COLORS.textTertiary} />} />
            ) : null}
          </InfoCard>

          {/* Professional details */}
          <InfoCard title="Professional Details">
            <InfoRow
              label="Session fee"
              value={sessionFeeDisplay}
              icon={<DollarSign size={13} color={COLORS.textTertiary} />}
            />
            <InfoRow
              label="Experience"
              value={experienceDisplay}
              icon={<Briefcase size={13} color={COLORS.textTertiary} />}
            />
            {application.accepting_new_clients != null ? (
              <InfoRow
                label="Accepting clients"
                value={application.accepting_new_clients ? 'Yes' : 'No'}
              />
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

          {/* Specialties */}
          <InfoCard title="Specialties & Services">
            <TagRow label="Specialties" tags={application.specialties ?? []} />
            <TagRow label="Therapy types" tags={application.therapy_types ?? []} />
            <TagRow label="Insurance accepted" tags={application.insurances ?? []} />
            <TagRow label="Languages" tags={application.languages ?? []} />
          </InfoCard>

          {/* Action buttons — pending only */}
          {isPending ? (
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

          {/* Messages / Notes section */}
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: COLORS.border,
              overflow: 'hidden',
            }}
          >
            {/* Section header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                padding: 16,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.border,
              }}
            >
              <MessageSquare size={16} color={COLORS.primary} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: COLORS.text,
                  fontFamily: 'DMSans_700Bold',
                  flex: 1,
                }}
              >
                Notes / Messages to Applicant
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: COLORS.textTertiary,
                  fontFamily: 'DMSans_400Regular',
                }}
              >
                {messages.length}
              </Text>
            </View>

            {/* Message list */}
            {messages.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: COLORS.textTertiary,
                    fontFamily: 'DMSans_400Regular',
                    textAlign: 'center',
                  }}
                >
                  No messages yet. Send a note to the applicant below.
                </Text>
              </View>
            ) : (
              <View style={{ padding: 12, gap: 10 }}>
                {messages.map((msg) => {
                  const msgDate = new Date(msg.created_at).toLocaleDateString('en-CA', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <View
                      key={msg.id}
                      style={{
                        backgroundColor: COLORS.primaryMuted,
                        borderRadius: 12,
                        borderCurve: 'continuous',
                        padding: 12,
                        gap: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: COLORS.text,
                          fontFamily: 'DMSans_400Regular',
                          lineHeight: 20,
                        }}
                        selectable
                      >
                        {msg.message}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: COLORS.textTertiary,
                          fontFamily: 'DMSans_400Regular',
                        }}
                      >
                        {msgDate}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Message input */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: 10,
                padding: 12,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: COLORS.border,
              }}
            >
              <TextInput
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Write a note or message..."
                placeholderTextColor={COLORS.textTertiary}
                multiline
                style={{
                  flex: 1,
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 12,
                  borderCurve: 'continuous',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: COLORS.text,
                  fontFamily: 'DMSans_400Regular',
                  minHeight: 42,
                  maxHeight: 120,
                  textAlignVertical: 'top',
                }}
              />
              <AnimatedPressable
                onPress={handleSendMessage}
                disabled={sendingMessage || !messageText.trim()}
                scaleValue={0.9}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor:
                      messageText.trim() ? COLORS.primary : COLORS.surfaceSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {sendingMessage ? (
                    <ActivityIndicator
                      color={messageText.trim() ? '#fff' : COLORS.textTertiary}
                      size="small"
                    />
                  ) : (
                    <Send
                      size={17}
                      color={messageText.trim() ? '#fff' : COLORS.textTertiary}
                    />
                  )}
                </View>
              </AnimatedPressable>
            </View>
          </View>
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
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                        Confirm Reject
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
