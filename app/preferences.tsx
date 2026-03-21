import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { LogIn, Check, Save } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
};

const GENDERS = ['Female', 'Male', 'Non-binary', 'No preference'];
const SPECIALTIES = [
  'Addiction & Substance Use',
  'ADHD',
  'Anger Management',
  'Anxiety',
  'Autism Spectrum',
  'Bipolar Disorder',
  'Borderline Personality Disorder',
  'Burnout',
  'Child Behavioural Issues',
  'Chronic Fatigue',
  'Chronic Illness & Pain',
  'Cultural & Racial Identity',
  'Depression',
  'Dissociative Disorders',
  'Divorce & Separation',
  'Eating Disorders',
  'Elder Care & Aging',
  'Family Conflict',
  'Gender Identity',
  'Grief & Loss',
  'Immigration & Acculturation',
  'Infidelity & Betrayal',
  'Insomnia & Sleep Issues',
  'Learning Disabilities',
  'LGBTQ+ Issues',
  'Life Transitions',
  'Men\'s Mental Health',
  'OCD',
  'Panic Disorder',
  'Parenting Challenges',
  'Personality Disorders',
  'Phobias',
  'Postpartum Depression',
  'Pregnancy & Fertility',
  'Relationship Issues',
  'Schizophrenia & Psychosis',
  'Self-Esteem',
  'Sexual Issues',
  'Social Anxiety',
  'Spiritual & Existential Concerns',
  'Stress Management',
  'Teen & Adolescent Issues',
  'Trauma & PTSD',
  'Women\'s Mental Health',
  'Work & Career Stress',
];
const THERAPY_TYPES = [
  'ACT (Acceptance & Commitment Therapy)',
  'Art Therapy',
  'Brainspotting',
  'CBT (Cognitive Behavioural Therapy)',
  'Compassion-Focused Therapy',
  'Couples Therapy',
  'DBT (Dialectical Behaviour Therapy)',
  'EMDR',
  'Emotionally Focused Therapy (EFT)',
  'Existential Therapy',
  'Family Therapy',
  'Gestalt Therapy',
  'Gottman Method',
  'Group Therapy',
  'Humanistic Therapy',
  'Hypnotherapy',
  'Integrative Therapy',
  'Internal Family Systems (IFS)',
  'Interpersonal Therapy (IPT)',
  'Mindfulness-Based Therapy',
  'Motivational Interviewing',
  'Music Therapy',
  'Narrative Therapy',
  'Person-Centred Therapy',
  'Play Therapy',
  'Positive Psychology',
  'Psychoanalytic Therapy',
  'Psychodynamic Therapy',
  'Rational Emotive Behaviour Therapy (REBT)',
  'Sand Tray Therapy',
  'Schema Therapy',
  'Sensorimotor Psychotherapy',
  'Solution-Focused Therapy',
  'Somatic Therapy',
  'Trauma-Focused CBT',
];
const INSURANCES = [
  'Blue Cross', 'Sun Life', 'Manulife', 'Great-West Life', 'Desjardins',
  'Pacific Blue Cross', 'MSP', 'No Insurance Required',
];
const LOCATIONS = [
  'All of BC', 'Vancouver', 'Burnaby', 'Richmond', 'Surrey', 'North Vancouver', 'West Vancouver',
  'Coquitlam', 'Langley', 'Abbotsford', 'Victoria', 'Kelowna', 'Online/Virtual',
];

interface Preferences {
  genders: string[];
  specialties: string[];
  therapy_types: string[];
  insurances: string[];
  location: string | null;
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
        marginBottom: 10,
        marginTop: 4,
      }}
    >
      {title}
    </Text>
  );
}

function MultiChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable onPress={onPress} scaleValue={0.95}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 13,
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: selected ? COLORS.primary : COLORS.surface,
          borderWidth: 1,
          borderColor: selected ? COLORS.primary : COLORS.border,
        }}
      >
        {selected ? <Check size={12} color="#fff" /> : null}
        <Text
          style={{
            fontSize: 13,
            fontWeight: selected ? '600' : '400',
            color: selected ? '#fff' : COLORS.textSecondary,
            fontFamily: selected ? 'DMSans_600SemiBold' : 'DMSans_400Regular',
          }}
        >
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

function SingleChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable onPress={onPress} scaleValue={0.95}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 13,
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: selected ? COLORS.primary : COLORS.surface,
          borderWidth: 1,
          borderColor: selected ? COLORS.primary : COLORS.border,
        }}
      >
        {selected ? <Check size={12} color="#fff" /> : null}
        <Text
          style={{
            fontSize: 13,
            fontWeight: selected ? '600' : '400',
            color: selected ? '#fff' : COLORS.textSecondary,
            fontFamily: selected ? 'DMSans_600SemiBold' : 'DMSans_400Regular',
          }}
        >
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

