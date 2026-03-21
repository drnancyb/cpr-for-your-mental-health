import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { api } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Check } from 'lucide-react-native';

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
  success: '#34A853',
  warning: '#F59E0B',
  danger: '#EF4444',
  border: 'rgba(45, 122, 95, 0.08)',
  divider: 'rgba(45, 122, 95, 0.05)',
};

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const LOCATIONS = [
  'All of BC', 'Vancouver', 'Victoria', 'Surrey', 'Burnaby', 'Richmond',
  'Kelowna', 'Abbotsford', 'Kamloops', 'Nanaimo', 'Prince George',
];
const LANGUAGES = ['English', 'French', 'Mandarin', 'Cantonese', 'Punjabi', 'Spanish', 'Tagalog'];
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
  'ICBC', 'WorkSafeBC', 'Blue Cross', 'Sun Life', 'Manulife',
  'Great-West Life', 'Desjardins', 'Self-pay',
];

interface FormErrors {
  name?: string;
  title?: string;
  gender?: string;
  location?: string;
  years_experience?: string;
  session_fee?: string;
  phone?: string;
  email?: string;
  bio?: string;
  languages?: string;
  specialties?: string;
  therapy_types?: string;
  insurances?: string;
}

interface TherapistProfile {
  id: string;
  name: string;
  title: string;
  location: string;
  accepting_new_clients: boolean;
  photo_url?: string;
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
  gender: string;
}

