import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, PaperProvider, Text } from 'react-native-paper';
import { useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useDbInit } from '@/db/useDbInit';
import { useSettingsStore } from '@/store/useSettingsStore';
import { darkTheme, lightTheme } from '@/ui/theme';

export default function RootLayout() {
  const scheme = useColorScheme();
  const settings = useSettingsStore();
  const { ready, error } = useDbInit();
  const router = useRouter();

  // Determine active theme
  const resolvedScheme =
    settings.theme === 'system' ? scheme : settings.theme === 'dark' ? 'dark' : 'light';
  const theme = resolvedScheme === 'dark' ? darkTheme : lightTheme;

  const isLoading = !settings._hasHydrated || !ready;

  // Once both DB and settings are ready, redirect to onboarding if first launch
  useEffect(() => {
    if (isLoading || error) return;
    if (!settings.onboardingCompleted) {
      router.replace('/onboarding');
    }
  }, [isLoading, error, settings.onboardingCompleted]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />

        {/* Always render the full Stack — Expo Router needs stable route tree */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen
            name="activity/new"
            options={{ presentation: 'modal', headerShown: true, title: 'Nová aktivita' }}
          />
          <Stack.Screen
            name="activity/[id]"
            options={{ presentation: 'modal', headerShown: true, title: 'Upravit aktivitu' }}
          />
        </Stack>

        {/* Overlay a loading/error screen until DB + settings are ready */}
        {error ? (
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              backgroundColor: theme.colors.background,
            }}
          >
            <Text variant="titleMedium" style={{ color: theme.colors.error, textAlign: 'center' }}>
              Chyba databáze: {error.message}
            </Text>
          </View>
        ) : isLoading ? (
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.background,
            }}
          >
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : null}
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

// Inline StyleSheet to avoid import-order issues
import { StyleSheet } from 'react-native';
