import { Stack } from 'expo-router';

export default function TherapistLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Back',
        headerTintColor: '#2D7A5F',
        headerTitleStyle: {
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 17,
          color: '#1A2E25',
        },
        headerStyle: {
          backgroundColor: '#F4F7F5',
        },
        headerShadowVisible: false,
      }}
    />
  );
}
