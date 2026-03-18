import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
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
  'Vancouver', 'Victoria', 'Surrey', 'Burnaby', 'Richmond',
  'Kelowna', 'Abbotsford', 'Kamloops', 'Nanaimo', 'Prince George',
];
const LANGUAGES = ['English', 'French', 'Mandarin', 'Cantonese', 'Punjabi', 'Spanish', 'Tagalog'];
const SPECIALTIES = [
  'Anxiety', 'Depression', 'Trauma', 'PTSD', 'Grief', 'Relationships',
  'Addiction', 'ADHD', 'OCD', 'Eating Disorders', 'Anger Management', 'Stress',
];
const THERAPY_TYPES = [
  'CBT', 'DBT', 'EMDR', 'Psychodynamic', 'Mindfulness-Based',
  'Solution-Focused', 'ACT', 'Narrative Therapy', 'Somatic Therapy',
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

function parseArrayParam(val: string | string[] | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

export default function AddTherapistScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    title?: string;
    photo_url?: string;
    gender?: string;
    location?: string;
    years_experience?: string;
    session_fee?: string;
    phone?: string;
    email?: string;
    website_url?: string;
    bio?: string;
    languages?: string;
    specialties?: string;
    therapy_types?: string;
    insurances?: string;
  }>();

  const isEdit = !!params.id;

  // Form state
  const [name, setName] = useState(params.name ?? '');
  const [title, setTitle] = useState(params.title ?? '');
  const [photoUrl, setPhotoUrl] = useState(params.photo_url ?? '');
  const [gender, setGender] = useState(params.gender ?? '');
  const [location, setLocation] = useState(params.location ?? '');
  const [yearsExp, setYearsExp] = useState(params.years_experience ?? '');
  const [sessionFee, setSessionFee] = useState(params.session_fee ?? '');
  const [phone, setPhone] = useState(params.phone ?? '');
  const [email, setEmail] = useState(params.email ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(params.website_url ?? '');
  const [bio, setBio] = useState(params.bio ?? '');
  const [languages, setLanguages] = useState<string[]>(parseArrayParam(params.languages));
  const [specialties, setSpecialties] = useState<string[]>(parseArrayParam(params.specialties));
  const [therapyTypes, setTherapyTypes] = useState<string[]>(parseArrayParam(params.therapy_types));
  const [insurances, setInsurances] = useState<string[]>(parseArrayParam(params.insurances));

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const screenTitle = isEdit ? 'Edit Therapist' : 'Add Therapist';
  const submitLabel = isEdit ? 'Save Changes' : 'Add Therapist';

  const toggleMulti = useCallback((arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }, []);

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
    };
    setSubmitting(true);
    try {
      if (isEdit) {
        console.log('[AddTherapist] PATCH /api/admin/therapists/', params.id, body);
        await api.patch(`/api/admin/therapists/${params.id}`, body);
        console.log('[AddTherapist] Therapist updated successfully');
      } else {
        console.log('[AddTherapist] POST /api/admin/therapists', body);
        await api.post('/api/admin/therapists', body);
        console.log('[AddTherapist] Therapist created successfully');
      }
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      console.error('[AddTherapist] Submit error:', msg);
      setErrors({ name: msg });
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
