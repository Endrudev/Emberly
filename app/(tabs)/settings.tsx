import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TAB_BAR_SPACE } from './_layout';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useAppStore } from '@/store/useAppStore';
import { useSettingsStore, type WeekStart } from '@/store/useSettingsStore';
import { usePurchasesStore, useIsPremium } from '@/store/usePurchasesStore';
import { openPaywall, restoreAndSync } from '@/purchases/openPaywall';
import { showManageSubscriptions } from '@/purchases/purchases';
import { useAppTheme } from '@/ui/useAppTheme';
import { COLORS, FONTS } from '@/ui/theme';
import { useTranslation, useDateLocale } from '@/i18n';
import { AnimatedToggle } from '@/ui/components/AnimatedToggle';
import { SegmentedPill } from '@/ui/components/SegmentedPill';
import { AnimatedPressable } from '@/ui/anim/AnimatedPressable';
import { useReduceMotion } from '@/ui/anim/useReduceMotion';
import { success, tapMedium } from '@/ui/anim/haptics';
import { requestNotificationPermission } from '@/notifications/permissions';
import { REVIEWER_UNLOCK_CODE } from '@/purchases/gating';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '@/config/legal';

/** "HH:mm" → Date dnešního dne s daným časem — vstup pro <DateTimePicker>. */
function timeStringToDate(time: string): Date {
  const [hourStr, minuteStr] = time.split(':');
  const date = new Date();
  date.setHours(Number(hourStr) || 0, Number(minuteStr) || 0, 0, 0);
  return date;
}

// ─── Reusable settings row ────────────────────────────────────────────────────

interface SettingsRowProps {
  icon: string;
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
        <Text style={styles.rowIconEmoji}>{icon}</Text>
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
  const settings   = useSettingsStore();
  const isPremium  = useIsPremium();
  const devOverride = usePurchasesStore((s) => s.devPremiumOverride);
  const setDevOverride = usePurchasesStore((s) => s.setDevOverride);
  const reviewerUnlock = usePurchasesStore((s) => s.reviewerUnlock);
  const setReviewerUnlock = usePurchasesStore((s) => s.setReviewerUnlock);

  // Skrytý „reviewer unlock" — 7× klepnutí na verzi odhalí pole pro tajný kód,
  // který odemkne premium bez nákupu (pro Google Play recenzenty). Viz
  // REVIEWER_UNLOCK_CODE + usePurchasesStore.
  const [versionTaps, setVersionTaps] = useState(0);
  const [showReviewerInput, setShowReviewerInput] = useState(false);
  const [reviewerCode, setReviewerCode] = useState('');

  const handleVersionTap = useCallback(() => {
    if (reviewerUnlock) return;
    setVersionTaps((prev) => {
      const next = prev + 1;
      if (next >= 7) {
        setShowReviewerInput(true);
        return 0;
      }
      return next;
    });
  }, [reviewerUnlock]);

  const handleReviewerCodeSubmit = useCallback(() => {
    if (reviewerCode.trim().toUpperCase() === REVIEWER_UNLOCK_CODE) {
      success();
      setReviewerUnlock(true);
      setShowReviewerInput(false);
      setReviewerCode('');
      Alert.alert('Reviewer access', 'Premium unlocked for review.');
    } else {
      Alert.alert('Reviewer access', 'Invalid code.');
    }
  }, [reviewerCode, setReviewerUnlock]);

