import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { api } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Save, CheckCircle } from 'lucide-react-native';

const COLORS = {
  background: '#F4F7F5',
  surface: '#FFFFFF',
  surfaceSecondary: '#EDF2EF',
  text: '#1A2E25',
  textSecondary: '#5C7A6A',
  textTertiary: '#9BB5A8',
  primary: '#2D7A5F',
  primaryMuted: '#E8F4EF',
  border: 'rgba(45, 122, 95, 0.12)',
  borderInput: 'rgba(45, 122, 95, 0.2)',
  success: '#34A853',
  danger: '#EF4444',
};

const CANADIAN_LOCATIONS = [
  'All of BC',
  '100 Mile House',
  'Abbotsford',
  'Armstrong',
  'Ashcroft',
  'Barriere',
  'Blind Bay',
  'Burns Lake',
  'Cache Creek',
  'Campbell River',
  'Castlegar',
  'Chase',
  'Chemainus',
  'Chetwynd',
  'Chilliwack',
  'Clearwater',
  'Coldstream',
  'Colwood',
  'Comox',
  'Coquitlam',
  'Courtenay',
  'Cranbrook',
  'Creston',
  'Dawson Creek',
  'Delta',
  'Duncan',
  'Elkford',
  'Enderby',
  'Esquimalt',
  'Fernie',
  'Fort Nelson',
  'Fort St. John',
  'Golden',
  'Grand Forks',
  'Greenwood',
  'Hazelton',
  'Hedley',
  'Hope',
  'Houston',
  'Invermere',
  'Kaleden',
  'Kamloops',
  'Kelowna',
  'Keremeos',
  'Kimberley',
  'Kitimat',
  'Ladysmith',
  'Lake Country',
  'Langford',
  'Langley',
  'Lillooet',
  'Logan Lake',
  'Lumby',
  'Lytton',
  'Mackenzie',
  'Maple Ridge',
  'McBride',
  'Merritt',
  'Midway',
  'Mission',
  'Nanaimo',
  'Nelson',
  'New Westminster',
  'Nicola Valley',
  'North Vancouver',
  'Oak Bay',
  'Okanagan Falls',
  'Oliver',
  'Osoyoos',
  'Parksville',
  'Peachland',
  'Penticton',
  'Port Alberni',
  'Port Coquitlam',
  'Powell River',
  'Prince George',
  'Prince Rupert',
  'Princeton',
  'Qualicum Beach',
  'Quesnel',
  'Revelstoke',
  'Richmond',
  'Saanich',
  'Salmon Arm',
  'Sidney',
  'Sicamous',
  'Skaha Lake',
  'Smithers',
  'Sooke',
  'Sorrento',
  'Spallumcheen',
  'Sparwood',
  'Squamish',
  'Sun Peaks',
  'Summerland',
  'Surrey',
  'Tappen',
  'Terrace',
  'Trail',
  'Tumbler Ridge',
  'Valemount',
  'Vancouver',
  'Vanderhoof',
  'Vernon',
  'Victoria',
  'View Royal',
  'West Kelowna',
  'West Vancouver',
  'Westbank',
  'White Rock',
  'Williams Lake',
  'Whistler',
  'Online / Virtual',
];

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

const LANGUAGES_OPTIONS = [
  'English', 'French', 'Mandarin', 'Cantonese', 'Spanish', 'Punjabi', 'Tagalog',
  'Arabic', 'Hindi', 'Urdu', 'Korean', 'Vietnamese', 'Portuguese', 'Italian', 'German', 'Japanese', 'Other',
];

const SPECIALTIES_OPTIONS = [
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
  "Men's Mental Health",
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
  "Women's Mental Health",
  'Work & Career Stress',
];

