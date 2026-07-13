import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { TAB_BAR_SPACE } from './_layout';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useAppStore } from '@/store/useAppStore';
import { useFunnelStore } from '@/store/useFunnelStore';
import { useSettingsStore, type WeekStart } from '@/store/useSettingsStore';
import { usePurchasesStore, useIsPremium } from '@/store/usePurchasesStore';
import { seedDemoData } from '@/db/demoSeed';
import { openPaywall, restoreAndSync } from '@/purchases/openPaywall';
import { showManageSubscriptions } from '@/purchases/purchases';
import { useAppTheme } from '@/ui/useAppTheme';
import { FONTS } from '@/ui/theme';
import { useTranslation, useDateLocale } from '@/i18n';
import { AnimatedToggle } from '@/ui/components/AnimatedToggle';
import { SegmentedPill } from '@/ui/components/SegmentedPill';
import { useReduceMotion } from '@/ui/anim/useReduceMotion';
import { success, tapMedium } from '@/ui/anim/haptics';
import { requestNotificationPermission } from '@/notifications/permissions';
import { REVIEWER_UNLOCK_CODE, TESTER_LIFETIME_CODE } from '@/purchases/gating';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '@/config/legal';
import { FEEDBACK_EMAIL, FEEDBACK_DISCORD_URL, hasRealDiscordUrl } from '@/config/feedback';
import * as Device from 'expo-device';

// Vlastní ikony (assets/icons/) nahrazující emoji — viz vault design/visual-assets.md.
// Dvě dev-only řádky (🧪, 🔁) zatím emoji ikonu nemají, čekají na dodání assetu.
const ICONS = {
  bell: require('../../assets/icons/bell.png') as ImageSourcePropType,
  alarmClock: require('../../assets/icons/alarm-clock.png') as ImageSourcePropType,
  flame: require('../../assets/icons/flame.png') as ImageSourcePropType,
  palette: require('../../assets/icons/palette.png') as ImageSourcePropType,
  globe: require('../../assets/icons/globe.png') as ImageSourcePropType,
  widget: require('../../assets/icons/widget.png') as ImageSourcePropType,
  calendar: require('../../assets/icons/calendar.png') as ImageSourcePropType,
  cloudBackup: require('../../assets/icons/cloud-backup.png') as ImageSourcePropType,
  trash: require('../../assets/icons/trash.png') as ImageSourcePropType,
  starFilled: require('../../assets/icons/star-filled.png') as ImageSourcePropType,
  gear: require('../../assets/icons/gear.png') as ImageSourcePropType,
  restore: require('../../assets/icons/restore.png') as ImageSourcePropType,
  lock: require('../../assets/icons/lock.png') as ImageSourcePropType,
  document: require('../../assets/icons/document.png') as ImageSourcePropType,
  info: require('../../assets/icons/info.png') as ImageSourcePropType,
  key: require('../../assets/icons/key.png') as ImageSourcePropType,
  lightbulb: require('../../assets/icons/lightbulb.png') as ImageSourcePropType,
};

/** "HH:mm" → Date dnešního dne s daným časem — vstup pro <DateTimePicker>. */
function timeStringToDate(time: string): Date {
  const [hourStr, minuteStr] = time.split(':');
  const date = new Date();
  date.setHours(Number(hourStr) || 0, Number(minuteStr) || 0, 0, 0);
  return date;
}

// ─── Reusable settings row ────────────────────────────────────────────────────

interface SettingsRowProps {
  icon: string | ImageSourcePropType;
  iconBg: string;
  label: string;
  value?: string;
  showArrow?: boolean;
  right?: React.ReactNode;
  onPress?: () => void;
  isLast?: boolean;
  isDark?: boolean;
  border?: string;
  rowPressedBg?: string;
}

