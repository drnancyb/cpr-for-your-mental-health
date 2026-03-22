import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldOff } from 'lucide-react-native';

const COLORS = {
  background: '#F4F7F5',
  text: '#1A2E25',
  textSecondary: '#5C7A6A',
  primary: '#2D7A5F',
  danger: '#EF4444',
};

export default function AdminLayout() {
  const { user, loading } = useAuth();

  // Still loading AND no user yet — show spinner
  if (loading && !user) {
    console.log('[AdminLayout] Auth loading, no user yet — showing spinner');
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  // Done loading, no user at all — redirect to login
  if (!loading && !user) {
    console.log('[AdminLayout] No user — redirecting to /admin-login');
    return <Redirect href="/admin-login" />;
  }

  // User is present but not admin — only show access denied when we are
  // certain loading is complete (avoids flash while adminOverride is being set
  // but the background fetchUser hasn't resolved yet)
  if (user && user.role !== 'admin' && !loading) {
    console.log('[AdminLayout] User is not admin (role:', user?.role, ') — showing access denied');
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
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

  // User is set and is admin (role check passes), or still loading but user is
  // already present (admin override was set synchronously before fetchUser finished)
  if (user?.role === 'admin') {
    console.log('[AdminLayout] Admin user confirmed:', user.email);
    return <Slot />;
  }

  // Fallback: still loading with a non-admin user present — keep spinner
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={COLORS.primary} />
    </View>
  );
}
