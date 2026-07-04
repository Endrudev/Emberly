import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput as RNTextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import EmojiPicker, { cs as emojiPickerCs, en as emojiPickerEn } from 'rn-emoji-keyboard';

import type { Activity, DayOfWeek } from '@/domain/types';
import { orderedDayIndices, type WeekAnchor } from '@/domain/week';
import { useTranslation, useResolvedLanguage } from '@/i18n';
import { activityColors, COLORS, FONTS } from '@/ui/theme';
import { useAppTheme } from '@/ui/useAppTheme';
import { AnimatedPressable } from '@/ui/anim/AnimatedPressable';
import { ActivityRow } from './ActivityRow';

const POPULAR_EMOJI = [
  '💪',
  '🏃',
  '🧹',
  '📚',
  '🧘',
  '🚴',
  '🥗',
  '💧',
  '🛏️',
  '🎯',
  '🎨',
  '🎸',
  '☕',
  '✍️',
  '🧠',
  '😴',
  '🦷',
  '🪥',
  '🚶',
  '🏋️',
];

const ALL_DAYS_LIST: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS: DayOfWeek[] = [0, 1, 2, 3, 4];
const WEEKEND: DayOfWeek[] = [5, 6];
type Preset = 'daily' | 'weekdays' | 'weekend' | 'custom';