function SettingsRow({
  icon,
  iconBg,
  label,
  value,
  showArrow = true,
  right,
  onPress,
  isLast = false,
  isDark = false,
  border = '#F0F0F0',
  rowPressedBg = '#F8F8F8',
}: SettingsRowProps) {
  const textColor = isDark ? '#F2F2F7' : '#1A1A1A';
  const valueColor = isDark ? '#ABABAB' : '#666666';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && [styles.rowBorder, { borderBottomColor: border }],
        pressed && onPress ? { backgroundColor: rowPressedBg } : null,
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        {typeof icon === 'string' ? (
          <Text style={styles.rowIconEmoji}>{icon}</Text>
        ) : (
          <Image source={icon} style={styles.rowIconImage} resizeMode="contain" />
        )}
      </View>
      <View style={styles.rowLabel}>
        <Text style={[styles.rowText, { color: textColor }]}>{label}</Text>
        {value ? <Text style={[styles.rowValue, { color: valueColor }]}>{value}</Text> : null}
      </View>
      {right ?? (showArrow && onPress ? (
        <MaterialCommunityIcons name="chevron-right" size={20} color={isDark ? '#555' : '#CCC'} />
      ) : null)}
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const t = useTranslation();
  const dateLocale = useDateLocale();
  const C = useAppTheme();
  const router = useRouter();
  const activities = useAppStore((s) => s.activities);
  const resetAllData = useAppStore((s) => s.resetAllData);
  const loadAll = useAppStore((s) => s.loadAll);
  const settings   = useSettingsStore();
  const isPremium  = useIsPremium();
  const devOverride = usePurchasesStore((s) => s.devPremiumOverride);
  const setDevOverride = usePurchasesStore((s) => s.setDevOverride);
  const reviewerUnlock = usePurchasesStore((s) => s.reviewerUnlock);
  const setReviewerUnlock = usePurchasesStore((s) => s.setReviewerUnlock);
  const testerLifetimeUnlock = usePurchasesStore((s) => s.testerLifetimeUnlock);
  const setTesterLifetimeUnlock = usePurchasesStore((s) => s.setTesterLifetimeUnlock);

  // Skrytý „reviewer unlock" — 7× klepnutí na verzi odhalí pole pro tajný kód.
  // Stejné pole přijímá i REVIEWER_UNLOCK_CODE (Google recenzent) i
  // TESTER_LIFETIME_CODE (odměna pro beta testery po skončení testingu) —
  // podle toho, který sedí, se nastaví odpovídající perzistentní stav.
  const [versionTaps, setVersionTaps] = useState(0);
  const [showReviewerInput, setShowReviewerInput] = useState(false);
  const [reviewerCode, setReviewerCode] = useState('');
  const anyCodeUnlockActive = reviewerUnlock || testerLifetimeUnlock;

  const handleVersionTap = useCallback(() => {
    if (anyCodeUnlockActive) return;
    setVersionTaps((prev) => {
      const next = prev + 1;
      if (next >= 7) {
        setShowReviewerInput(true);
        return 0;
      }
      return next;
    });
  }, [anyCodeUnlockActive]);

  const handleReviewerCodeSubmit = useCallback(() => {
    const code = reviewerCode.trim().toUpperCase();
    if (code === REVIEWER_UNLOCK_CODE) {
      success();
      setReviewerUnlock(true);
      setShowReviewerInput(false);
      setReviewerCode('');
      Alert.alert(t.reviewer.title, t.reviewer.unlockedBody);
    } else if (code === TESTER_LIFETIME_CODE) {
      success();
      setTesterLifetimeUnlock(true);
      setShowReviewerInput(false);
      setReviewerCode('');
      Alert.alert(t.testerLifetime.title, t.testerLifetime.unlockedBody);
    } else {
      Alert.alert(t.reviewer.title, t.reviewer.invalidCode);
    }
  }, [t, reviewerCode, setReviewerUnlock, setTesterLifetimeUnlock]);

  const handleReviewerDisable = useCallback(() => {
    Alert.alert(t.reviewer.title, t.reviewer.disableConfirmBody, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.delete, style: 'destructive', onPress: () => setReviewerUnlock(false) },
    ]);
  }, [t, setReviewerUnlock]);

  const handleTesterLifetimeDisable = useCallback(() => {
    Alert.alert(t.testerLifetime.title, t.testerLifetime.disableConfirmBody, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.delete, style: 'destructive', onPress: () => setTesterLifetimeUnlock(false) },
    ]);
  }, [t, setTesterLifetimeUnlock]);

  const handleRestore = useCallback(() => {
    void restoreAndSync().then((premium) => {
      Alert.alert(
        premium ? t.premium.restoreSuccessTitle : t.premium.restoreTitle,
        premium ? t.premium.restoreSuccessBody : t.premium.restoreNoneFound,
      );
    });
  }, [t]);

  const handleResetData = useCallback(() => {
    tapMedium();
    Alert.alert(t.settings.resetConfirmTitle, t.settings.resetConfirmBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => {
          void resetAllData().then(() => success());
        },
      },
    ]);
  }, [t, resetAllData]);

  // Dev-only: naplní appku ~100denní ukázkovou historií (solidní streak ve
  // druhé nejvyšší tier kategorii) pro marketingové screenshoty. Zapne i
  // premium dev override, ať jsou hned vidět i zamčené sekce Statistik.
  const handleSeedDemoData = useCallback(() => {
    tapMedium();
    Alert.alert(t.devTools.seedDemoConfirmTitle, t.devTools.seedDemoConfirmBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.confirm,
        onPress: () => {
          void seedDemoData()
            .then(() => loadAll())
            .then(() => {
              setDevOverride(true);
              success();
            });
        },
      },
    ]);
  }, [t, loadAll, setDevOverride]);

  const [reminderTimePickerVisible, setReminderTimePickerVisible] = useState(false);

  const handleToggleReminders = useCallback(
    async (next: boolean) => {
      if (!next) {
        settings.setRemindersEnabled(false);
        return;
      }
      const status = await requestNotificationPermission();
      if (status === Notifications.PermissionStatus.GRANTED) {
        settings.setRemindersEnabled(true);
      } else {
        Alert.alert(
          t.settings.reminderPermissionDeniedTitle,
          t.settings.reminderPermissionDeniedBody,
        );
      }
    },
    [t, settings],
  );

  const weekStartOptions: { key: WeekStart; label: string }[] = [
    { key: 'monday', label: t.days.short[0] },
    { key: 'sunday', label: t.days.short[6] },
  ];

  const handleChangeWeekStart = useCallback(
    (next: WeekStart) => {
      Alert.alert(t.settings.weekStartChangeConfirmTitle, t.settings.weekStartChangeConfirmBody, [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.confirm,
          onPress: () => settings.setWeekStart(next),
        },
      ]);
    },
    [t, settings],
  );

  // Application.native*Version čte skutečné hodnoty z buildu (ne z app.json) — v Expo Go
  // ale nemusí být dostupné, proto fallback na Constants.expoConfig.version.
  const appVersion =
    Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '—';
  const buildVersion = Application.nativeBuildVersion;
  const versionLabel = buildVersion ? `${appVersion} (build ${buildVersion})` : appVersion;

  const handleReportProblem = useCallback(() => {
    try {
      if (hasRealDiscordUrl()) {
        void Linking.openURL(FEEDBACK_DISCORD_URL);
        return;
      }
      const body = t.settings.reportProblemEmailBody(
        versionLabel,
        Device.modelName ?? '—',
        Device.osVersion ?? '—',
      );
      const mailtoUrl = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
        t.settings.reportProblemEmailSubject,
      )}&body=${encodeURIComponent(body)}`;
      void Linking.openURL(mailtoUrl);
    } catch {
      Alert.alert(t.settings.reportProblemErrorTitle, t.settings.reportProblemErrorBody(FEEDBACK_EMAIL));
    }
  }, [t, versionLabel]);

  const trackingSince = useMemo(() => {
    if (settings.trackingSinceMs) {
      return format(new Date(settings.trackingSinceMs), 'MMM yyyy', { locale: dateLocale });
    }
    if (activities.length > 0) {
      const earliest = activities.reduce(
        (min, a) => (a.createdAt < min ? a.createdAt : min),
        activities[0]!.createdAt,
      );
      return format(new Date(earliest), 'MMM yyyy', { locale: dateLocale });
    }
    return null;
  }, [settings.trackingSinceMs, activities, dateLocale]);

  // Shared props passed to every SettingsRow for dark mode adaptation
  const rowProps = { isDark: C.isDark, border: C.border, rowPressedBg: C.rowPressed };

  // ── Light/dark cross-fade — avoids a hard flash when the theme switches ──
  const reduceMotion = useReduceMotion();
  const themeProgress = useSharedValue(C.isDark ? 1 : 0);
  useEffect(() => {
    const target = C.isDark ? 1 : 0;
    themeProgress.value = reduceMotion ? target : withTiming(target, { duration: 250 });
  }, [C.isDark, reduceMotion, themeProgress]);

  const bgAnimStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(themeProgress.value, [0, 1], ['#ECEDE8', '#1C1C1E']),
  }));
  const surfaceAnimStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(themeProgress.value, [0, 1], ['#FFFFFF', '#2C2C2E']),
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.safe, bgAnimStyle]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={[styles.pageTitle, { color: C.text }]}>{t.settings.title}</Text>

        {/* ── Preferences ── */}
        <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>
          {t.settings.preferencesSection}
        </Text>
        <Animated.View style={[styles.section, surfaceAnimStyle]}>
          <SettingsRow
            {...rowProps}
            icon={ICONS.bell}
            iconBg="#FFF0E8"
            label={t.settings.reminders}
            showArrow={false}
            right={
              <AnimatedToggle
                value={settings.remindersEnabled}
                onValueChange={handleToggleReminders}
              />
            }
          />
          {settings.remindersEnabled ? (
            <>
              <SettingsRow
                {...rowProps}
                icon={ICONS.alarmClock}
                iconBg="#FFF0E8"
                label={t.settings.reminderTimeLabel}
                value={settings.reminderTime}
                onPress={() => setReminderTimePickerVisible(true)}
              />
              <SettingsRow
                {...rowProps}
                icon={ICONS.flame}
                iconBg="#FFF0E8"
                label={t.settings.streakReminderLabel}
                showArrow={false}
                right={
                  <AnimatedToggle
                    value={settings.streakReminderEnabled}
                    onValueChange={settings.setStreakReminderEnabled}
                  />
                }
              />
            </>
          ) : null}
          <SettingsRow
            {...rowProps}
            icon={ICONS.palette}
            iconBg="#F0EEFF"
            label={t.settings.appearance}
            value={C.isDark ? t.settings.themeDark : t.settings.themeLight}
            showArrow={false}
            right={
              <AnimatedToggle
                value={C.isDark}
                onValueChange={(v) => settings.setTheme(v ? 'dark' : 'light')}
              />
            }
          />
          <SettingsRow
            {...rowProps}
            icon={ICONS.widget}
            iconBg="#E8F7EB"
            label={t.widget.settingsRowLabel}
            onPress={() => router.push('/settings/widget')}
          />
          <SettingsRow
            {...rowProps}
            icon={ICONS.calendar}
            iconBg="#E8F4FE"
            label={t.settings.weekStartsOn}
            showArrow={false}
            right={
              <SegmentedPill
                options={weekStartOptions}
                value={settings.weekStart}
                onChange={handleChangeWeekStart}
                isDark={C.isDark}
              />
            }
          />
          <SettingsRow
            {...rowProps}
            icon={ICONS.globe}
            iconBg="#EEF4FF"
            label={t.settings.language}
            value={
              {
                cs: t.settings.languageCz,
                en: t.settings.languageEn,
                de: t.settings.languageDe,
                auto: t.settings.languageAuto,
              }[settings.language]
            }
            onPress={() => router.push('/settings/language')}
            isLast
          />
        </Animated.View>

        {reminderTimePickerVisible ? (
          <DateTimePicker
            value={timeStringToDate(settings.reminderTime)}
            mode="time"
            is24Hour
            onChange={(event, date) => {
              setReminderTimePickerVisible(false);
              if (event.type === 'set' && date) {
                settings.setReminderTime(format(date, 'HH:mm'));
              }
            }}
          />
        ) : null}

        {/* ── Subscription ── */}
        <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>
          {t.premium.subscriptionSection}
        </Text>
        <Animated.View style={[styles.section, surfaceAnimStyle]}>
          {isPremium ? (
            <>
              <SettingsRow
                {...rowProps}
                icon={ICONS.starFilled}
                iconBg="#FFF7E0"
                label={t.premium.premiumActiveTitle}
                value={t.premium.premiumActiveSubtitle}
                showArrow={false}
              />
              <SettingsRow
                {...rowProps}
                icon={ICONS.gear}
                iconBg="#E8F4FE"
                label={t.premium.manageTitle}
                onPress={() => void showManageSubscriptions()}
              />
            </>
          ) : (
            <SettingsRow
              {...rowProps}
              icon={ICONS.starFilled}
              iconBg="#FFF7E0"
              label={t.premium.upgradeTitle}
              value={t.premium.upgradeSubtitle}
              onPress={() => void openPaywall()}
            />
          )}
          <SettingsRow
            {...rowProps}
            icon={ICONS.restore}
            iconBg="#E8F7EB"
            label={t.premium.restoreTitle}
            onPress={handleRestore}
            isLast={!__DEV__}
          />
          {__DEV__ ? (
            <SettingsRow
              {...rowProps}
              icon="🧪"
              iconBg="#F0EEFF"
              label={t.premium.devOverrideLabel}
              showArrow={false}
              isLast
              right={
                <AnimatedToggle
                  value={isPremium}
                  onValueChange={(v) => setDevOverride(v)}
                />
              }
            />
          ) : null}
        </Animated.View>

        {/* ── Beta ── */}
        <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>
          {t.settings.betaSection}
        </Text>
        <Animated.View style={[styles.section, surfaceAnimStyle]}>
          <SettingsRow
            {...rowProps}
            icon={ICONS.lightbulb}
            iconBg="#FFF4E5"
            label={t.settings.reportProblem}
            onPress={handleReportProblem}
          />
          {/* TODO beta-only: remove before production launch */}
          <SettingsRow
            {...rowProps}
            icon={ICONS.restore}
            iconBg="#E8F7EB"
            label={t.settings.replayOnboardingLabel}
            onPress={() => {
              // Funnel store se resetuje tady (ne při dokončení funnelu) —
              // viz komentář v `applyFunnelAnswers.ts` proč reset na konci
              // způsoboval probliknutí prvního kroku při přechodu do appky.
              useFunnelStore.getState().reset();
              settings.resetOnboarding();
              router.replace('/funnel');
            }}
            isLast
          />
        </Animated.View>

        {/* ── About ── */}
        <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>{t.settings.about}</Text>
        <Animated.View style={[styles.section, surfaceAnimStyle]}>
          <SettingsRow
            {...rowProps}
            icon={ICONS.lock}
            iconBg="#F0F2F5"
            label={t.settings.privacyPolicy}
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          />
          <SettingsRow
            {...rowProps}
            icon={ICONS.document}
            iconBg="#F0F2F5"
            label={t.settings.termsOfService}
            onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}
          />
          <SettingsRow
            {...rowProps}
            icon={ICONS.info}
            iconBg="#F0F2F5"
            label={t.settings.version}
            value={versionLabel}
            showArrow={false}
            isLast={!showReviewerInput && !anyCodeUnlockActive}
            onPress={handleVersionTap}
          />
          {/* Skryté pole pro kód — odhalí se po 7× klepnutí na verzi. Přijímá jak
              reviewer kód, tak kód doživotního premia pro testery. */}
          {showReviewerInput && !anyCodeUnlockActive ? (
            <View style={[styles.row, styles.rowBorder, { borderBottomColor: C.border }]}>
              <View style={[styles.rowIcon, { backgroundColor: '#EEF0FF' }]}>
                <Image source={ICONS.key} style={styles.rowIconImage} resizeMode="contain" />
              </View>
              <TextInput
                style={[styles.rowText, { flex: 1, color: C.isDark ? '#F2F2F7' : '#1A1A1A' }]}
                placeholder={t.reviewer.codePlaceholder}
                placeholderTextColor={C.textTertiary}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
                value={reviewerCode}
                onChangeText={setReviewerCode}
                onSubmitEditing={handleReviewerCodeSubmit}
                returnKeyType="done"
              />
            </View>
          ) : null}
          {reviewerUnlock ? (
            <SettingsRow
              {...rowProps}
              icon={ICONS.key}
              iconBg="#EEF0FF"
              label={t.reviewer.title}
              value={t.reviewer.activeValue}
              showArrow={false}
              isLast={!testerLifetimeUnlock}
              onPress={handleReviewerDisable}
            />
          ) : null}
          {testerLifetimeUnlock ? (
            <SettingsRow
              {...rowProps}
              icon={ICONS.key}
              iconBg="#EEF0FF"
              label={t.testerLifetime.title}
              value={t.reviewer.activeValue}
              showArrow={false}
              isLast
              onPress={handleTesterLifetimeDisable}
            />
          ) : null}
        </Animated.View>

        {/* ── Data ── */}
        <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>
          {t.settings.dataSection}
        </Text>
        <Animated.View style={[styles.section, surfaceAnimStyle]}>
          {trackingSince ? (
            <SettingsRow
              {...rowProps}
              icon={ICONS.calendar}
              iconBg="#E8F4FE"
              label={t.settings.trackingSinceLabel}
              value={trackingSince}
              showArrow={false}
            />
          ) : null}
          <SettingsRow
            {...rowProps}
            icon={ICONS.cloudBackup}
            iconBg="#E8F4FE"
            label={t.settings.autoBackupLabel}
            showArrow={false}
          />
          <SettingsRow
            {...rowProps}
            icon={ICONS.trash}
            iconBg="#FFE8E8"
            label={t.settings.resetData}
            onPress={handleResetData}
            isLast={!__DEV__}
          />
          {__DEV__ ? (
            <SettingsRow
              {...rowProps}
              icon="🧪"
              iconBg="#F0EEFF"
              label={t.devTools.seedDemoLabel}
              onPress={handleSeedDemoData}
              isLast
            />
          ) : null}
        </Animated.View>
        <Text style={[styles.sectionFootnote, { color: C.textTertiary }]}>
          {t.settings.autoBackupDescription}
        </Text>

      </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: TAB_BAR_SPACE + 20 },
  pageTitle: {
    fontSize: 28,
    fontFamily: FONTS.extraBold,
    marginBottom: 20,
    letterSpacing: -0.56,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: FONTS.extraBold,
    letterSpacing: 0.96,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionFootnote: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    lineHeight: 17,
    marginTop: -16,
    marginBottom: 24,
    marginHorizontal: 4,
  },
  section: {
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconEmoji: { fontSize: 18 },
  rowIconImage: { width: 20, height: 20 },
  rowLabel: { flex: 1 },
  rowText:  { fontSize: 15, fontFamily: FONTS.semiBold },
  rowValue: { fontSize: 13, fontFamily: FONTS.semiBold, marginTop: 1 },
});
