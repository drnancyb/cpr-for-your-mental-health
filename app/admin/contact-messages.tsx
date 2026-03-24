import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ShieldOff, Mail, Trash2, CheckCircle, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react-native';

const COLORS = {
  background: '#F4F7F5',
  surface: '#FFFFFF',
  surfaceUnread: '#F0FAF5',
  text: '#1A2E25',
  textSecondary: '#5C7A6A',
  textTertiary: '#9BB5A8',
  primary: '#2D7A5F',
  primaryMuted: '#E8F4EF',
  border: 'rgba(45, 122, 95, 0.08)',
  borderUnread: '#2D7A5F',
  danger: '#EF4444',
  success: '#34A853',
  warning: '#F59E0B',
};

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  created_at: string;
}

function MessageCard({
  item,
  onMarkRead,
  onDelete,
  markReadLoading,
  deleteLoading,
}: {
  item: ContactMessage;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  markReadLoading: boolean;
  deleteLoading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const dateStr = new Date(item.created_at).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = new Date(item.created_at).toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateTimeStr = dateStr + ' · ' + timeStr;

  const cardBg = item.read ? COLORS.surface : COLORS.surfaceUnread;
  const leftBorderColor = item.read ? 'transparent' : COLORS.borderUnread;
  const unreadBadgeVisible = !item.read;

  const handleToggle = () => {
    console.log('[ContactMessages] Card tapped:', item.id, 'expanded:', !expanded);
    setExpanded((v) => !v);
  };

  const handleMarkRead = () => {
    console.log('[ContactMessages] Mark as Read pressed:', item.id);
    onMarkRead(item.id);
  };

  const handleDelete = () => {
    console.log('[ContactMessages] Delete pressed:', item.id);
    onDelete(item.id);
  };

  return (
    <View
      style={{
        backgroundColor: cardBg,
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 16,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        borderLeftWidth: item.read ? 1 : 4,
        borderLeftColor: leftBorderColor,
      }}
    >
      <AnimatedPressable onPress={handleToggle} scaleValue={0.99}>
        <View style={{ padding: 14 }}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.primary, fontFamily: 'DMSans_700Bold' }}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', flex: 1 }} numberOfLines={1}>
                  {item.name}
                </Text>
                {unreadBadgeVisible ? (
                  <View style={{ backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff', fontFamily: 'DMSans_700Bold' }}>
                      UNREAD
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
                {item.email}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={{ fontSize: 11, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
                {dateTimeStr}
              </Text>
              {expanded ? (
                <ChevronUp size={16} color={COLORS.textTertiary} />
              ) : (
                <ChevronDown size={16} color={COLORS.textTertiary} />
              )}
            </View>
          </View>

          {/* Subject */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', marginTop: 10, marginBottom: 4 }} numberOfLines={expanded ? undefined : 1}>
            {item.subject}
          </Text>

          {/* Message */}
          <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', lineHeight: 19 }} numberOfLines={expanded ? undefined : 2}>
            {item.message}
          </Text>
        </View>
      </AnimatedPressable>

      {/* Action buttons — always visible */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4 }}>
        {!item.read ? (
          <AnimatedPressable
            onPress={handleMarkRead}
            disabled={markReadLoading || deleteLoading}
            scaleValue={0.96}
            style={{ flex: 1 }}
          >
            <View style={{ height: 36, borderRadius: 10, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5, borderWidth: 1, borderColor: 'rgba(45,122,95,0.15)' }}>
              {markReadLoading ? (
                <ActivityIndicator color={COLORS.primary} size="small" />
              ) : (
                <>
                  <CheckCircle size={14} color={COLORS.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' }}>
                    Mark as Read
                  </Text>
                </>
              )}
            </View>
          </AnimatedPressable>
        ) : null}
        <AnimatedPressable
          onPress={handleDelete}
          disabled={markReadLoading || deleteLoading}
          scaleValue={0.96}
          style={item.read ? { flex: 1 } : {}}
        >
          <View style={{ height: 36, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5, paddingHorizontal: 14 }}>
            {deleteLoading ? (
              <ActivityIndicator color={COLORS.danger} size="small" />
            ) : (
              <>
                <Trash2 size={14} color={COLORS.danger} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.danger, fontFamily: 'DMSans_600SemiBold' }}>
                  Delete
                </Text>
              </>
            )}
          </View>
        </AnimatedPressable>
      </View>
    </View>
  );
}

export default function ContactMessagesScreen() {
  const { user, loading: authLoading } = useAuth();

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markReadLoading, setMarkReadLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    setError(null);
    console.log('[ContactMessages] GET /api/admin/contact-messages');
    try {
      const data = await api.get<{ messages: ContactMessage[] } | ContactMessage[]>('/api/admin/contact-messages');
      const messagesList = Array.isArray(data)
        ? data
        : Array.isArray((data as { messages: ContactMessage[] }).messages)
          ? (data as { messages: ContactMessage[] }).messages
          : [];
      console.log('[ContactMessages] Fetched', messagesList.length, 'messages');
      setMessages(messagesList);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load messages.';
      console.error('[ContactMessages] Fetch error:', msg);
      setError(msg);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      setLoading(true);
      fetchMessages().finally(() => setLoading(false));
    }
  }, [authLoading, fetchMessages]);

  const handleRefresh = useCallback(async () => {
    console.log('[ContactMessages] Pull-to-refresh');
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  }, [fetchMessages]);

  const handleMarkRead = useCallback(async (id: string) => {
    console.log('[ContactMessages] PATCH /api/admin/contact-messages/' + id + '/read');
    setMarkReadLoading(id);
    try {
      await api.patch(`/api/admin/contact-messages/${id}/read`, {});
      console.log('[ContactMessages] Marked as read:', id);
      setMessages((prev) => prev.map((m) => m.id === id ? { ...m, read: true } : m));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to mark as read.';
      console.error('[ContactMessages] Mark read error:', msg);
      Alert.alert('Error', msg);
    } finally {
      setMarkReadLoading(null);
    }
  }, []);

  const handleDelete = useCallback((id: string) => {
    console.log('[ContactMessages] Delete confirmation for:', id);
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => console.log('[ContactMessages] Delete cancelled:', id) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('[ContactMessages] DELETE /api/admin/contact-messages/' + id);
            setDeleteLoading(id);
            try {
              await api.delete(`/api/admin/contact-messages/${id}`);
              console.log('[ContactMessages] Deleted:', id);
              setMessages((prev) => prev.filter((m) => m.id !== id));
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Failed to delete message.';
              console.error('[ContactMessages] Delete error:', msg);
              Alert.alert('Error', msg);
            } finally {
              setDeleteLoading(null);
            }
          },
        },
      ],
    );
  }, []);

  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: 'Contact Messages' }} />
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Stack.Screen options={{ title: 'Contact Messages' }} />
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

  const unreadCount = messages.filter((m) => !m.read).length;
  const unreadLabel = unreadCount > 0 ? String(unreadCount) + ' unread' : 'All read';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen options={{ title: 'Contact Messages' }} />
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
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
            ) : messages.length > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={{ backgroundColor: unreadCount > 0 ? COLORS.primaryMuted : COLORS.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: unreadCount > 0 ? 'rgba(45,122,95,0.2)' : COLORS.border }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: unreadCount > 0 ? COLORS.primary : COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>
                    {unreadLabel}
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
                  {String(messages.length) + ' total'}
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View style={{ paddingTop: 80, alignItems: 'center', paddingHorizontal: 32 }}>
              <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <MessageSquare size={28} color={COLORS.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', marginBottom: 8, textAlign: 'center' }}>
                No messages yet
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20 }}>
                Contact form submissions will appear here.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <MessageCard
            item={item}
            onMarkRead={handleMarkRead}
            onDelete={handleDelete}
            markReadLoading={markReadLoading === item.id}
            deleteLoading={deleteLoading === item.id}
          />
        )}
      />
    </View>
  );
}