export default function AddTherapistScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    mode?: string;
  }>();

  const isEdit = !!params.id;
  const isSelfEdit = params.mode === 'therapist-self-edit';


  // Form state — starts empty; always populated via API fetch when editing
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [sessionFee, setSessionFee] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [therapyTypes, setTherapyTypes] = useState<string[]>([]);
  const [insurances, setInsurances] = useState<string[]>([]);
  const [acceptingNewClients, setAcceptingNewClients] = useState(true);

  // Loading state: true whenever we need to fetch an existing profile
  const [profileLoading, setProfileLoading] = useState(isEdit);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Must be declared before any early returns to satisfy Rules of Hooks
  const toggleMulti = useCallback((arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }, []);

  const populateForm = useCallback((data: TherapistProfile) => {
    setName(data.name ?? '');
    setTitle(data.title ?? '');
    setPhotoUrl(data.photo_url ?? '');
    setGender(data.gender ?? '');
    setLocation(data.location ?? '');
    setYearsExp(String(data.years_experience ?? ''));
    setSessionFee(String(data.session_fee ?? ''));
    setPhone(data.phone ?? '');
    setEmail(data.email ?? '');
    setWebsiteUrl(data.website_url ?? '');
    setBio(data.bio ?? '');
    setLanguages(Array.isArray(data.languages) ? data.languages : []);
    setSpecialties(Array.isArray(data.specialties) ? data.specialties : []);
    setTherapyTypes(Array.isArray(data.therapy_types) ? data.therapy_types : []);
    setInsurances(Array.isArray(data.insurances) ? data.insurances : []);
    setAcceptingNewClients(data.accepting_new_clients ?? true);
  }, []);

  // When editing, always fetch the full profile from the API.
  // Passing large data through route params is unreliable (URL length limits, encoding issues).
  useEffect(() => {
    if (!isEdit) return;
    if (isSelfEdit) {
      console.log('[AddTherapist] Self-edit mode — fetching profile from GET /api/therapist/profile');
      api.get<TherapistProfile>('/api/therapist/profile')
        .then((data) => {
          console.log('[AddTherapist] Self-edit profile fetched:', data.name);
          populateForm(data);
        })
        .catch((e) => {
          const msg = e instanceof Error ? e.message : 'Failed to load profile';
          console.error('[AddTherapist] Self-edit profile fetch error:', msg);
          setProfileLoadError(msg);
        })
        .finally(() => setProfileLoading(false));
    } else {
      // Admin edit — fetch from admin endpoint
      console.log('[AddTherapist] Admin edit mode — fetching profile from GET /api/admin/therapists/', params.id);
      api.get<TherapistProfile>(`/api/admin/therapists/${params.id}`)
        .then((data) => {
          console.log('[AddTherapist] Admin edit profile fetched:', data.name);
          populateForm(data);
        })
        .catch((e) => {
          const msg = e instanceof Error ? e.message : 'Failed to load therapist';
          console.error('[AddTherapist] Admin edit profile fetch error:', msg);
          setProfileLoadError(msg);
        })
        .finally(() => setProfileLoading(false));
    }
  }, [isEdit, isSelfEdit, params.id, populateForm]);

  const screenTitle = isSelfEdit ? 'Edit Profile' : isEdit ? 'Edit Therapist' : 'Add Therapist';
  const submitLabel = isEdit ? 'Save Changes' : 'Add Therapist';

  if (profileLoading) {

    return (
      <>
        <Stack.Screen options={{ title: screenTitle, headerLargeTitle: false, headerBackButtonDisplayMode: 'minimal' }} />
        <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={{ marginTop: 12, fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
            Loading your profile…
          </Text>
        </View>
      </>
    );
  }

  if (profileLoadError) {
    return (
      <>
        <Stack.Screen options={{ title: screenTitle, headerLargeTitle: false, headerBackButtonDisplayMode: 'minimal' }} />
        <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', marginBottom: 8, textAlign: 'center' }}>
            Couldn't load profile
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginBottom: 20 }}>
            {profileLoadError}
          </Text>
          <AnimatedPressable onPress={() => router.back()} scaleValue={0.97}>
            <View style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>Go Back</Text>
            </View>
          </AnimatedPressable>
        </View>
      </>
    );
  }

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!name.trim()) e.name = 'Full name is required';
    if (!title.trim()) e.title = 'Professional title is required';
    if (!gender) e.gender = 'Please select a gender';
    if (!location) e.location = 'Please select a location';
    if (!yearsExp.trim() || isNaN(Number(yearsExp))) e.years_experience = 'Valid years of experience required';
    if (!sessionFee.trim() || isNaN(Number(sessionFee))) e.session_fee = 'Valid session fee required';
    if (!phone.trim()) e.phone = 'Phone number is required';
    if (!email.trim()) e.email = 'Email is required';
    if (!bio.trim()) e.bio = 'Bio is required';
    if (languages.length === 0) e.languages = 'Select at least one language';
    if (specialties.length === 0) e.specialties = 'Select at least one specialty';
    if (therapyTypes.length === 0) e.therapy_types = 'Select at least one therapy type';
    if (insurances.length === 0) e.insurances = 'Select at least one insurance option';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    console.log('[AddTherapist] Submit pressed, isEdit:', isEdit);
    if (!validate()) {
      console.log('[AddTherapist] Validation failed');
      return;
    }
    const body = {
      name: name.trim(),
      title: title.trim(),
      photo_url: photoUrl.trim() || undefined,
      gender,
      location,
      years_experience: Number(yearsExp),
      session_fee: Number(sessionFee),
      phone: phone.trim(),
      email: email.trim(),
      website_url: websiteUrl.trim() || undefined,
      bio: bio.trim(),
      languages,
      specialties,
      therapy_types: therapyTypes,
      insurances,
      accepting_new_clients: acceptingNewClients,
    };
    setSubmitting(true);
    try {
      if (isSelfEdit) {
        console.log('[AddTherapist] PATCH /api/therapist/profile (self-edit)', body);
        await api.patch('/api/therapist/profile', body);
        console.log('[AddTherapist] Therapist self-profile updated successfully');
        Alert.alert('Profile Updated', 'Your changes have been submitted for review.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else if (isEdit) {
        console.log('[AddTherapist] PATCH /api/admin/therapists/', params.id, body);
        await api.patch(`/api/admin/therapists/${params.id}`, body);
        console.log('[AddTherapist] Therapist updated successfully');
        Alert.alert('Therapist Updated', 'The therapist profile has been updated.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        console.log('[AddTherapist] POST /api/admin/therapists', body);
        await api.post('/api/admin/therapists', body);
        console.log('[AddTherapist] Therapist created successfully');
        Alert.alert('Therapist Added', 'The new therapist has been added to the directory.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      console.error('[AddTherapist] Submit error:', msg);
      Alert.alert('Save Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (field: string) => ({
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    fontFamily: 'DMSans_400Regular',
    borderWidth: focusedField === field ? 1.5 : 0,
    borderColor: focusedField === field ? COLORS.primary : 'transparent',
  });

  return (
    <>
      <Stack.Screen options={{ title: screenTitle, headerLargeTitle: false, headerBackButtonDisplayMode: 'minimal' }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic Info */}
          <SectionHeader label="Basic Info" />

          <FieldLabel label="Full Name" required />
          <TextInput
            style={inputStyle('name')}
            value={name}
            onChangeText={setName}
            placeholder="Dr. Jane Smith"
            placeholderTextColor={COLORS.textTertiary}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
            returnKeyType="next"
          />
          <FieldError msg={errors.name} />

          <View style={{ height: 14 }} />
          <FieldLabel label="Professional Title" required />
          <TextInput
            style={inputStyle('title')}
            value={title}
            onChangeText={setTitle}
            placeholder="Registered Clinical Counsellor"
            placeholderTextColor={COLORS.textTertiary}
            onFocus={() => setFocusedField('title')}
            onBlur={() => setFocusedField(null)}
            returnKeyType="next"
          />
          <FieldError msg={errors.title} />

          <View style={{ height: 14 }} />
          <FieldLabel label="Photo URL" />
          <TextInput
            style={inputStyle('photo_url')}
            value={photoUrl}
            onChangeText={setPhotoUrl}
            placeholder="https://..."
            placeholderTextColor={COLORS.textTertiary}
            onFocus={() => setFocusedField('photo_url')}
            onBlur={() => setFocusedField(null)}
            keyboardType="url"
            autoCapitalize="none"
            returnKeyType="next"
          />

          <View style={{ height: 14 }} />
          <FieldLabel label="Gender" required />
          <ChipRow
            options={GENDERS}
            selected={[gender]}
            onToggle={(val) => setGender(val)}
            single
          />
          <FieldError msg={errors.gender} />

          <View style={{ height: 14 }} />
          <FieldLabel label="Location" required />
          <ChipRow
            options={LOCATIONS}
            selected={[location]}
            onToggle={(val) => setLocation(val)}
            single
          />
          <FieldError msg={errors.location} />

          <View style={{ height: 14 }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <FieldLabel label="Years of Experience" required />
              <TextInput
                style={inputStyle('years_exp')}
                value={yearsExp}
                onChangeText={setYearsExp}
                placeholder="5"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="number-pad"
                onFocus={() => setFocusedField('years_exp')}
                onBlur={() => setFocusedField(null)}
              />
              <FieldError msg={errors.years_experience} />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel label="Session Fee ($)" required />
              <View style={{ position: 'relative' }}>
                <Text style={{
                  position: 'absolute', left: 14, top: 14, zIndex: 1,
                  fontSize: 15, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular',
                }}>$</Text>
                <TextInput
                  style={[inputStyle('session_fee'), { paddingLeft: 26 }]}
                  value={sessionFee}
                  onChangeText={setSessionFee}
                  placeholder="150"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="number-pad"
                  onFocus={() => setFocusedField('session_fee')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              <FieldError msg={errors.session_fee} />
            </View>
          </View>

          {/* Contact */}
          <View style={{ height: 24 }} />
          <SectionHeader label="Contact" />

          <FieldLabel label="Phone" required />
          <TextInput
            style={inputStyle('phone')}
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 (604) 555-0100"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="phone-pad"
            onFocus={() => setFocusedField('phone')}
            onBlur={() => setFocusedField(null)}
          />
          <FieldError msg={errors.phone} />

          <View style={{ height: 14 }} />
          <FieldLabel label="Email" required />
          <TextInput
            style={inputStyle('email')}
            value={email}
            onChangeText={setEmail}
            placeholder="jane@example.com"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
          />
          <FieldError msg={errors.email} />

          <View style={{ height: 14 }} />
          <FieldLabel label="Website URL" />
          <TextInput
            style={inputStyle('website_url')}
            value={websiteUrl}
            onChangeText={setWebsiteUrl}
            placeholder="https://..."
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="url"
            autoCapitalize="none"
            onFocus={() => setFocusedField('website_url')}
            onBlur={() => setFocusedField(null)}
          />

          {/* About */}
          <View style={{ height: 24 }} />
          <SectionHeader label="About" />

          <FieldLabel label="Bio" required />
          <TextInput
            style={[inputStyle('bio'), { minHeight: 100, textAlignVertical: 'top' }]}
            value={bio}
            onChangeText={setBio}
            placeholder="Describe the therapist's approach..."
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={4}
            onFocus={() => setFocusedField('bio')}
            onBlur={() => setFocusedField(null)}
          />
          <FieldError msg={errors.bio} />

          {/* Practice */}
          <View style={{ height: 24 }} />
          <SectionHeader label="Practice" />

          <FieldLabel label="Languages" required />
          <ChipRow
            options={LANGUAGES}
            selected={languages}
            onToggle={(val) => toggleMulti(languages, setLanguages, val)}
          />
          <FieldError msg={errors.languages} />

          <View style={{ height: 14 }} />
          <FieldLabel label="Specialties" required />
          <ChipRow
            options={SPECIALTIES}
            selected={specialties}
            onToggle={(val) => toggleMulti(specialties, setSpecialties, val)}
          />
          <FieldError msg={errors.specialties} />

          <View style={{ height: 14 }} />
          <FieldLabel label="Therapy Types" required />
          <ChipRow
            options={THERAPY_TYPES}
            selected={therapyTypes}
            onToggle={(val) => toggleMulti(therapyTypes, setTherapyTypes, val)}
          />
          <FieldError msg={errors.therapy_types} />

          <View style={{ height: 14 }} />
          <FieldLabel label="Insurance Accepted" required />
          <ChipRow
            options={INSURANCES}
            selected={insurances}
            onToggle={(val) => toggleMulti(insurances, setInsurances, val)}
          />
          <FieldError msg={errors.insurances} />

          <View style={{ height: 14 }} />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 14,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: COLORS.text, fontFamily: 'DMSans_500Medium', fontWeight: '500' }}>
                Accepting New Clients
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>
                Toggle off if the therapist is not taking new clients
              </Text>
            </View>
            <Switch
              value={acceptingNewClients}
              onValueChange={(val) => {
                console.log('[AddTherapist] Accepting new clients toggled:', val);
                setAcceptingNewClients(val);
              }}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>

          {/* Submit */}
          <View style={{ height: 32 }} />
          <AnimatedPressable onPress={handleSubmit} disabled={submitting} scaleValue={0.97}>
            <View
              style={{
                backgroundColor: submitting ? COLORS.accent : COLORS.primary,
                borderRadius: 14,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={18} color="#fff" strokeWidth={2.5} />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>
                    {submitLabel}
                  </Text>
                </>
              )}
            </View>
          </AnimatedPressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textTertiary,
        fontFamily: 'DMSans_600SemiBold',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 12,
      }}
    >
      {label}
    </Text>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  const asterisk = required ? ' *' : '';
  const displayLabel = label + asterisk;
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
        fontFamily: 'DMSans_600SemiBold',
        marginBottom: 6,
      }}
    >
      {displayLabel}
    </Text>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <Text style={{ fontSize: 12, color: COLORS.danger, fontFamily: 'DMSans_400Regular', marginTop: 4 }}>
      {msg}
    </Text>
  );
}

function ChipRow({
  options,
  selected,
  onToggle,
  single,
}: {
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
  single?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <AnimatedPressable
            key={opt}
            onPress={() => {
              console.log('[Chip] Toggled:', opt, 'single:', single);
              onToggle(opt);
            }}
            scaleValue={0.93}
          >
            <View
              style={{
                backgroundColor: isSelected ? COLORS.primary : COLORS.surfaceSecondary,
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: isSelected ? '#fff' : COLORS.textSecondary,
                  fontFamily: 'DMSans_500Medium',
                }}
              >
                {opt}
              </Text>
            </View>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}
