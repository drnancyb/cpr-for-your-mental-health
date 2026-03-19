/**
 * Notification Preferences Screen
 *
 * Shows notification permission status and allows users to manage
 * their notification preferences. Persists settings via the backend API.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Linking,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useNotifications } from "@/contexts/NotificationContext";
import { api } from "@/utils/api";

interface NotificationPreferences {
  booking_updates: boolean;
  new_messages: boolean;
  promotions: boolean;
  reminders: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  booking_updates: true,
  new_messages: true,
  promotions: true,
  reminders: true,
};

const NOTIFICATION_CATEGORIES: {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}[] = [
  {
    key: "booking_updates",
    label: "Booking Updates",
    description: "Confirmations, cancellations, and status changes",
  },
  {
    key: "new_messages",
    label: "New Messages",
    description: "Replies and messages from therapists",
  },
  {
    key: "promotions",
    label: "Promotions",
    description: "Special offers and featured therapist highlights",
  },
  {
    key: "reminders",
    label: "Reminders",
    description: "Upcoming session reminders and tips",
  },
];

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const { hasPermission, permissionDenied, isWeb, requestPermission, sendTag, deleteTag } =
    useNotifications();

  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    console.log("[NotificationPreferences] GET /api/notification-preferences");
    setError(null);
    try {
      const data = await api.get<NotificationPreferences>("/api/notification-preferences");
      console.log("[NotificationPreferences] Loaded preferences:", data);
      setPrefs(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load preferences";
      console.error("[NotificationPreferences] Load error:", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleEnableNotifications = async () => {
    console.log("[NotificationPreferences] Enable notifications pressed");
    if (permissionDenied) {
      Alert.alert(
        "Notifications Disabled",
        "To receive notifications, please enable them in your device settings.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => {
              if (Platform.OS === "ios") {
                Linking.openURL("app-settings:");
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
      return;
    }
    await requestPermission();
  };

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    console.log("[NotificationPreferences] Toggle:", key, value);
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);

    // Sync with OneSignal tags
    if (value) {
      sendTag(`notify_${key}`, "true");
    } else {
      deleteTag(`notify_${key}`);
    }

    // Persist to backend
    setSaving(true);
    console.log("[NotificationPreferences] PATCH /api/notification-preferences", updated);
    try {
      await api.patch("/api/notification-preferences", updated);
      console.log("[NotificationPreferences] Preferences saved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      console.error("[NotificationPreferences] Save error:", msg);
      // Revert on failure
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  };

  if (isWeb) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { console.log("[NotificationPreferences] Back pressed"); router.back(); }}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.centeredContent}>
          <Text style={styles.webMessage}>
            Push notifications are available in the mobile app.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { console.log("[NotificationPreferences] Back pressed"); router.back(); }}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 60 }}>
          {saving ? <ActivityIndicator size="small" color="#007AFF" /> : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : error ? (
        <View style={styles.centeredContent}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => { console.log("[NotificationPreferences] Retry pressed"); setLoading(true); loadPreferences(); }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {/* Permission Status */}
          <View style={styles.section}>
            <View style={styles.permissionCard}>
              <View style={styles.permissionHeader}>
                <Text style={styles.permissionIcon}>
                  {hasPermission ? "🔔" : "🔕"}
                </Text>
                <View style={styles.permissionTextContainer}>
                  <Text style={styles.permissionTitle}>
                    {hasPermission
                      ? "Notifications Enabled"
                      : "Notifications Disabled"}
                  </Text>
                  <Text style={styles.permissionDescription}>
                    {hasPermission
                      ? "You'll receive push notifications"
                      : "Enable notifications to stay updated"}
                  </Text>
                </View>
              </View>
              {!hasPermission && (
                <TouchableOpacity
                  style={styles.enableButton}
                  onPress={handleEnableNotifications}
                >
                  <Text style={styles.enableButtonText}>Enable Notifications</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Notification Categories */}
          {hasPermission && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notification Types</Text>
              {NOTIFICATION_CATEGORIES.map((category) => (
                <View key={category.key} style={styles.categoryRow}>
                  <View style={styles.categoryText}>
                    <Text style={styles.categoryLabel}>{category.label}</Text>
                    <Text style={styles.categoryDescription}>
                      {category.description}
                    </Text>
                  </View>
                  <Switch
                    value={prefs[category.key]}
                    onValueChange={(value) => handleToggle(category.key, value)}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  backButton: {
    fontSize: 16,
    color: "#007AFF",
    width: 60,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
  },
  content: {
    flex: 1,
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  webMessage: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
  },
  errorText: {
    fontSize: 15,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  section: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  permissionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  permissionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  permissionIcon: {
    fontSize: 32,
  },
  permissionTextContainer: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
  },
  permissionDescription: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 2,
  },
  enableButton: {
    marginTop: 16,
    backgroundColor: "#007AFF",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  enableButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  categoryText: {
    flex: 1,
    marginRight: 12,
  },
  categoryLabel: {
    fontSize: 16,
    color: "#000",
  },
  categoryDescription: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 2,
  },
});
