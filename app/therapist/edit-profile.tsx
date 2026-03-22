import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { api } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Plus, X, Save, CheckCircle } from 'lucide-react-native';

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

function TagList({
  label,
  items,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string;
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (index: number) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    console.log(`[EditProfile] Adding tag to ${label}:`, trimmed);
    onAdd(trimmed);
    setInputValue('');
  }, [inputValue, label, onAdd]);

  return (
    <View style={{ marginBottom: 16 }}>
      <FieldLabel label={label} />
      {items.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {items.map((item, index) => (
            <View
              key={item + index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORS.primaryMuted,
                borderRadius: 20,
                paddingLeft: 12,
                paddingRight: 8,
                paddingVertical: 6,
                gap: 6,
                borderWidth: 1,
                borderColor: 'rgba(45, 122, 95, 0.15)',
              }}
            >
              <Text style={{ fontSize: 13, color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' }}>
                {item}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  console.log(`[EditProfile] Removing tag from ${label} at index:`, index);
                  onRemove(index);
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <X size={13} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={inputValue}
          onChangeText={setInputValue}
          placeholder={placeholder ?? `Add ${label.toLowerCase()}…`}
          placeholderTextColor={COLORS.textTertiary}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
          blurOnSubmit={false}
          style={{
            flex: 1,
            backgroundColor: COLORS.surface,
            borderWidth: 1,
            borderColor: COLORS.borderInput,
            borderRadius: 12,
            paddingHorizontal: 14,
            height: 42,
            fontSize: 14,
            color: COLORS.text,
            fontFamily: 'DMSans_400Regular',
          }}
        />
        <TouchableOpacity
          onPress={handleAdd}
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(45, 122, 95, 0.2)',
          }}
        >
          <Plus size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function EditProfileScreen() {
  const [form, setForm] = useState<TherapistProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setField = useCallback(<K extends keyof TherapistProfile>(key: K, value: TherapistProfile[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const addTag = useCallback((key: 'specialties' | 'therapyTypes' | 'insurances' | 'languages', item: string) => {
    setForm((prev) => ({ ...prev, [key]: [...prev[key], item] }));
  }, []);

  const removeTag = useCallback((key: 'specialties' | 'therapyTypes' | 'insurances' | 'languages', index: number) => {
    setForm((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
  }, []);

  useEffect(() => {
    console.log('[EditProfile] Fetching therapist profile from GET /api/therapists/me');
    api.get<TherapistProfile>('/api/therapists/me')
      .then((data) => {
        console.log('[EditProfile] Profile loaded:', data?.name);
        setForm({
          name: data.name ?? '',
          photoUrl: data.photoUrl ?? '',
          title: data.title ?? '',
          bio: data.bio ?? '',
          location: data.location ?? '',
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
    setSaving(true);
    setSaveSuccess(false);

    const sessionFeeNum = form.sessionFee !== '' ? Number(form.sessionFee) : null;
    const yearsExpNum = form.yearsExperience !== '' ? Number(form.yearsExperience) : null;
    const slidingScaleMinFeeNum = form.slidingScale && form.slidingScaleMinFee !== '' ? Number(form.slidingScaleMinFee) : null;

    const payload = {
      name: form.name,
      photoUrl: form.photoUrl || null,
      title: form.title,
      bio: form.bio,
      location: form.location,
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
      successTimer.current = setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save profile';
      console.error('[EditProfile] Save error:', msg);
      Alert.alert('Save Failed', msg);
    } finally {
      setSaving(false);
    }
  }, [form]);

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

          <View style={{ marginBottom: 14 }}>
            <FieldLabel label="Location" />
            <StyledInput
              value={form.location}
              onChangeText={(v) => setField('location', v)}
              placeholder="Toronto, ON"
              autoCapitalize="words"
            />
          </View>

          <View style={{ marginBottom: 0 }}>
            <FieldLabel label="Gender" optional />
            <StyledInput
              value={form.gender}
              onChangeText={(v) => setField('gender', v)}
              placeholder="e.g. Female, Male, Non-binary"
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Bio */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
          <SectionTitle title="About" />
          <FieldLabel label="Bio" />
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
          <TagList
            label="Specialties"
            items={form.specialties}
            onAdd={(item) => addTag('specialties', item)}
            onRemove={(i) => removeTag('specialties', i)}
            placeholder="e.g. Anxiety, Depression…"
          />
          <TagList
            label="Therapy Types"
            items={form.therapyTypes}
            onAdd={(item) => addTag('therapyTypes', item)}
            onRemove={(i) => removeTag('therapyTypes', i)}
            placeholder="e.g. CBT, DBT, EMDR…"
          />
        </View>

        {/* Insurances & Languages */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border }}>
          <SectionTitle title="Insurance & Languages" />
          <TagList
            label="Insurances Accepted"
            items={form.insurances}
            onAdd={(item) => addTag('insurances', item)}
            onRemove={(i) => removeTag('insurances', i)}
            placeholder="e.g. Sun Life, Manulife…"
          />
          <TagList
            label="Languages"
            items={form.languages}
            onAdd={(item) => addTag('languages', item)}
            onRemove={(i) => removeTag('languages', i)}
            placeholder="e.g. English, French…"
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
              backgroundColor: saveSuccess ? COLORS.success : COLORS.primary,
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
              {saving ? 'Saving…' : saveSuccess ? 'Saved!' : 'Save Changes'}
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
