import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TAB_BAR_SPACE } from './_layout';
import { Switch, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { cs as dateFnsCs } from 'date-fns/locale';

import { useAppStore } from '@/store/useAppStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAppTheme } from '@/ui/useAppTheme';
import { COLORS, FONTS } from '@/ui/theme';
import { t } from '@/i18n/cs';

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
  const C = useAppTheme();
  const activities = useAppStore((s) => s.activities);
  const settings   = useSettingsStore();

  const trackingSince = useMemo(() => {
    if (settings.trackingSinceMs) {
      return format(new Date(settings.trackingSinceMs), 'MMM yyyy', { locale: dateFnsCs });
    }
    if (activities.length > 0) {
      const earliest = activities.reduce(
        (min, a) => (a.createdAt < min ? a.createdAt : min),
        activities[0]!.createdAt,
      );
      return format(new Date(earliest), 'MMM yyyy', { locale: dateFnsCs });
    }
    return null;
  }, [settings.trackingSinceMs, activities]);

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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.BG }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={[styles.pageTitle, { color: C.text }]}>{t.settings.title}</Text>

        {/* ── Profile card ── */}
        <Pressable style={[styles.profileCard, { backgroundColor: C.surface }]} onPress={() => {}}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: C.text }]}>
              {settings.userName || 'Mission Tracker'}
            </Text>
            {trackingSince ? (
              <Text style={[styles.profileSince, { color: C.textSecondary }]}>
                {t.settings.trackingSince(trackingSince)}
              </Text>
            ) : null}
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={C.isDark ? '#555' : '#CCC'} />
        </Pressable>

        {/* ── Preferences ── */}
        <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>
          {t.settings.preferencesSection}
        </Text>
        <View style={[styles.section, { backgroundColor: C.surface }]}>
          <SettingsRow
            {...rowProps}
            icon="🔔"
            iconBg="#FFF0E8"
            label={t.settings.reminders}
            showArrow={false}
            right={<Switch value={false} onValueChange={() => {}} color={COLORS.primary} />}
          />
          <SettingsRow
            {...rowProps}
            icon="🎨"
            iconBg="#F0EEFF"
            label={t.settings.appearance}
            value={
              settings.theme === 'dark'
                ? t.settings.themeDark
                : settings.theme === 'light'
                  ? t.settings.themeLight
                  : t.settings.themeSystem
            }
            showArrow={false}
            right={
              <Switch
                value={settings.theme === 'dark'}
                onValueChange={(v) => settings.setTheme(v ? 'dark' : 'light')}
                color={COLORS.primary}
              />
            }
          />
          <SettingsRow
            {...rowProps}
            icon="📅"
            iconBg="#E8F4FE"
            label={t.settings.weekStartsOn}
            value={settings.weekStart === 'monday' ? t.settings.monday : t.settings.sunday}
            onPress={() => {}}
            isLast
          />
        </View>

        {/* ── Goals ── */}
        <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>
          {t.settings.goalsSection}
        </Text>
        <View style={[styles.section, { backgroundColor: C.surface }]}>
          <SettingsRow
            {...rowProps}
            icon="🔥"
            iconBg="#FFF0E8"
            label={t.settings.streakGoal}
            value={t.settings.streakGoalDays(settings.streakGoalDays)}
            onPress={() => {}}
          />
          <SettingsRow
            {...rowProps}
            icon="🎯"
            iconBg="#FFE8F4"
            label={t.settings.dailyTarget}
            value={t.settings.dailyTargetAll}
            onPress={() => {}}
            isLast
          />
        </View>

        {/* ── Data ── */}
        <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>
          {t.settings.dataSection}
        </Text>
        <View style={[styles.section, { backgroundColor: C.surface }]}>
          <SettingsRow {...rowProps} icon="📤" iconBg="#E8F7EB" label={t.settings.exportData} onPress={() => {}} />
          <SettingsRow {...rowProps} icon="📥" iconBg="#E8F4FE" label={t.settings.importData} onPress={() => {}} />
          <SettingsRow
            {...rowProps}
            icon="🗑️"
            iconBg="#FFE8E8"
            label={t.settings.resetData}
            onPress={() => {}}
            isLast
          />
        </View>

        {/* ── About ── */}
        <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>{t.settings.about}</Text>
        <View style={[styles.section, { backgroundColor: C.surface }]}>
          <SettingsRow
            {...rowProps}
            icon="ℹ️"
            iconBg="#F0F2F5"
            label={t.settings.version}
            value="0.1.0"
            showArrow={false}
            isLast
          />
        </View>

      </ScrollView>
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
