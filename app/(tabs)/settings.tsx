import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Switch, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { cs as dateFnsCs } from 'date-fns/locale';

import { useAppStore } from '@/store/useAppStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { COLORS } from '@/ui/theme';
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
}: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && onPress ? styles.rowPressed : null]}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Text style={styles.rowIconEmoji}>{icon}</Text>
      </View>
      <View style={styles.rowLabel}>
        <Text style={styles.rowText}>{label}</Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      {right ?? (showArrow && onPress ? (
        <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
      ) : null)}
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const activities = useAppStore((s) => s.activities);
  const settings = useSettingsStore();

  // "Tracking since" — from settings or from earliest activity
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

  // Profile initials (up to 2 chars)
  const initials = useMemo(() => {
    const name = settings.userName.trim();
    if (!name) return 'MT';
    return name
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }, [settings.userName]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <Text style={styles.pageTitle}>{t.settings.title}</Text>

        {/* ── Profile card ── */}
        <Pressable style={styles.profileCard} onPress={() => {}}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{settings.userName || 'Mission Tracker'}</Text>
            {trackingSince ? (
              <Text style={styles.profileSince}>{t.settings.trackingSince(trackingSince)}</Text>
            ) : null}
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
        </Pressable>

        {/* ── Preferences ── */}
        <Text style={styles.sectionTitle}>{t.settings.preferencesSection}</Text>
        <View style={styles.section}>
          <SettingsRow
            icon="🔔"
            iconBg="#FFF0E8"
            label={t.settings.reminders}
            showArrow={false}
            right={<Switch value={false} onValueChange={() => {}} color={COLORS.primary} />}
          />
          <SettingsRow
            icon="🎨"
            iconBg="#F0EEFF"
            label={t.settings.appearance}
            value={t.settings.themeLight}
            onPress={() => {}}
          />
          <SettingsRow
            icon="📅"
            iconBg="#E8F4FE"
            label={t.settings.weekStartsOn}
            value={settings.weekStart === 'monday' ? t.settings.monday : t.settings.sunday}
            onPress={() => {}}
            isLast
          />
        </View>

        {/* ── Goals ── */}
        <Text style={styles.sectionTitle}>{t.settings.goalsSection}</Text>
        <View style={styles.section}>
          <SettingsRow
            icon="🔥"
            iconBg="#FFF0E8"
            label={t.settings.streakGoal}
            value={t.settings.streakGoalDays(settings.streakGoalDays)}
            onPress={() => {}}
          />
          <SettingsRow
            icon="🎯"
            iconBg="#FFE8F4"
            label={t.settings.dailyTarget}
            value={t.settings.dailyTargetAll}
            onPress={() => {}}
            isLast
          />
        </View>

        {/* ── Data ── */}
        <Text style={styles.sectionTitle}>{t.settings.dataSection}</Text>
        <View style={styles.section}>
          <SettingsRow icon="📤" iconBg="#E8F7EB" label={t.settings.exportData} onPress={() => {}} />
          <SettingsRow icon="📥" iconBg="#E8F4FE" label={t.settings.importData} onPress={() => {}} />
          <SettingsRow
            icon="🗑️"
            iconBg="#FFE8E8"
            label={t.settings.resetData}
            onPress={() => {}}
            isLast
          />
        </View>

        {/* ── About ── */}
        <Text style={styles.sectionTitle}>{t.settings.about}</Text>
        <View style={styles.section}>
          <SettingsRow
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
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 40 },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
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
  profileName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  profileSince: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    backgroundColor: COLORS.surface,
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
    borderBottomColor: '#F0F0F0',
  },
  rowPressed: { backgroundColor: '#F8F8F8' },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconEmoji: { fontSize: 18 },
  rowLabel: { flex: 1 },
  rowText: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  rowValue: { fontSize: 13, color: COLORS.textSecondary, marginTop: 1 },
});
