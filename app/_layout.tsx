import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, PaperProvider, Text } from 'react-native-paper';
import { useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import {
  useFonts,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from '@expo-google-fonts/dm-sans';

import { useDbInit } from '@/db/useDbInit';
import { useWalCheckpoint } from '@/db/useWalCheckpoint';
import { ensureReminderChannel } from '@/notifications/channel';
import { useReminderSync } from '@/notifications/useReminderSync';

// Register widget task handler at module level (before React mounts).
// On non-Android platforms react-native-android-widget is a no-op.
//
// Dynamic require + try/catch (ne statický import nahoře) — react-native-android-widget
// je custom native modul, který v Expo Go neexistuje. Na novou architekturu (newArchEnabled)
// `TurboModuleRegistry.getEnforcing(...)` v jeho AndroidWidget.js hodí synchronní chybu hned
// při require — bez try/catch by spadl celý root layout (a tím celá appka) při startu v Expo Go.
if (Platform.OS === 'android') {
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    const { widgetTaskHandler } = require('@/widget/widgetTaskHandler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch {
    // Expo Go — widget není k dispozici, appka běží dál bez něj (potřeba dev build).
  }
}

// Foreground notification behavior — module level, same lifetime as the app
// process (must be registered before any notification could arrive).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
import { useSettingsStore } from '@/store/useSettingsStore';
import { darkTheme, lightTheme } from '@/ui/theme';
import { useTranslation } from '@/i18n';

export default function RootLayout() {
  const scheme = useColorScheme();
  const settings = useSettingsStore();
  const { ready, error } = useDbInit();
  const router = useRouter();
  const t = useTranslation();

  const [fontsLoaded] = useFonts({
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });

  const resolvedScheme =
    settings.theme === 'system' ? scheme : settings.theme === 'dark' ? 'dark' : 'light';
  const theme = resolvedScheme === 'dark' ? darkTheme : lightTheme;

  const isLoading = !settings._hasHydrated || !ready || !fontsLoaded;

  useEffect(() => {
    if (isLoading || error) return;
    if (__DEV__) {
      console.log(
        '[onboarding-gate] onboardingCompleted =',
        settings.onboardingCompleted,
        '→',
        settings.onboardingCompleted ? 'staying on (tabs)' : 'redirecting to /funnel',
      );
    }
    if (!settings.onboardingCompleted) {
      router.replace('/funnel');
    }
  }, [isLoading, error, settings.onboardingCompleted]);

  // Android notification channel for reminders — safe to ensure unconditionally,
  // it's a no-op if it already exists and nothing fires without permission + scheduling.
  useEffect(() => {
    void ensureReminderChannel();
  }, []);

  // WAL checkpoint při přechodu appky do pozadí — ať je `.db` self-contained
  // pro Android Auto Backup (záloha nezahrnuje `-wal`/`-shm`).
  useWalCheckpoint();

  // Keeps scheduled reminders (L1 daily + L2 streak-at-risk) in sync with
  // settings, live activity/completion state, app startup, and foreground
  // resumes — see useReminderSync.ts for what triggers a reschedule.
  useReminderSync();

  // Tapping a reminder notification (cold start or while running) opens the app
  // on the Aktivity tab. Guarded by onboardingCompleted — bez toho by tahle
  // navigace mohla (ve stejném renderu) přepsat redirect na /funnel výše, pokud
  // by `getLastNotificationResponse()` vrátil zastaralou nativní hodnotu z
  // dřívějšího testování (notifikace přežívají i smazání dat appky).
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (isLoading || error || !lastNotificationResponse || !settings.onboardingCompleted) return;
    router.push('/');
  }, [isLoading, error, lastNotificationResponse, settings.onboardingCompleted, router]);

  return (
    <SafeAreaProvider>
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
                {t.common.dbError(error.message)}
              </Text>
            </View>
          ) : isLoading ? (
            // Block screen mount until fonts + DB + persisted settings are ready.
            // Mounting <Stack> early causes Home to lay out with fallback font
            // metrics; cached dimensions then persist after fonts swap in,
            // breaking spacing until a manual refresh.
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
          ) : (
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.background },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="activity/new"
                options={{ presentation: 'modal', headerShown: true, title: t.activity.newTitle }}
              />
              <Stack.Screen
                name="activity/[id]"
                options={{ presentation: 'modal', headerShown: true, title: t.activity.editTitle }}
              />
            </Stack>
          )}
        </PaperProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
