import { useEffect } from 'react';
import { Redirect, Stack } from 'expo-router';
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

  // Determine theme
  const resolvedScheme =
    settings.theme === 'system' ? scheme : settings.theme === 'dark' ? 'dark' : 'light';
  const theme = resolvedScheme === 'dark' ? darkTheme : lightTheme;

  const isLoading = !settings._hasHydrated || !ready;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />

        {error ? (
          <View
            style={{
              flex: 1,
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
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.background,
            }}
          >
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : !settings.onboardingCompleted ? (
          // First launch — show onboarding before main app
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="onboarding" />
          </Stack>
        ) : (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="activity/new"
              options={{ presentation: 'modal', headerShown: true, title: 'Nová aktivita' }}
            />
            <Stack.Screen
              name="activity/[id]"
              options={{ presentation: 'modal', headerShown: true, title: 'Upravit aktivitu' }}
            />
          </Stack>
        )}
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