const THERAPY_TYPES_OPTIONS = [
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

const INSURANCES_OPTIONS = [
  'ICBC', 'WorkSafeBC', 'Blue Cross', 'Sun Life', 'Manulife', 'Great-West Life', 'Desjardins', 'Self-pay',
];

interface TherapistProfile {
  name: string;
  photoUrl: string;
  title: string;
  bio: string;
  location: string;
  gender: string;
  phone: string;
  email: string;
  websiteUrl: string;
  sessionFee: number | string;
  yearsExperience: number | string;
  acceptingNewClients: boolean;
  slidingScale: boolean;
  slidingScaleMinFee: number | string;
  specialties: string[];
  therapyTypes: string[];
  insurances: string[];
  languages: string[];
}

const EMPTY_PROFILE: TherapistProfile = {
  name: '',
  photoUrl: '',
  title: '',
  bio: '',
  location: '',
  gender: '',
  phone: '',
  email: '',
  websiteUrl: '',
  sessionFee: '',
  yearsExperience: '',
  acceptingNewClients: false,
  slidingScale: false,
  slidingScaleMinFee: '',
  specialties: [],
  therapyTypes: [],
  insurances: [],
  languages: [],
};

function SectionTitle({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textTertiary,
        fontFamily: 'DMSans_600SemiBold',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        marginBottom: 12,
        marginTop: 4,
      }}
    >
      {title}
    </Text>
  );
}

function FieldLabel({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>
        {label}
      </Text>
      {optional && (
        <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
          (optional)
        </Text>
      )}
    </View>
  );
}

function StyledInput({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
  autoCorrect,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'url' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  autoCorrect?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textTertiary}
      multiline={multiline}
      keyboardType={keyboardType ?? 'default'}
      autoCapitalize={autoCapitalize ?? 'sentences'}
      autoCorrect={autoCorrect ?? true}
      style={{
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.borderInput,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: multiline ? 12 : 0,
        height: multiline ? undefined : 46,
        minHeight: multiline ? 90 : undefined,
        fontSize: 15,
        color: COLORS.text,
        fontFamily: 'DMSans_400Regular',
        textAlignVertical: multiline ? 'top' : 'center',
      }}
    />
  );
}

function ChipSelector({
  label,
  options,
  selected,
  onToggle,
  optional,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
  optional?: boolean;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <FieldLabel label={label} optional={optional} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <AnimatedPressable key={opt} onPress={() => onToggle(opt)} scaleValue={0.95}>
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isSelected ? COLORS.primary : COLORS.surfaceSecondary,
                  borderWidth: 1,
                  borderColor: isSelected ? COLORS.primary : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: isSelected ? '#FFFFFF' : COLORS.textSecondary,
                    fontFamily: 'DMSans_600SemiBold',
                  }}
                >
                  {opt}
                </Text>
              </View>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

