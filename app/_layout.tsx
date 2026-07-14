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
import {
  completeHabitFromNotification,
  QUICK_COMPLETE_ACTION_PREFIX,
} from '@/notifications/scheduler';
import { usePurchasesSync } from '@/purchases/usePurchasesSync';
import { useStreakFreezeSync } from '@/purchases/useStreakFreezeSync';
import { useSettingsStore } from '@/store/useSettingsStore';
import { darkTheme, lightTheme } from '@/ui/theme';
import { useTranslation } from '@/i18n';
import { AppErrorBoundary } from '@/ui/components/AppErrorBoundary';

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

// Quick-complete action buttons (L2 streak-risk notification, see
// `scheduler.ts`) — registered at MODULE level, not inside a React component,
// so it also fires when the OS wakes the app in the background to handle the
// tap (`opensAppToForeground: false`), not just while the UI is mounted.
// Only handles our custom actions — a plain tap on the notification body
// keeps using `Notifications.DEFAULT_ACTION_IDENTIFIER`, left to the
// tap-to-open navigation effect further down in RootLayout.
Notifications.addNotificationResponseReceivedListener((response) => {
  const { actionIdentifier, notification } = response;
  if (!actionIdentifier.startsWith(QUICK_COMPLETE_ACTION_PREFIX)) return;
  const slot = Number(actionIdentifier.slice(QUICK_COMPLETE_ACTION_PREFIX.length));
  const habitIds = notification.request.content.data?.habitIds as number[] | undefined;
  const habitId = habitIds?.[slot];
  if (habitId != null) {
    completeHabitFromNotification(habitId).catch((err) => {
      if (__DEV__) console.warn('[quick-complete] failed', err);
    });
  }
});

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
  // Re-runs on language change too — setNotificationChannelAsync updates the display
  // name of an existing channel (unlike importance/sound, which are immutable).
  useEffect(() => {
    void ensureReminderChannel(t.notification.remindersChannelName);
  }, [t]);

  // WAL checkpoint při přechodu appky do pozadí — ať je `.db` self-contained
  // pro Android Auto Backup (záloha nezahrnuje `-wal`/`-shm`).
  useWalCheckpoint();

  // Keeps scheduled reminders (L1 daily + L2 streak-at-risk) in sync with
  // settings, live activity/completion state, app startup, and foreground
  // resumes — see useReminderSync.ts for what triggers a reschedule.
  useReminderSync();

  // Keeps RevenueCat entitlement (isPremium) in sync — configures the SDK,
  // loads current state, listens for purchases, refreshes on foreground.
  // No-op in Expo Go / without a real API key (see usePurchasesSync).
  usePurchasesSync();

  // Premium "ochrana série" — tiše zmrazí včerejšek, pokud byl zmeškaný a kvóta
  // dovolí. Žádný native modul, funguje i v Expo Go (viz useStreakFreezeSync).
  useStreakFreezeSync();

  // Tapping a reminder notification (cold start or while running) opens the app
  // on the Aktivity tab. Guarded by onboardingCompleted — bez toho by tahle
  // navigace mohla (ve stejném renderu) přepsat redirect na /funnel výše, pokud
  // by `getLastNotificationResponse()` vrátil zastaralou nativní hodnotu z
  // dřívějšího testování (notifikace přežívají i smazání dat appky). Vyloučeny
  // jsou quick-complete tlačítka (`QUICK_COMPLETE_...`) — ta appku schválně
  // neotevírají, jen tiše zapíšou splnění (viz listener výše).
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (isLoading || error || !lastNotificationResponse || !settings.onboardingCompleted) return;
    if (lastNotificationResponse.actionIdentifier.startsWith(QUICK_COMPLETE_ACTION_PREFIX)) return;
    router.push('/');
  }, [isLoading, error, lastNotificationResponse, settings.onboardingCompleted, router]);

  return (
    <AppErrorBoundary>
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
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.error, textAlign: 'center' }}
                >
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
                  options={{
                    presentation: 'modal',
                    headerShown: true,
                    title: t.activity.editTitle,
                  }}
                />
              </Stack>
            )}
          </PaperProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}