  const handleReviewerDisable = useCallback(() => {
    Alert.alert('Reviewer access', 'Disable reviewer premium unlock?', [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.delete, style: 'destructive', onPress: () => setReviewerUnlock(false) },
    ]);
  }, [t, setReviewerUnlock]);

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

  const initials = useMemo(() => {
    const name = settings.userName.trim();
    if (!name) return 'MT';
    return name
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }, [settings.userName]);

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

        {/* ── Profile card ── */}
        <AnimatedPressable
          style={[styles.profileCard, surfaceAnimStyle]}
          hapticStyle="none"
          onPress={() => {}}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: C.text }]}>
              {settings.userName || 'Emberly'}
            </Text>
            {trackingSince ? (
              <Text style={[styles.profileSince, { color: C.textSecondary }]}>
                {t.settings.trackingSince(trackingSince)}
              </Text>
            ) : null}
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={C.isDark ? '#555' : '#CCC'} />
        </AnimatedPressable>

        {/* ── Preferences ── */}
        <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>
          {t.settings.preferencesSection}
        </Text>
        <Animated.View style={[styles.section, surfaceAnimStyle]}>
          <SettingsRow
            {...rowProps}
            icon="🔔"
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
                icon="⏰"
                iconBg="#FFF0E8"
                label={t.settings.reminderTimeLabel}
                value={settings.reminderTime}
                onPress={() => setReminderTimePickerVisible(true)}
              />
              <SettingsRow
                {...rowProps}
                icon="🔥"
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
            icon="🎨"
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
            icon="🌐"
            iconBg="#EEF4FF"
            label={t.settings.language}
            value={
              settings.language === 'cs'
                ? t.settings.languageCz
                : settings.language === 'en'
                  ? t.settings.languageEn
                  : t.settings.languageAuto
            }
            onPress={() => router.push('/settings/language')}
          />
          <SettingsRow
            {...rowProps}
            icon="📲"
            iconBg="#E8F7EB"
            label={t.widget.settingsRowLabel}
            onPress={() => router.push('/settings/widget')}
          />
          <SettingsRow
            {...rowProps}
            icon="📅"
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

        {/* ── Data ── */}
        <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>
          {t.settings.dataSection}
        </Text>
        <Animated.View style={[styles.section, surfaceAnimStyle]}>
          <SettingsRow
            {...rowProps}
            icon="☁️"
            iconBg="#E8F4FE"
            label={t.settings.autoBackupLabel}
            showArrow={false}
          />
          <SettingsRow
            {...rowProps}
            icon="🗑️"
            iconBg="#FFE8E8"
            label={t.settings.resetData}
            onPress={handleResetData}
            isLast
          />
        </Animated.View>
        <Text style={[styles.sectionFootnote, { color: C.textTertiary }]}>
          {t.settings.autoBackupDescription}
        </Text>

        {/* ── Subscription ── */}
        <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>
          {t.premium.subscriptionSection}
        </Text>
        <Animated.View style={[styles.section, surfaceAnimStyle]}>
          {isPremium ? (
            <>
              <SettingsRow
                {...rowProps}
                icon="⭐"
                iconBg="#FFF7E0"
                label={t.premium.premiumActiveTitle}
                value={t.premium.premiumActiveSubtitle}
                showArrow={false}
              />
              <SettingsRow
                {...rowProps}
                icon="⚙️"
                iconBg="#E8F4FE"
                label={t.premium.manageTitle}
                onPress={() => void showManageSubscriptions()}
              />
            </>
          ) : (
            <SettingsRow
              {...rowProps}
              icon="⭐"
              iconBg="#FFF7E0"
              label={t.premium.upgradeTitle}
              value={t.premium.upgradeSubtitle}
              onPress={() => void openPaywall()}
            />
          )}
          <SettingsRow
            {...rowProps}
            icon="🔄"
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

        {/* ── About ── */}
        <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>{t.settings.about}</Text>
        <Animated.View style={[styles.section, surfaceAnimStyle]}>
          <SettingsRow
            {...rowProps}
            icon="🔒"
            iconBg="#F0F2F5"
            label={t.settings.privacyPolicy}
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          />
          <SettingsRow
            {...rowProps}
            icon="📄"
            iconBg="#F0F2F5"
            label={t.settings.termsOfService}
            onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}
          />
          <SettingsRow
            {...rowProps}
            icon="ℹ️"
            iconBg="#F0F2F5"
            label={t.settings.version}
            value="0.1.0"
            showArrow={false}
            isLast={!__DEV__ && !showReviewerInput && !reviewerUnlock}
            onPress={handleVersionTap}
          />
          {/* Skryté pole pro reviewer kód — odhalí se po 7× klepnutí na verzi. */}
          {showReviewerInput && !reviewerUnlock ? (
            <View style={[styles.row, styles.rowBorder, { borderBottomColor: C.border }]}>
              <View style={[styles.rowIcon, { backgroundColor: '#EEF0FF' }]}>
                <Text style={styles.rowIconEmoji}>🔑</Text>
              </View>
              <TextInput
                style={[styles.rowText, { flex: 1, color: C.isDark ? '#F2F2F7' : '#1A1A1A' }]}
                placeholder="Reviewer code"
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
              icon="🔑"
              iconBg="#EEF0FF"
              label="Reviewer access"
              value="Active — tap to disable"
              showArrow={false}
              isLast={!__DEV__}
              onPress={handleReviewerDisable}
            />
          ) : null}
          {__DEV__ ? (
            <SettingsRow
              {...rowProps}
              icon="🔁"
              iconBg="#FFF0E8"
              label="Restartovat onboarding (dev)"
              showArrow={false}
              isLast
              onPress={() => {
                settings.resetOnboarding();
                router.replace('/funnel');
              }}
            />
          ) : null}
        </Animated.View>

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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  profileName: { fontSize: 16, fontFamily: FONTS.bold },
  profileSince: { fontSize: 12, fontFamily: FONTS.semiBold, marginTop: 2 },
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
  rowLabel: { flex: 1 },
  rowText:  { fontSize: 15, fontFamily: FONTS.semiBold },
  rowValue: { fontSize: 13, fontFamily: FONTS.semiBold, marginTop: 1 },
});
