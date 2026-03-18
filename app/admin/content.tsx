import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
} from 'react-native';
import { Stack } from 'expo-router';
import { api } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react-native';

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
  danger: '#EF4444',
  success: '#34A853',
  warning: '#F59E0B',
};

interface ContentItem {
  key: string;
  value: string;
  updated_at?: string;
}

interface FaqPair {
  question: string;
  answer: string;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 }}>
      {title}
    </Text>
  );
}

function SaveButton({ onPress, loading, feedback }: { onPress: () => void; loading: boolean; feedback: 'success' | 'error' | null }) {
  const bg = feedback === 'success' ? COLORS.success : feedback === 'error' ? COLORS.danger : COLORS.primary;
  const label = feedback === 'success' ? 'Saved!' : feedback === 'error' ? 'Error' : 'Save';
  return (
    <AnimatedPressable onPress={onPress} disabled={loading} scaleValue={0.97}>
      <View style={{ height: 44, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, marginTop: 12 }}>
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : feedback === 'success' ? (
          <><CheckCircle size={16} color="#fff" /><Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>{label}</Text></>
        ) : feedback === 'error' ? (
          <><AlertCircle size={16} color="#fff" /><Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>{label}</Text></>
        ) : (
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>{label}</Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

export default function ContentScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Home Banner
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerFeedback, setBannerFeedback] = useState<'success' | 'error' | null>(null);

  // Promo Text
  const [promoText, setPromoText] = useState('');
  const [promoSaving, setPromoSaving] = useState(false);
  const [promoFeedback, setPromoFeedback] = useState<'success' | 'error' | null>(null);

  // FAQ
  const [faqItems, setFaqItems] = useState<FaqPair[]>([]);
  const [faqSaving, setFaqSaving] = useState(false);
  const [faqFeedback, setFaqFeedback] = useState<'success' | 'error' | null>(null);

  const fetchContent = useCallback(async () => {
    setError(null);
    console.log('[Content] Fetching GET /api/admin/content');
    try {
      const data = await api.get<ContentItem[]>('/api/admin/content');
      console.log('[Content] Fetched', data.length, 'content items');

      const banner = data.find((d) => d.key === 'home_banner');
      if (banner) {
        try {
          const parsed = JSON.parse(banner.value);
          setBannerTitle(parsed.title ?? '');
          setBannerSubtitle(parsed.subtitle ?? '');
        } catch {
          setBannerTitle(banner.value);
          setBannerSubtitle('');
        }
      }

      const promo = data.find((d) => d.key === 'promo_text');
      if (promo) setPromoText(promo.value);

      const faq = data.find((d) => d.key === 'faq');
      if (faq) {
        try {
          const parsed = JSON.parse(faq.value);
          setFaqItems(Array.isArray(parsed) ? parsed : []);
        } catch {
          setFaqItems([]);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load content.';
      console.error('[Content] Fetch error:', msg);
      setError(msg);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchContent().finally(() => setLoading(false));
  }, [fetchContent]);

  const saveBanner = async () => {
    console.log('[Content] Save home_banner pressed');
    setBannerSaving(true);
    setBannerFeedback(null);
    try {
      const value = JSON.stringify({ title: bannerTitle, subtitle: bannerSubtitle });
      await api.patch('/api/admin/content/home_banner', { value });
      console.log('[Content] home_banner saved');
      setBannerFeedback('success');
    } catch (e) {
      console.error('[Content] Save banner error:', e instanceof Error ? e.message : e);
      setBannerFeedback('error');
    } finally {
      setBannerSaving(false);
      setTimeout(() => setBannerFeedback(null), 2500);
    }
  };

  const savePromo = async () => {
    console.log('[Content] Save promo_text pressed');
    setPromoSaving(true);
    setPromoFeedback(null);
    try {
      await api.patch('/api/admin/content/promo_text', { value: promoText });
      console.log('[Content] promo_text saved');
      setPromoFeedback('success');
    } catch (e) {
      console.error('[Content] Save promo error:', e instanceof Error ? e.message : e);
      setPromoFeedback('error');
    } finally {
      setPromoSaving(false);
      setTimeout(() => setPromoFeedback(null), 2500);
    }
  };

  const saveFaq = async () => {
    console.log('[Content] Save faq pressed, items:', faqItems.length);
    setFaqSaving(true);
    setFaqFeedback(null);
    try {
      await api.patch('/api/admin/content/faq', { value: JSON.stringify(faqItems) });
      console.log('[Content] faq saved');
      setFaqFeedback('success');
    } catch (e) {
      console.error('[Content] Save faq error:', e instanceof Error ? e.message : e);
      setFaqFeedback('error');
    } finally {
      setFaqSaving(false);
      setTimeout(() => setFaqFeedback(null), 2500);
    }
  };

  const addFaqItem = () => {
    console.log('[Content] Add FAQ item pressed');
    setFaqItems((prev) => [...prev, { question: '', answer: '' }]);
  };

  const removeFaqItem = (index: number) => {
    console.log('[Content] Remove FAQ item pressed, index:', index);
    setFaqItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFaqItem = (index: number, field: 'question' | 'answer', value: string) => {
    setFaqItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: 'App Content' }} />
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Stack.Screen options={{ title: 'App Content' }} />
        <Text style={{ fontSize: 15, color: COLORS.danger, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginBottom: 16 }}>{error}</Text>
        <AnimatedPressable onPress={() => { setLoading(true); fetchContent().finally(() => setLoading(false)); }} scaleValue={0.97}>
          <View style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans_600SemiBold' }}>Retry</Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'App Content', headerLargeTitle: false }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Home Banner ── */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, borderCurve: 'continuous', padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
          <SectionHeader title="Home Banner" />
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold', marginBottom: 6 }}>Title</Text>
          <TextInput
            value={bannerTitle}
            onChangeText={setBannerTitle}
            placeholder="Banner title..."
            placeholderTextColor={COLORS.textTertiary}
            style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_400Regular', borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 }}
          />
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold', marginBottom: 6 }}>Subtitle</Text>
          <TextInput
            value={bannerSubtitle}
            onChangeText={setBannerSubtitle}
            placeholder="Banner subtitle..."
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
            style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_400Regular', borderWidth: 1, borderColor: COLORS.border, minHeight: 64 }}
          />
          <SaveButton onPress={saveBanner} loading={bannerSaving} feedback={bannerFeedback} />
        </View>

        {/* ── Promotional Text ── */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, borderCurve: 'continuous', padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
          <SectionHeader title="Promotional Text" />
          <TextInput
            value={promoText}
            onChangeText={setPromoText}
            placeholder="Promotional text shown in the app..."
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_400Regular', borderWidth: 1, borderColor: COLORS.border, minHeight: 80 }}
          />
          <SaveButton onPress={savePromo} loading={promoSaving} feedback={promoFeedback} />
        </View>

        {/* ── FAQ ── */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, borderCurve: 'continuous', padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
          <SectionHeader title="FAQ" />

          {faqItems.map((item, index) => {
            const questionNum = index + 1;
            return (
              <View key={index} style={{ marginBottom: 16, backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>
                    Q{questionNum}
                  </Text>
                  <AnimatedPressable onPress={() => removeFaqItem(index)} scaleValue={0.88}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={14} color={COLORS.danger} />
                    </View>
                  </AnimatedPressable>
                </View>
                <TextInput
                  value={item.question}
                  onChangeText={(t) => updateFaqItem(index, 'question', t)}
                  placeholder="Question..."
                  placeholderTextColor={COLORS.textTertiary}
                  style={{ backgroundColor: COLORS.surface, borderRadius: 10, padding: 10, fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_400Regular', borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 }}
                />
                <TextInput
                  value={item.answer}
                  onChangeText={(t) => updateFaqItem(index, 'answer', t)}
                  placeholder="Answer..."
                  placeholderTextColor={COLORS.textTertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={{ backgroundColor: COLORS.surface, borderRadius: 10, padding: 10, fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_400Regular', borderWidth: 1, borderColor: COLORS.border, minHeight: 70 }}
                />
              </View>
            );
          })}

          <AnimatedPressable onPress={addFaqItem} scaleValue={0.97}>
            <View style={{ height: 44, borderRadius: 12, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderWidth: 1, borderColor: COLORS.primary + '30' }}>
              <Plus size={16} color={COLORS.primary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' }}>Add Question</Text>
            </View>
          </AnimatedPressable>

          <SaveButton onPress={saveFaq} loading={faqSaving} feedback={faqFeedback} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