function sameDays(a: readonly DayOfWeek[], b: readonly DayOfWeek[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((d, i) => d === sb[i]);
}

export interface ActivityFormValues {
  name: string;
  emoji: string;
  color: string;
  scheduledDays: DayOfWeek[];
}

export interface ActivityFormHandle {
  /** Validates and submits — call this from the screen's header save action. */
  submit: () => void;
}

export interface ActivityFormPreviewContext {
  weekDates: readonly string[];
  todayIso: string;
  completedByDate: ReadonlySet<string>;
  currentStreak: number;
}

interface ActivityFormProps {
  initial?: Partial<ActivityFormValues>;
  /** Real activity id when editing — only used to key the live preview row. */
  activityId?: number;
  /** Current-week data so the "Náhled" card matches the real list row. */
  preview: ActivityFormPreviewContext;
  /** date-fns `weekStartsOn` (0=neděle, 1=pondělí) — pořadí dnů v pickeru. */
  weekStartsOn?: WeekAnchor;
  onSubmit: (values: ActivityFormValues) => Promise<void> | void;
  /** Lets the hosting screen show a spinner in its header save action. */
  onSubmittingChange?: (submitting: boolean) => void;
  /** Shows the "Smazat aktivitu" link at the bottom — omit when creating. */
  onDelete?: () => void;
}

/**
 * Save lives in the hosting screen's header, not as an in-form button — the
 * screen triggers submission imperatively via the forwarded ref.
 */
export const ActivityForm = forwardRef<ActivityFormHandle, ActivityFormProps>(function ActivityForm(
  { initial, activityId, preview, weekStartsOn = 1, onSubmit, onSubmittingChange, onDelete },
  ref,
) {
  const t = useTranslation();
  const C = useAppTheme();
  const language = useResolvedLanguage();
  const insets = useSafeAreaInsets();
  const displayDays = useMemo(() => orderedDayIndices(weekStartsOn), [weekStartsOn]);
  const [name, setName] = useState(initial?.name ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? POPULAR_EMOJI[0]!);
  const [color, setColor] = useState<string>(initial?.color ?? activityColors[0] ?? '#4AABF5');
  const [scheduledDays, setScheduledDays] = useState<DayOfWeek[]>(initial?.scheduledDays ?? []);
  const [touched, setTouched] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const isCustomEmoji = !POPULAR_EMOJI.includes(emoji);

  const nameError = touched && name.trim().length === 0;

  function toggleDay(day: DayOfWeek) {
    setScheduledDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  const activePreset: Preset = useMemo(() => {
    if (sameDays(scheduledDays, ALL_DAYS_LIST)) return 'daily';
    if (sameDays(scheduledDays, WEEKDAYS)) return 'weekdays';
    if (sameDays(scheduledDays, WEEKEND)) return 'weekend';
    return 'custom';
  }, [scheduledDays]);

  function applyPreset(preset: Exclude<Preset, 'custom'>) {
    setScheduledDays(
      preset === 'daily' ? ALL_DAYS_LIST : preset === 'weekdays' ? WEEKDAYS : WEEKEND,
    );
  }

  const scheduleSummary = useMemo(() => {
    if (scheduledDays.length === 0) return '';
    return [...scheduledDays]
      .sort()
      .map((d) => t.days.short[d])
      .join(', ');
  }, [scheduledDays, t]);

  async function handleSubmit() {
    setTouched(true);
    if (name.trim().length === 0) return;
    onSubmittingChange?.(true);
    try {
      await onSubmit({
        name: name.trim(),
        emoji,
        color,
        scheduledDays,
      });
    } finally {
      onSubmittingChange?.(false);
    }
  }

  useImperativeHandle(ref, () => ({ submit: handleSubmit }));

  const previewActivity: Activity = {
    id: activityId ?? -1,
    name: name.trim().length > 0 ? name : t.activity.nameLabel,
    emoji,
    color,
    scheduledDays,
    archived: false,
    createdAt: 0,
  };

  const chipBg = C.isDark ? '#3A3A3C' : '#F0F0F0';
  const chipText = C.isDark ? '#ABABAB' : '#888888';

  // Namapováno na existující tokeny appky, ať plný emoji picker vypadá jako
  // vlastní komponenta appky, ne jako vložená cizí knihovna.
  const emojiPickerTheme = {
    backdrop: 'rgba(0,0,0,0.4)',
    knob: C.border,
    container: C.surface,
    header: C.text,
    skinTonesContainer: C.surface,
    category: {
      icon: C.textTertiary,
      iconActive: COLORS.primary,
      container: 'transparent',
      containerActive: COLORS.primaryLight,
    },
    search: {
      background: chipBg,
      text: C.text,
      placeholder: C.textTertiary,
      icon: C.textTertiary,
    },
    emoji: {
      selected: COLORS.primaryLight,
    },
  };

  const PRESETS: Preset[] = ['daily', 'weekdays', 'weekend', 'custom'];
  const presetLabel: Record<Preset, string> = {
    daily: t.activity.presetDaily,
    weekdays: t.activity.presetWeekdays,
    weekend: t.activity.presetWeekend,
    custom: t.activity.presetCustom,
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 32 + insets.bottom + 48 }]}
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: C.BG }}
      >
        {/* ── Preview ── */}
        <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>
          {t.activity.previewLabel}
        </Text>
        <View pointerEvents="none">
          <ActivityRow
            activity={previewActivity}
            weekDates={preview.weekDates}
            todayIso={preview.todayIso}
            completedByDate={preview.completedByDate}
            currentStreak={preview.currentStreak}
            onToggle={() => {}}
            isDark={C.isDark}
            style={styles.previewCard}
          />
        </View>

        {/* ── Name ── */}
        <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>{t.activity.nameLabel}</Text>
        <View style={[styles.card, { backgroundColor: C.surface }]}>
          <RNTextInput
            style={[styles.nameInput, { color: C.text }]}
            value={name}
            onChangeText={setName}
            onBlur={() => setTouched(true)}
            placeholder={t.activity.nameLabel}
            placeholderTextColor={C.textTertiary}
            autoFocus={!initial?.name}
          />
        </View>
        {nameError ? <Text style={styles.errorText}>{t.activity.nameRequired}</Text> : null}

        {/* ── Appearance ── */}
        <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>
          {t.activity.appearanceLabel}
        </Text>
        <View style={[styles.card, { backgroundColor: C.surface }]}>
          <Text style={[styles.subLabel, { color: C.text }]}>{t.activity.iconLabel}</Text>
          <View style={styles.emojiGrid}>
            {POPULAR_EMOJI.map((e) => {
              const selected = e === emoji;
              return (
                <AnimatedPressable
                  key={e}
                  hapticStyle="light"
                  onPress={() => setEmoji(e)}
                  style={[
                    styles.emojiCell,
                    { backgroundColor: chipBg, borderColor: selected ? color : 'transparent' },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.activity.iconLabel} ${e}`}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </AnimatedPressable>
              );
            })}
            <AnimatedPressable
              hapticStyle="light"
              onPress={() => setEmojiPickerOpen(true)}
              style={[
                styles.emojiCell,
                { backgroundColor: chipBg, borderColor: isCustomEmoji ? color : 'transparent' },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t.activity.moreEmojiLabel}
            >
              {isCustomEmoji ? (
                <Text style={styles.emojiText}>{emoji}</Text>
              ) : (
                <MaterialCommunityIcons name="dots-horizontal" size={22} color={chipText} />
              )}
            </AnimatedPressable>
          </View>

          <View style={[styles.divider, { backgroundColor: C.border }]} />

          <Text style={[styles.subLabel, { color: C.text }]}>{t.activity.colorLabel}</Text>
          <View style={styles.colorGrid}>
            {activityColors.map((c) => {
              const selected = c === color;
              return (
                <AnimatedPressable
                  key={c}
                  hapticStyle="light"
                  onPress={() => setColor(c)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    selected && { borderColor: C.surface, borderWidth: 3 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.activity.colorLabel} ${c}`}
                >
                  {selected ? (
                    <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                  ) : null}
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        {/* ── Frequency ── */}
        <View style={styles.sectionHeaderRow}>
          <Text
            style={[styles.sectionLabel, styles.sectionLabelNoMargin, { color: C.textTertiary }]}
          >
            {t.activity.frequencyLabel}
          </Text>
          <Text style={[styles.sectionMeta, { color: C.textTertiary }]}>
            {t.activity.timesPerWeek(scheduledDays.length)}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: C.surface }]}>
          <View style={styles.presetRow}>
            {PRESETS.map((preset) => {
              const active = activePreset === preset;
              return (
                <AnimatedPressable
                  key={preset}
                  hapticStyle="light"
                  disabled={preset === 'custom'}
                  onPress={preset === 'custom' ? undefined : () => applyPreset(preset)}
                  style={[
                    styles.presetPill,
                    active
                      ? {
                          backgroundColor: 'transparent',
                          borderColor: COLORS.primary,
                          borderWidth: 1.5,
                        }
                      : { backgroundColor: chipBg, borderWidth: 1.5, borderColor: 'transparent' },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.presetText, { color: active ? COLORS.primary : chipText }]}>
                    {presetLabel[preset]}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

          <View style={styles.daysRow}>
            {displayDays.map((day) => {
              const selected = scheduledDays.includes(day);
              return (
                <View key={day} style={styles.dayPillWrap}>
                  <AnimatedPressable
                    hapticStyle="light"
                    onPress={() => toggleDay(day)}
                    style={[
                      styles.dayPill,
                      { backgroundColor: selected ? COLORS.primary : chipBg },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.dayPillText, { color: selected ? '#fff' : chipText }]}>
                      {t.days.short[day]}
                    </Text>
                  </AnimatedPressable>
                </View>
              );
            })}
          </View>

          {scheduleSummary ? (
            <Text style={[styles.scheduleSummary, { color: C.textTertiary }]}>
              {scheduleSummary}
            </Text>
          ) : null}
        </View>

        {/* ── Delete ── */}
        {onDelete ? (
          <AnimatedPressable hapticStyle="light" onPress={onDelete} style={styles.deleteLink}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.error} />
            <Text style={[styles.deleteLinkText, { color: COLORS.error }]}>
              {t.activity.deleteActivity}
            </Text>
          </AnimatedPressable>
        ) : null}
      </ScrollView>

      <EmojiPicker
        open={emojiPickerOpen}
        onClose={() => setEmojiPickerOpen(false)}
        onEmojiSelected={(selected) => setEmoji(selected.emoji)}
        enableSearchBar
        enableRecentlyUsed
        categoryPosition="top"
        translation={language === 'cs' ? emojiPickerCs : emojiPickerEn}
        theme={emojiPickerTheme}
      />
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: FONTS.extraBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 8,
  },
  sectionLabelNoMargin: {
    marginTop: 0,
    marginBottom: 0,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  sectionMeta: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },

  previewCard: {
    marginHorizontal: 0,
    marginVertical: 0,
  },

  card: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  nameInput: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    padding: 0,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 6,
    marginLeft: 4,
  },

  subLabel: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    marginBottom: 12,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emojiCell: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: { fontSize: 22 },

  divider: {
    height: 1,
    marginVertical: 16,
  },

  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  presetText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },

  daysRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayPillWrap: {
    flex: 1,
  },
  dayPill: {
    width: '100%',
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  scheduleSummary: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    textAlign: 'center',
    marginTop: 14,
  },

  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    marginTop: 8,
  },
  deleteLinkText: {
    fontSize: 14.5,
    fontFamily: FONTS.bold,
  },
});
