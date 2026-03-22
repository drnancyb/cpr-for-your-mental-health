import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  Switch,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, ChevronLeft, ChevronRight, Upload, X, FileText, Save } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_KEY = 'apply_draft';

interface DraftData {
  name: string;
  title: string;
  gender: string;
  yearsExperience: string;
  location: string;
  languages: string[];
  bio: string;
  sessionFee: string;
  phone: string;
  email: string;
  websiteUrl: string;
  specialties: string[];
  therapyTypes: string[];
  insurances: string[];
  acceptingNewClients: boolean;
}

const BASE_URL = 'https://77zgefkppvrujkkwanvht7mztqqrxrhy.app.specular.dev';

async function uploadLicenseDocument(
  fileUri: string,
  fileName: string,
  mimeType: string,
  token: string | null,
): Promise<string> {
  console.log('[Apply] Uploading document:', fileName, 'mimeType:', mimeType);
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/api/upload/license-document`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[Apply] Upload failed, status:', res.status, text);
    throw new Error(text || `Upload failed (${res.status})`);
  }

  const json = await res.json();
  console.log('[Apply] Upload success, url:', json.url);
  // Attach base64 as fallback display name via url
  return json.url as string;
}

// Derive a display name from a document URL
function docDisplayName(url: string, index: number): string {
  try {
    const parts = url.split('/');
    const last = parts[parts.length - 1];
    if (last && last.length > 0) return decodeURIComponent(last);
  } catch {}
  return `Document ${index + 1}`;
}

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
  border: 'rgba(45, 122, 95, 0.10)',
  divider: 'rgba(45, 122, 95, 0.05)',
};

const BC_CITIES = ['All of BC', 'Vancouver', 'Victoria', 'Surrey', 'Burnaby', 'Richmond', 'Kelowna', 'Abbotsford', 'Kamloops', 'Nanaimo', 'Prince George'];
const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const LANGUAGES_OPTIONS = ['English', 'French', 'Mandarin', 'Cantonese', 'Punjabi', 'Spanish', 'Tagalog'];
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
const INSURANCES_OPTIONS = ['ICBC', 'WorkSafeBC', 'Blue Cross', 'Sun Life', 'Manulife', 'Great-West Life', 'Desjardins', 'Self-pay'];

interface Application {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  name: string;
  title: string;
  admin_notes?: string;
  rejection_reason?: string;
  created_at: string;
}

// The API may return the application bare or wrapped in { application: ... }
type ApplicationApiResponse = Application | { application: Application } | null | undefined;

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
  required,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric' | 'url';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  required?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>
          {label}
        </Text>
        {required && (
          <Text style={{ fontSize: 13, color: COLORS.danger, fontFamily: 'DMSans_600SemiBold' }}>*</Text>
        )}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        style={{
          backgroundColor: COLORS.surfaceSecondary,
          borderRadius: 12,
          borderCurve: 'continuous',
          paddingHorizontal: 16,
          paddingVertical: multiline ? 12 : 14,
          fontSize: 15,
          color: COLORS.text,
          fontFamily: 'DMSans_400Regular',
          minHeight: multiline ? 100 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

function ChipSelector({
  label,
  options,
  selected,
  onToggle,
  required,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
  required?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>
          {label}
        </Text>
        {required && (
          <Text style={{ fontSize: 13, color: COLORS.danger, fontFamily: 'DMSans_600SemiBold' }}>*</Text>
        )}
      </View>
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
  required,
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (val: string) => void;
  required?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>
          {label}
        </Text>
        {required && (
          <Text style={{ fontSize: 13, color: COLORS.danger, fontFamily: 'DMSans_600SemiBold' }}>*</Text>
        )}
      </View>
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        borderCurve: 'continuous',
        padding: 20,
        gap: 20,
        boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
      }}
    >
      <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold' }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 }}>
      <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', flexShrink: 0 }}>
        {label}
      </Text>
      <Text
        style={{ fontSize: 13, color: COLORS.text, fontFamily: 'DMSans_600SemiBold', flex: 1, textAlign: 'right' }}
        numberOfLines={2}
      >
        {value || '—'}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ApplyScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [existing, setExisting] = useState<Application | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const progressAnim = useRef(new Animated.Value(1 / 3)).current;

  // Draft toast state
  const [draftSaved, setDraftSaved] = useState(false);
  const draftToastAnim = useRef(new Animated.Value(0)).current;
  const draftToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 1 fields
  const [name, setName] = useState(user?.name ?? '');
  const [title, setTitle] = useState('');
  const [gender, setGender] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [location, setLocation] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);

  // Step 2 fields
  const [bio, setBio] = useState('');
  const [sessionFee, setSessionFee] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [therapyTypes, setTherapyTypes] = useState<string[]>([]);

  // Step 3 fields
  const [insurances, setInsurances] = useState<string[]>([]);
  const [acceptingNewClients, setAcceptingNewClients] = useState(true);
  const [licenseDocuments, setLicenseDocuments] = useState<string[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // ── Draft helpers ──────────────────────────────────────────────────────────

  const showDraftToast = useCallback(() => {
    if (draftToastTimer.current) clearTimeout(draftToastTimer.current);
    setDraftSaved(true);
    Animated.sequence([
      Animated.timing(draftToastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(draftToastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setDraftSaved(false));
    draftToastTimer.current = setTimeout(() => setDraftSaved(false), 2400);
  }, [draftToastAnim]);

  const saveDraft = useCallback(async (
    fields: {
      name: string; title: string; gender: string; yearsExperience: string;
      location: string; languages: string[]; bio: string; sessionFee: string;
      phone: string; email: string; websiteUrl: string; specialties: string[];
      therapyTypes: string[]; insurances: string[]; acceptingNewClients: boolean;
    }
  ) => {
    console.log('[Apply] Saving draft to AsyncStorage');
    try {
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(fields));
      showDraftToast();
    } catch (e) {
      console.error('[Apply] Failed to save draft:', e);
    }
  }, [showDraftToast]);

  const handleSaveDraft = useCallback(() => {
    console.log('[Apply] Save draft button pressed on step', step);
    saveDraft({
      name, title, gender, yearsExperience, location, languages,
      bio, sessionFee, phone, email, websiteUrl, specialties,
      therapyTypes, insurances, acceptingNewClients,
    });
  }, [
    saveDraft, step,
    name, title, gender, yearsExperience, location, languages,
    bio, sessionFee, phone, email, websiteUrl, specialties,
    therapyTypes, insurances, acceptingNewClients,
  ]);

  // ── Load existing application + draft on mount ─────────────────────────────

  useEffect(() => {
    if (!user) {
      setCheckingExisting(false);
      return;
    }
    console.log('[Apply] Fetching existing application for user:', user.id);
    api
      .get<ApplicationApiResponse>('/api/applications/me')
      .then((res) => {
        // Unwrap envelope: API may return bare object or { application: {...} }
        const app: Application | null | undefined =
          res && typeof res === 'object' && 'application' in res
            ? (res as { application: Application }).application
            : (res as Application | null | undefined);
        if (app && app.id) {
          console.log('[Apply] Existing application found:', app.id, 'status:', app.status);
          setExisting(app);
          // Don't load draft — user already has a submitted application
        } else {
          console.log('[Apply] No existing application — checking for saved draft');
          AsyncStorage.getItem(DRAFT_KEY)
            .then((raw) => {
              if (!raw) return;
              try {
                const draft: DraftData = JSON.parse(raw);
                console.log('[Apply] Draft found, pre-populating form fields');
                if (draft.name) setName(draft.name);
                if (draft.title) setTitle(draft.title);
                if (draft.gender) setGender(draft.gender);
                if (draft.yearsExperience) setYearsExperience(draft.yearsExperience);
                if (draft.location) setLocation(draft.location);
                if (draft.languages?.length) setLanguages(draft.languages);
                if (draft.bio) setBio(draft.bio);
                if (draft.sessionFee) setSessionFee(draft.sessionFee);
                if (draft.phone) setPhone(draft.phone);
                if (draft.email) setEmail(draft.email);
                if (draft.websiteUrl) setWebsiteUrl(draft.websiteUrl);
                if (draft.specialties?.length) setSpecialties(draft.specialties);
                if (draft.therapyTypes?.length) setTherapyTypes(draft.therapyTypes);
                if (draft.insurances?.length) setInsurances(draft.insurances);
                if (typeof draft.acceptingNewClients === 'boolean') setAcceptingNewClients(draft.acceptingNewClients);
              } catch (parseErr) {
                console.warn('[Apply] Failed to parse draft:', parseErr);
              }
            })
            .catch((e) => console.warn('[Apply] Failed to read draft:', e));
        }
      })
      .catch((e) => {
        const status = (e as { status?: number })?.status;
        if (status === 404) {
          console.log('[Apply] No existing application found (404) — checking for saved draft');
          AsyncStorage.getItem(DRAFT_KEY)
            .then((raw) => {
              if (!raw) return;
              try {
                const draft: DraftData = JSON.parse(raw);
                console.log('[Apply] Draft found, pre-populating form fields');
                if (draft.name) setName(draft.name);
                if (draft.title) setTitle(draft.title);
                if (draft.gender) setGender(draft.gender);
                if (draft.yearsExperience) setYearsExperience(draft.yearsExperience);
                if (draft.location) setLocation(draft.location);
                if (draft.languages?.length) setLanguages(draft.languages);
                if (draft.bio) setBio(draft.bio);
                if (draft.sessionFee) setSessionFee(draft.sessionFee);
                if (draft.phone) setPhone(draft.phone);
                if (draft.email) setEmail(draft.email);
                if (draft.websiteUrl) setWebsiteUrl(draft.websiteUrl);
                if (draft.specialties?.length) setSpecialties(draft.specialties);
                if (draft.therapyTypes?.length) setTherapyTypes(draft.therapyTypes);
                if (draft.insurances?.length) setInsurances(draft.insurances);
                if (typeof draft.acceptingNewClients === 'boolean') setAcceptingNewClients(draft.acceptingNewClients);
              } catch (parseErr) {
                console.warn('[Apply] Failed to parse draft:', parseErr);
              }
            })
            .catch((readErr) => console.warn('[Apply] Failed to read draft:', readErr));
        } else {
          console.error('[Apply] Error fetching application, status:', status, e instanceof Error ? e.message : e);
        }
      })
      .finally(() => setCheckingExisting(false));
  }, [user]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: step / 3,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step, progressAnim]);

  const handlePickDocument = async () => {
    console.log('[Apply] Upload Document button pressed');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) {
        console.log('[Apply] Document picker cancelled');
        return;
      }
      const asset = result.assets[0];
      const fileName = asset.name ?? `document_${Date.now()}`;
      const mimeType = asset.mimeType ?? 'application/octet-stream';
      console.log('[Apply] Document picked:', fileName);
      setUploadingDoc(true);
      try {
        const { data: session } = await import('@/lib/auth').then((m) => m.authClient.getSession());
        const token = session?.session?.token ?? null;
        const url = await uploadLicenseDocument(asset.uri, fileName, mimeType, token);
        setLicenseDocuments((prev) => [...prev, url]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        console.error('[Apply] Document upload error:', msg);
        Alert.alert('Upload Failed', msg);
      } finally {
        setUploadingDoc(false);
      }
    } catch (e) {
      console.error('[Apply] Document picker error:', e);
    }
  };

  const handleRemoveDocument = (index: number) => {
    console.log('[Apply] Remove document at index:', index);
    setLicenseDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleMulti = (arr: string[], val: string, setter: (v: string[]) => void) => {
    if (arr.includes(val)) {
      setter(arr.filter((x) => x !== val));
    } else {
      setter([...arr, val]);
    }
  };

  const validateStep1 = () => {
    if (!name.trim()) return 'Full name is required.';
    if (!title.trim()) return 'Professional title is required.';
    if (!gender) return 'Please select your gender.';
    if (!yearsExperience.trim()) return 'Years of experience is required.';
    if (isNaN(parseInt(yearsExperience, 10))) return 'Years of experience must be a number.';
    if (!location) return 'Please select your location.';
    if (languages.length === 0) return 'Please select at least one language.';
    return null;
  };

  const validateStep2 = () => {
    if (!bio.trim()) return 'Bio is required.';
    if (!sessionFee.trim()) return 'Session fee is required.';
    if (isNaN(parseFloat(sessionFee))) return 'Session fee must be a number.';
    if (!phone.trim()) return 'Phone number is required.';
    if (!email.trim()) return 'Email is required.';
    if (specialties.length === 0) return 'Please select at least one specialty.';
    if (therapyTypes.length === 0) return 'Please select at least one therapy type.';
    return null;
  };

  const validateStep3 = () => {
    if (insurances.length === 0) return 'Please select at least one insurance option.';
    return null;
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
      console.log('[Apply] Step 1 validated, advancing to step 2');
    } else if (step === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }
      console.log('[Apply] Step 2 validated, advancing to step 3');
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    console.log('[Apply] Going back to step', step - 1);
    setError(null);
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setError(null);
    const err = validateStep3();
    if (err) { setError(err); return; }

    const payload = {
      name: name.trim(),
      email: email.trim(),
      title: title.trim(),
      bio: bio.trim(),
      location,
      gender,
      phone: phone.trim(),
      session_fee: parseFloat(sessionFee),
      years_experience: parseInt(yearsExperience, 10),
      specialties,
      therapy_types: therapyTypes,
      insurances,
      languages,
      website_url: websiteUrl.trim() || undefined,
      accepting_new_clients: acceptingNewClients,
      license_documents: licenseDocuments,
    };

    console.log('[Apply] Submitting application:', JSON.stringify(payload));
    setSubmitting(true);
    try {
      const result = await api.post('/api/applications', payload);
      console.log('[Apply] Application submitted successfully:', result);
      await AsyncStorage.removeItem(DRAFT_KEY);
      console.log('[Apply] Draft cleared from AsyncStorage after successful submission');
      setSubmitted(true);
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      const msg = e instanceof Error ? e.message : 'Submission failed.';
      console.error('[Apply] Submission error, status:', status, 'message:', msg);
      const alertMsg = status === 409 ? 'You have already submitted an application.' : msg;
      setError(alertMsg);
      Alert.alert('Submission Failed', alertMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Not logged in ──
  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Stack.Screen options={{ title: 'Apply as a Therapist', headerBackButtonDisplayMode: 'minimal' }} />
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 32 }}>🌿</Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold', marginBottom: 10, textAlign: 'center' }}>
          Sign in required
        </Text>
        <Text style={{ fontSize: 15, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
          You need an account to submit a therapist application.
        </Text>
        <AnimatedPressable onPress={() => {
          console.log('[Apply] Sign in button pressed');
          router.push('/auth-screen');
        }}>
          <View style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 15 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>
              Sign In / Sign Up
            </Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  // ── Loading existing ──
  if (checkingExisting) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: 'Apply as a Therapist', headerBackButtonDisplayMode: 'minimal' }} />
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  // ── Existing application status ──
  if (existing) {
    const statusColor =
      existing.status === 'approved' ? COLORS.success :
      existing.status === 'rejected' ? COLORS.danger :
      COLORS.warning;
    const statusLabel =
      existing.status === 'approved' ? 'Approved' :
      existing.status === 'rejected' ? 'Rejected' :
      'Pending Review';
    const statusEmoji =
      existing.status === 'approved' ? '✅' :
      existing.status === 'rejected' ? '❌' : '⏳';
    const createdAtDate = existing.created_at ? new Date(existing.created_at) : null;
    const submittedDate =
      createdAtDate && !isNaN(createdAtDate.getTime())
        ? createdAtDate.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Unknown date';
    const rejectionNote = existing.admin_notes ?? existing.rejection_reason ?? null;

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Stack.Screen options={{ title: 'My Application', headerBackButtonDisplayMode: 'minimal' }} />
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            borderCurve: 'continuous',
            padding: 24,
            gap: 20,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: statusColor + '18',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 32 }}>{statusEmoji}</Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold', textAlign: 'center' }}>
              Application
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold', textAlign: 'center' }}>
              {statusLabel}
            </Text>
            <View style={{ backgroundColor: statusColor + '18', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: statusColor, fontFamily: 'DMSans_600SemiBold' }}>
                {statusLabel}
              </Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: COLORS.divider }} />

          <View style={{ gap: 4 }}>
            <ReviewRow label="Name" value={existing.name} />
            <ReviewRow label="Title" value={existing.title} />
            <ReviewRow label="Submitted" value={submittedDate} />
          </View>

          {existing.status === 'pending' && (
            <View style={{ backgroundColor: '#FFFBEB', borderRadius: 12, borderCurve: 'continuous', padding: 14, borderWidth: 1, borderColor: '#FDE68A' }}>
              <Text style={{ fontSize: 13, color: '#92400E', fontFamily: 'DMSans_400Regular', lineHeight: 20 }}>
                Your application is under review. We'll notify you by email once a decision has been made — typically within 2–3 business days.
              </Text>
            </View>
          )}

          {existing.status === 'approved' && (
            <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, borderCurve: 'continuous', padding: 14, borderWidth: 1, borderColor: '#BBF7D0' }}>
              <Text style={{ fontSize: 13, color: '#166534', fontFamily: 'DMSans_400Regular', lineHeight: 20 }}>
                Congratulations! Your profile is now live in the BC provider directory.
              </Text>
            </View>
          )}

          {existing.status === 'rejected' && rejectionNote ? (
            <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, borderCurve: 'continuous', padding: 14, borderWidth: 1, borderColor: '#FECACA' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.danger, fontFamily: 'DMSans_600SemiBold', marginBottom: 4 }}>
                Reason for rejection
              </Text>
              <Text style={{ fontSize: 13, color: '#991B1B', fontFamily: 'DMSans_400Regular', lineHeight: 20 }}>
                {rejectionNote}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    );
  }

  // ── Success screen ──
  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Stack.Screen options={{ title: 'Application Submitted', headerBackButtonDisplayMode: 'minimal' }} />
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: '#F0FDF4',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <CheckCircle size={48} color={COLORS.success} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold', marginBottom: 12, textAlign: 'center', letterSpacing: -0.3 }}>
          Application Submitted!
        </Text>
        <Text style={{ fontSize: 15, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 36, maxWidth: 300 }}>
          We'll review your profile and notify you by email within 2–3 business days.
        </Text>
        <AnimatedPressable onPress={() => {
          console.log('[Apply] Back to directory pressed');
          router.replace('/');
        }}>
          <View style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 15 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>
              Back to directory
            </Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  // ── Multi-step form ──
  const stepTitles = ['Personal Info', 'Practice Details', 'Insurance & Review'];
  const stepTitle = stepTitles[step - 1];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ title: 'Apply as a Therapist', headerBackButtonDisplayMode: 'minimal' }} />

      {/* Progress bar */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>
            {stepTitle}
          </Text>
          <Text style={{ fontSize: 13, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
            Step {step} of 3
          </Text>
        </View>
        <View style={{ height: 4, backgroundColor: COLORS.surfaceSecondary, borderRadius: 2 }}>
          <Animated.View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: COLORS.primary,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            }}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 120, gap: 20 }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Step 1: Personal Info ── */}
        {step === 1 && (
          <SectionCard title="Personal Information">
            <Field
              label="Full name"
              value={name}
              onChangeText={setName}
              placeholder="Dr. Jane Smith"
              autoCapitalize="words"
              required
            />
            <Field
              label="Professional title"
              value={title}
              onChangeText={setTitle}
              placeholder="Registered Clinical Counsellor"
              required
            />
            <SingleSelector
              label="Gender"
              options={GENDERS}
              selected={gender}
              onSelect={(v) => {
                console.log('[Apply] Gender selected:', v);
                setGender(v);
              }}
              required
            />
            <Field
              label="Years of experience"
              value={yearsExperience}
              onChangeText={setYearsExperience}
              placeholder="8"
              keyboardType="numeric"
              autoCapitalize="none"
              required
            />
            <SingleSelector
              label="Location (BC city)"
              options={BC_CITIES}
              selected={location}
              onSelect={(v) => {
                console.log('[Apply] Location selected:', v);
                setLocation(v);
              }}
              required
            />
            <ChipSelector
              label="Languages spoken"
              options={LANGUAGES_OPTIONS}
              selected={languages}
              onToggle={(v) => {
                console.log('[Apply] Language toggled:', v);
                toggleMulti(languages, v, setLanguages);
              }}
              required
            />
          </SectionCard>
        )}

        {/* ── Step 2: Practice Details ── */}
        {step === 2 && (
          <SectionCard title="Practice Details">
            <Field
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Describe your approach and what clients can expect..."
              multiline
              required
            />
            <Field
              label="Session fee (CAD)"
              value={sessionFee}
              onChangeText={setSessionFee}
              placeholder="150"
              keyboardType="numeric"
              autoCapitalize="none"
              required
            />
            <Field
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 604 555 0100"
              keyboardType="phone-pad"
              autoCapitalize="none"
              required
            />
            <Field
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="jane@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              required
            />
            <Field
              label="Website URL"
              value={websiteUrl}
              onChangeText={setWebsiteUrl}
              placeholder="https://yourpractice.com"
              keyboardType="url"
              autoCapitalize="none"
            />
            <ChipSelector
              label="Specialties"
              options={SPECIALTIES_OPTIONS}
              selected={specialties}
              onToggle={(v) => {
                console.log('[Apply] Specialty toggled:', v);
                toggleMulti(specialties, v, setSpecialties);
              }}
              required
            />
            <ChipSelector
              label="Therapy types"
              options={THERAPY_TYPES_OPTIONS}
              selected={therapyTypes}
              onToggle={(v) => {
                console.log('[Apply] Therapy type toggled:', v);
                toggleMulti(therapyTypes, v, setTherapyTypes);
              }}
              required
            />
          </SectionCard>
        )}

        {/* ── Step 3: Insurance & Review ── */}
        {step === 3 && (
          <>
            <SectionCard title="Proof of Registration / Licensure">
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', lineHeight: 18 }}>
                Upload your registration certificate, license, or any official proof of licensure (PDF, JPG, PNG)
              </Text>

              {licenseDocuments.map((url, index) => {
                const displayName = docDisplayName(url, index);
                return (
                  <View
                    key={url + index}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: COLORS.surfaceSecondary,
                      borderRadius: 12,
                      borderCurve: 'continuous',
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      gap: 10,
                    }}
                  >
                    <FileText size={16} color={COLORS.primary} />
                    <Text
                      style={{ flex: 1, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans_400Regular' }}
                      numberOfLines={1}
                    >
                      {displayName}
                    </Text>
                    <AnimatedPressable onPress={() => handleRemoveDocument(index)} scaleValue={0.9}>
                      <View style={{ padding: 4 }}>
                        <X size={16} color={COLORS.danger} />
                      </View>
                    </AnimatedPressable>
                  </View>
                );
              })}

              <AnimatedPressable onPress={handlePickDocument} disabled={uploadingDoc} scaleValue={0.97}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: uploadingDoc ? COLORS.surfaceSecondary : COLORS.primaryMuted,
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    paddingVertical: 13,
                    borderWidth: 1,
                    borderColor: uploadingDoc ? 'transparent' : 'rgba(45, 122, 95, 0.2)',
                    borderStyle: 'dashed',
                  }}
                >
                  {uploadingDoc ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Upload size={16} color={COLORS.primary} />
                  )}
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' }}>
                    {uploadingDoc ? 'Uploading…' : 'Upload Document'}
                  </Text>
                </View>
              </AnimatedPressable>
            </SectionCard>

            <SectionCard title="Insurance Accepted">
              <ChipSelector
                label="Insurance plans"
                options={INSURANCES_OPTIONS}
                selected={insurances}
                onToggle={(v) => {
                  console.log('[Apply] Insurance toggled:', v);
                  toggleMulti(insurances, v, setInsurances);
                }}
                required
              />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 12,
                  borderCurve: 'continuous',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <Text style={{ fontSize: 15, color: COLORS.text, fontFamily: 'DMSans_400Regular' }}>
                  Accepting new clients
                </Text>
                <Switch
                  value={acceptingNewClients}
                  onValueChange={(val) => {
                    console.log('[Apply] Accepting new clients toggled:', val);
                    setAcceptingNewClients(val);
                  }}
                  trackColor={{ false: COLORS.textTertiary, true: COLORS.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </SectionCard>

            <SectionCard title="Review Your Application">
              <View style={{ gap: 2 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textTertiary, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                  Personal
                </Text>
                <ReviewRow label="Name" value={name} />
                <ReviewRow label="Title" value={title} />
                <ReviewRow label="Gender" value={gender} />
                <ReviewRow label="Experience" value={yearsExperience ? `${yearsExperience} years` : ''} />
                <ReviewRow label="Location" value={location} />
                <ReviewRow label="Languages" value={languages.join(', ')} />
              </View>
              <View style={{ height: 1, backgroundColor: COLORS.divider }} />
              <View style={{ gap: 2 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textTertiary, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                  Practice
                </Text>
                <ReviewRow label="Session fee" value={sessionFee ? `$${sessionFee} / session` : ''} />
                <ReviewRow label="Phone" value={phone} />
                <ReviewRow label="Email" value={email} />
                {websiteUrl ? <ReviewRow label="Website" value={websiteUrl} /> : null}
                <ReviewRow label="Specialties" value={specialties.join(', ')} />
                <ReviewRow label="Therapy types" value={therapyTypes.join(', ')} />
              </View>
              <View style={{ height: 1, backgroundColor: COLORS.divider }} />
              <ReviewRow label="Insurances" value={insurances.join(', ')} />
              <ReviewRow label="Accepting new clients" value={acceptingNewClients ? 'Yes' : 'No'} />
            </SectionCard>
          </>
        )}

        {/* Error */}
        {error ? (
          <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, borderCurve: 'continuous', padding: 14, borderWidth: 1, borderColor: '#FECACA' }}>
            <Text style={{ fontSize: 13, color: COLORS.danger, fontFamily: 'DMSans_400Regular', lineHeight: 18 }} selectable>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Disclaimer */}
        <DisclaimerBanner />
      </ScrollView>

      {/* Bottom navigation */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: COLORS.surface,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
          gap: 10,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          boxShadow: '0 -2px 12px rgba(0,0,0,0.04)',
        }}
      >
        {/* Primary row: Back + Next/Submit */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {step > 1 && (
            <AnimatedPressable onPress={handleBack} style={{ flex: 1 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 14,
                  borderCurve: 'continuous',
                  paddingVertical: 15,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <ChevronLeft size={18} color={COLORS.textSecondary} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>
                  Back
                </Text>
              </View>
            </AnimatedPressable>
          )}

          {step < 3 ? (
            <AnimatedPressable onPress={handleNext} style={{ flex: 1 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: COLORS.primary,
                  borderRadius: 14,
                  borderCurve: 'continuous',
                  paddingVertical: 15,
                  paddingHorizontal: 24,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>
                  Next
                </Text>
                <ChevronRight size={18} color="#fff" />
              </View>
            </AnimatedPressable>
          ) : (
            <AnimatedPressable onPress={handleSubmit} disabled={submitting} style={{ flex: 1 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: COLORS.primary,
                  borderRadius: 14,
                  borderCurve: 'continuous',
                  paddingVertical: 15,
                  alignItems: 'center',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>
                    Submit application
                  </Text>
                )}
              </View>
            </AnimatedPressable>
          )}
        </View>

        {/* Save draft row — shown on steps 1 and 2 only */}
        {step < 3 && (
          <AnimatedPressable onPress={handleSaveDraft} scaleValue={0.97}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 10,
                borderRadius: 12,
                borderCurve: 'continuous',
                backgroundColor: COLORS.primaryMuted,
                borderWidth: 1,
                borderColor: 'rgba(45, 122, 95, 0.12)',
              }}
            >
              <Save size={15} color={COLORS.primary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' }}>
                Save progress
              </Text>
            </View>
          </AnimatedPressable>
        )}
      </View>

      {/* Draft saved toast */}
      {draftSaved && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: insets.bottom + (step < 3 ? 148 : 100),
            alignSelf: 'center',
            opacity: draftToastAnim,
            transform: [
              {
                translateY: draftToastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 0],
                }),
              },
            ],
          }}
          pointerEvents="none"
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              backgroundColor: COLORS.text,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            }}
          >
            <CheckCircle size={15} color={COLORS.accent} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF', fontFamily: 'DMSans_600SemiBold' }}>
              Draft saved
            </Text>
          </View>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}