export default function PreferencesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [prefs, setPrefs] = useState<Preferences>({
    genders: [],
    specialties: [],
    therapy_types: [],
    insurances: [],
    location: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    console.log('[Preferences] Fetching preferences GET /api/preferences');
    api.get<Preferences>('/api/preferences')
      .then((data) => {
        console.log('[Preferences] Preferences loaded');
        setPrefs({
          genders: data.genders ?? [],
          specialties: data.specialties ?? [],
          therapy_types: data.therapy_types ?? [],
          insurances: data.insurances ?? [],
          location: data.location ?? null,
        });
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : 'Failed to load preferences';
        console.error('[Preferences] Fetch error:', msg);
        // Non-fatal — start with empty prefs
      })
      .finally(() => setLoading(false));
  }, [user]);

  const toggleMulti = useCallback((key: keyof Omit<Preferences, 'location'>, value: string) => {
    console.log('[Preferences] Toggle multi:', key, value);
    setPrefs((prev) => {
      const arr = prev[key] as string[];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
    setSaved(false);
  }, []);

  const toggleLocation = useCallback((value: string) => {
    console.log('[Preferences] Toggle location:', value);
    setPrefs((prev) => ({ ...prev, location: prev.location === value ? null : value }));
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    console.log('[Preferences] Save preferences pressed, PUT /api/preferences', prefs);
    setSaving(true);
    setError(null);
    try {
      await api.patch('/api/preferences', prefs);
      console.log('[Preferences] Preferences saved successfully');
      setSaved(true);
      if (Platform.OS === 'ios') {
        const Haptics = await import('expo-haptics');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save preferences';
      console.error('[Preferences] Save error:', msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [prefs]);

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Stack.Screen options={{ title: 'My Preferences' }} />
        <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <LogIn size={32} color={COLORS.primary} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold', marginBottom: 8, textAlign: 'center' }}>
          Sign in to save preferences
        </Text>
        <Text style={{ fontSize: 15, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
          Save your search preferences to get personalized therapist recommendations.
        </Text>
        <AnimatedPressable onPress={() => { console.log('[Preferences] Sign in button pressed'); router.push('/auth-screen'); }}>
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
        <Stack.Screen options={{ title: 'My Preferences' }} />
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen options={{ title: 'My Preferences' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 120, paddingTop: 8 }}
      >
        {/* Gender */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
          <SectionTitle title="Preferred Gender" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {GENDERS.map((g) => (
              <MultiChip
                key={g}
                label={g}
                selected={prefs.genders.includes(g)}
                onPress={() => toggleMulti('genders', g)}
              />
            ))}
          </View>
        </View>

        {/* Specialties */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
          <SectionTitle title="Specialties" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SPECIALTIES.map((s) => (
              <MultiChip
                key={s}
                label={s}
                selected={prefs.specialties.includes(s)}
                onPress={() => toggleMulti('specialties', s)}
              />
            ))}
          </View>
        </View>

        {/* Therapy Types */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
          <SectionTitle title="Therapy Types" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {THERAPY_TYPES.map((t) => (
              <MultiChip
                key={t}
                label={t}
                selected={prefs.therapy_types.includes(t)}
                onPress={() => toggleMulti('therapy_types', t)}
              />
            ))}
          </View>
        </View>

        {/* Insurance */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
          <SectionTitle title="Insurance Accepted" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {INSURANCES.map((ins) => (
              <MultiChip
                key={ins}
                label={ins}
                selected={prefs.insurances.includes(ins)}
                onPress={() => toggleMulti('insurances', ins)}
              />
            ))}
          </View>
        </View>

        {/* Location */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
          <SectionTitle title="Preferred Location" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {LOCATIONS.map((loc) => (
              <SingleChip
                key={loc}
                label={loc}
                selected={prefs.location === loc}
                onPress={() => toggleLocation(loc)}
              />
            ))}
          </View>
        </View>

        {/* Error */}
        {error ? (
          <View style={{ backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <Text style={{ fontSize: 13, color: '#EF4444', fontFamily: 'DMSans_400Regular' }}>{error}</Text>
          </View>
        ) : null}

        {/* Success toast */}
        {saved ? (
          <View style={{ backgroundColor: '#D1FAE5', borderRadius: 12, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Check size={16} color={COLORS.success} />
            <Text style={{ fontSize: 13, color: COLORS.success, fontFamily: 'DMSans_600SemiBold' }}>Preferences saved!</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Save button — fixed at bottom */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 16,
          paddingTop: 12,
          backgroundColor: COLORS.background,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        }}
      >
        <AnimatedPressable onPress={handleSave} disabled={saving}>
          <View
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 14,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: saving ? 0.7 : 1,
              boxShadow: '0 4px 16px rgba(45, 122, 95, 0.3)',
            }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Save size={17} color="#fff" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: 'DMSans_700Bold' }}>
                  Save Preferences
                </Text>
              </>
            )}
          </View>
        </AnimatedPressable>
      </View>
    </View>
  );
}