function SingleSelector({
  label,
  options,
  selected,
  onSelect,
  optional,
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (val: string) => void;
  optional?: boolean;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <FieldLabel label={label} optional={optional} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => {
          const isSelected = selected === opt;
          return (
            <AnimatedPressable key={opt} onPress={() => onSelect(opt)} scaleValue={0.95}>
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isSelected ? COLORS.primary : COLORS.surfaceSecondary,
                  borderWidth: 1,
                  borderColor: isSelected ? COLORS.primary : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: isSelected ? '#FFFFFF' : COLORS.textSecondary,
                    fontFamily: 'DMSans_600SemiBold',
                  }}
                >
                  {opt}
                </Text>
              </View>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

export default function EditProfileScreen() {
  const [form, setForm] = useState<TherapistProfile>(EMPTY_PROFILE);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setField = useCallback(<K extends keyof TherapistProfile>(key: K, value: TherapistProfile[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleArrayField = useCallback(
    (key: 'specialties' | 'therapyTypes' | 'insurances' | 'languages', item: string) => {
      setForm((prev) => {
        const arr = prev[key] as string[];
        const next = arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
        console.log(`[EditProfile] Toggle ${key}:`, item, '→', next.includes(item) ? 'added' : 'removed');
        return { ...prev, [key]: next };
      });
    },
    [],
  );

  const toggleLocation = useCallback((loc: string) => {
    setSelectedLocations((prev) => {
      const next = prev.includes(loc) ? prev.filter((x) => x !== loc) : [...prev, loc];
      console.log('[EditProfile] Toggle location:', loc, '→', next.includes(loc) ? 'added' : 'removed');
      return next;
    });
  }, []);

  useEffect(() => {
    console.log('[EditProfile] Fetching therapist profile from GET /api/therapists/me');
    api.get<TherapistProfile>('/api/therapists/me')
      .then((data) => {
        console.log('[EditProfile] Profile loaded:', data?.name);
        const locationStr = data.location ?? '';
        const parsedLocations = locationStr
          ? locationStr.split(', ').map((s: string) => s.trim()).filter(Boolean)
          : [];
        setSelectedLocations(parsedLocations);
        setForm({
          name: data.name ?? '',
          photoUrl: data.photoUrl ?? '',
          title: data.title ?? '',
          bio: data.bio ?? '',
          location: locationStr,
          gender: data.gender ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          websiteUrl: data.websiteUrl ?? '',
          sessionFee: data.sessionFee != null ? String(data.sessionFee) : '',
          yearsExperience: data.yearsExperience != null ? String(data.yearsExperience) : '',
          acceptingNewClients: data.acceptingNewClients ?? false,
          slidingScale: data.slidingScale ?? false,
          slidingScaleMinFee: data.slidingScaleMinFee != null ? String(data.slidingScaleMinFee) : '',
          specialties: Array.isArray(data.specialties) ? data.specialties : [],
          therapyTypes: Array.isArray(data.therapyTypes) ? data.therapyTypes : [],
          insurances: Array.isArray(data.insurances) ? data.insurances : [],
          languages: Array.isArray(data.languages) ? data.languages : [],
        });
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : 'Failed to load profile';
        console.error('[EditProfile] Fetch error:', msg);
        setFetchError(msg);
      })
      .finally(() => setLoading(false));

    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const handleSave = useCallback(async () => {
    console.log('[EditProfile] Save button pressed');

    // Required field validation
    const missingFields: string[] = [];
    if (!form.name.trim()) missingFields.push('Full Name');
    if (!form.title.trim()) missingFields.push('Professional Title');
    if (!form.email.trim()) missingFields.push('Email');
    if (selectedLocations.length === 0) missingFields.push('Location');

    if (missingFields.length > 0) {
      console.log('[EditProfile] Validation failed — missing fields:', missingFields);
      Alert.alert('Required Fields Missing', `Please fill in the following fields:\n\n• ${missingFields.join('\n• ')}`);
      return;
    }

    // Numeric field validation
    const invalidNumeric: string[] = [];
    if (form.sessionFee !== '' && isNaN(Number(form.sessionFee))) {
      invalidNumeric.push('Session Fee');
    }
    if (form.yearsExperience !== '' && isNaN(Number(form.yearsExperience))) {
      invalidNumeric.push('Years of Experience');
    }

    if (invalidNumeric.length > 0) {
      console.log('[EditProfile] Validation failed — non-numeric fields:', invalidNumeric);
      Alert.alert('Invalid Number', `The following fields must be numbers:\n\n• ${invalidNumeric.join('\n• ')}`);
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    const sessionFeeNum = form.sessionFee !== '' ? Number(form.sessionFee) : null;
    const yearsExpNum = form.yearsExperience !== '' ? Number(form.yearsExperience) : null;
    const slidingScaleMinFeeNum = form.slidingScale && form.slidingScaleMinFee !== '' ? Number(form.slidingScaleMinFee) : null;
    const locationStr = selectedLocations.join(', ');

    const payload = {
      name: form.name,
      photoUrl: form.photoUrl || null,
      title: form.title,
      bio: form.bio,
      location: locationStr,
      gender: form.gender,
      phone: form.phone,
      email: form.email,
      websiteUrl: form.websiteUrl || null,
      sessionFee: sessionFeeNum,
      yearsExperience: yearsExpNum,
      acceptingNewClients: form.acceptingNewClients,
      slidingScale: form.slidingScale,
      slidingScaleMinFee: slidingScaleMinFeeNum,
      specialties: form.specialties,
      therapyTypes: form.therapyTypes,
      insurances: form.insurances,
      languages: form.languages,
    };

    console.log('[EditProfile] PUT /api/therapists/me payload keys:', Object.keys(payload));

    try {
      await api.put('/api/therapists/me', payload);
      console.log('[EditProfile] Profile saved successfully');
      setSaveSuccess(true);
      // Fix timer bug: clear any existing timer before setting a new one
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => {
        setSaveSuccess(false);
        router.back();
      }, 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save profile';
      console.error('[EditProfile] Save error:', msg);
      Alert.alert('Save Failed', msg);
    } finally {
      setSaving(false);
    }
  }, [form, selectedLocations]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: 'Edit Profile' }} />
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={{ marginTop: 12, fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
          Loading profile…
        </Text>
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Stack.Screen options={{ title: 'Edit Profile' }} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', marginBottom: 8, textAlign: 'center' }}>
          Couldn't load profile
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginBottom: 24 }}>
          {fetchError}
        </Text>
        <AnimatedPressable onPress={() => router.back()}>
          <View style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>Go Back</Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  const sessionFeeStr = String(form.sessionFee);
  const yearsExpStr = String(form.yearsExperience);
  const saveBtnLabel = saving ? 'Saving…' : saveSuccess ? 'Saved!' : 'Save Changes';
  const saveBtnBg = saveSuccess ? COLORS.success : COLORS.primary;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      <Stack.Screen options={{ title: 'Edit Profile' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48 }}
      >

        {/* Basic Info */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
          <SectionTitle title="Basic Info" />

          <View style={{ marginBottom: 14 }}>
            <FieldLabel label="Full Name" />
            <StyledInput
              value={form.name}
              onChangeText={(v) => setField('name', v)}
              placeholder="Dr. Jane Smith"
              autoCapitalize="words"
            />
          </View>

          <View style={{ marginBottom: 14 }}>
            <FieldLabel label="Professional Title" />
            <StyledInput
              value={form.title}
              onChangeText={(v) => setField('title', v)}
              placeholder="Registered Psychologist"
              autoCapitalize="words"
            />
          </View>

          <ChipSelector
            label="Location"
            options={CANADIAN_LOCATIONS}
            selected={selectedLocations}
            onToggle={toggleLocation}
          />

          <SingleSelector
            label="Gender"
            options={GENDERS}
            selected={form.gender}
            onSelect={(v) => {
              console.log('[EditProfile] Gender selected:', v);
              setField('gender', v);
            }}
            optional
          />
        </View>

        {/* Bio */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
          <SectionTitle title="About" />
          <FieldLabel label="Bio" optional />
          <StyledInput
            value={form.bio}
            onChangeText={(v) => setField('bio', v)}
            placeholder="Tell clients about your background, approach, and what to expect…"
            multiline
          />
        </View>

        {/* Contact */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
          <SectionTitle title="Contact" />

          <View style={{ marginBottom: 14 }}>
            <FieldLabel label="Email" />
            <StyledInput
              value={form.email}
              onChangeText={(v) => setField('email', v)}
              placeholder="jane@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={{ marginBottom: 14 }}>
            <FieldLabel label="Phone" optional />
            <StyledInput
              value={form.phone}
              onChangeText={(v) => setField('phone', v)}
              placeholder="+1 (416) 555-0100"
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={{ marginBottom: 14 }}>
            <FieldLabel label="Website" optional />
            <StyledInput
              value={form.websiteUrl}
              onChangeText={(v) => setField('websiteUrl', v)}
              placeholder="https://yourwebsite.com"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={{ marginBottom: 0 }}>
            <FieldLabel label="Photo URL" optional />
            <StyledInput
              value={form.photoUrl}
              onChangeText={(v) => setField('photoUrl', v)}
              placeholder="https://example.com/photo.jpg"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Practice Details */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
          <SectionTitle title="Practice Details" />

          <View style={{ marginBottom: 14 }}>
            <FieldLabel label="Session Fee (CAD)" optional />
            <StyledInput
              value={sessionFeeStr}
              onChangeText={(v) => setField('sessionFee', v)}
              placeholder="150"
              keyboardType="numeric"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <FieldLabel label="Years of Experience" optional />
            <StyledInput
              value={yearsExpStr}
              onChangeText={(v) => setField('yearsExperience', v)}
              placeholder="8"
              keyboardType="numeric"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Accepting new clients toggle */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 13,
              borderWidth: 1,
              borderColor: form.acceptingNewClients ? 'rgba(52, 168, 83, 0.2)' : COLORS.border,
              marginBottom: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>
                Accepting New Clients
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>
                Visible to clients browsing your profile
              </Text>
            </View>
            <Switch
              value={form.acceptingNewClients}
              onValueChange={(v) => {
                console.log('[EditProfile] Toggle acceptingNewClients:', v);
                setField('acceptingNewClients', v);
              }}
              trackColor={{ false: '#ccc', true: '#4CAF50' }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Sliding scale toggle */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 13,
              borderWidth: 1,
              borderColor: form.slidingScale ? 'rgba(52, 168, 83, 0.2)' : COLORS.border,
              marginBottom: form.slidingScale ? 10 : 0,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>
                Sliding Scale
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>
                Offer reduced fees based on client income
              </Text>
            </View>
            <Switch
              value={form.slidingScale}
              onValueChange={(v) => {
                console.log('[EditProfile] Toggle slidingScale:', v);
                setField('slidingScale', v);
              }}
              trackColor={{ false: '#ccc', true: '#4CAF50' }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Minimum fee — only shown when sliding scale is on */}
          {form.slidingScale ? (
            <View style={{ marginBottom: 0 }}>
              <FieldLabel label="Minimum Fee (CAD)" optional />
              <StyledInput
                value={String(form.slidingScaleMinFee)}
                onChangeText={(v) => setField('slidingScaleMinFee', v)}
                placeholder="e.g. 60"
                keyboardType="numeric"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          ) : null}
        </View>

        {/* Specialties & Therapy Types */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
          <SectionTitle title="Specialties & Approaches" />
          <ChipSelector
            label="Specialties"
            options={SPECIALTIES_OPTIONS}
            selected={form.specialties}
            onToggle={(v) => toggleArrayField('specialties', v)}
          />
          <ChipSelector
            label="Therapy Types"
            options={THERAPY_TYPES_OPTIONS}
            selected={form.therapyTypes}
            onToggle={(v) => toggleArrayField('therapyTypes', v)}
          />
        </View>

        {/* Insurances & Languages */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border }}>
          <SectionTitle title="Insurance & Languages" />
          <ChipSelector
            label="Insurances Accepted"
            options={INSURANCES_OPTIONS}
            selected={form.insurances}
            onToggle={(v) => toggleArrayField('insurances', v)}
          />
          <ChipSelector
            label="Languages"
            options={LANGUAGES_OPTIONS}
            selected={form.languages}
            onToggle={(v) => toggleArrayField('languages', v)}
          />
        </View>

        {/* Save Button */}
        <AnimatedPressable onPress={handleSave} disabled={saving} scaleValue={0.97}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: saveBtnBg,
              borderRadius: 14,
              paddingVertical: 15,
              opacity: saving ? 0.75 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : saveSuccess ? (
              <CheckCircle size={18} color="#fff" />
            ) : (
              <Save size={18} color="#fff" />
            )}
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: 'DMSans_700Bold' }}>
              {saveBtnLabel}
            </Text>
          </View>
        </AnimatedPressable>

        <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 10, lineHeight: 18 }}>
          Profile changes are reviewed by our team before going live
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
