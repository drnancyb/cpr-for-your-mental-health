import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Stack } from 'expo-router';

const COLORS = {
  background: '#FFFFFF',
  text: '#1A2E25',
  textSecondary: '#5C7A6A',
  textTertiary: '#9BB5A8',
  primary: '#2D7A5F',
  border: 'rgba(45, 122, 95, 0.08)',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          fontSize: 15,
          fontWeight: '700',
          color: COLORS.text,
          fontFamily: 'DMSans_700Bold',
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: 14,
        color: COLORS.textSecondary,
        fontFamily: 'DMSans_400Regular',
        lineHeight: 22,
      }}
    >
      {children}
    </Text>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
      <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', lineHeight: 22 }}>
        {'•'}
      </Text>
      <Text style={{ flex: 1, fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', lineHeight: 22 }}>
        {text}
      </Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen options={{ title: 'Privacy Policy', headerLargeTitle: false }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60 }}
      >
        <Text
          style={{
            fontSize: 26,
            fontWeight: '700',
            color: COLORS.text,
            fontFamily: 'DMSans_700Bold',
            marginBottom: 6,
            letterSpacing: -0.3,
          }}
        >
          Privacy Policy
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: COLORS.textTertiary,
            fontFamily: 'DMSans_400Regular',
            marginBottom: 28,
          }}
        >
          Last updated: 2025
        </Text>

        <Section title="Information We Collect">
          <Body>
            {'We may collect limited personal information such as:'}
          </Body>
          <Bullet text="Name and email address (if you contact a provider or submit an inquiry)" />
          <Bullet text="Search preferences (e.g., location, specialty filters)" />
          <Bullet text="Basic usage data to improve platform performance" />
          <View style={{ marginTop: 10 }}>
            <Body>
              {'We do not collect or store sensitive personal health information.'}
            </Body>
          </View>
        </Section>

        <View style={{ height: 1, backgroundColor: COLORS.border, marginBottom: 24 }} />

        <Section title="How We Use Information">
          <Body>
            {'We use collected information to:'}
          </Body>
          <Bullet text="Help users find listed mental health professionals" />
          <Bullet text="Improve search functionality and user experience" />
          <Bullet text="Communicate with users if they reach out through the platform" />
        </Section>

        <View style={{ height: 1, backgroundColor: COLORS.border, marginBottom: 24 }} />

        <Section title="Information Sharing">
          <Body>
            {'We do not sell or rent your personal information. Information may be shared only:'}
          </Body>
          <Bullet text="With therapists when you choose to contact them" />
          <Bullet text="When required by law" />
        </Section>

        <View style={{ height: 1, backgroundColor: COLORS.border, marginBottom: 24 }} />

        <Section title="Data Storage and Security">
          <Body>
            {'We take reasonable steps to protect user information using standard security practices. However, no system can guarantee complete security.'}
          </Body>
        </Section>

        <View style={{ height: 1, backgroundColor: COLORS.border, marginBottom: 24 }} />

        <Section title="Third-Party Links">
          <Body>
            {'This platform may contain links to third-party websites or booking systems. We are not responsible for the privacy practices of those external sites.'}
          </Body>
        </Section>

        <View style={{ height: 1, backgroundColor: COLORS.border, marginBottom: 24 }} />

        <Section title="Consent">
          <Body>
            {'By using this platform, you consent to the collection and use of information as described in this policy.'}
          </Body>
        </Section>

        <View style={{ height: 1, backgroundColor: COLORS.border, marginBottom: 24 }} />

        <Section title="Contact">
          <Body>
            {'If you have questions about this Privacy Policy, please contact us at: [your email]'}
          </Body>
        </Section>
      </ScrollView>
    </View>
  );
}
