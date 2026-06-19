import { forwardRef, useImperativeHandle, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';

import type { DayOfWeek } from '@/domain/types';
import { useTranslation } from '@/i18n';
import { activityColors } from '@/ui/theme';

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

interface ActivityFormProps {
  initial?: Partial<ActivityFormValues>;
  onSubmit: (values: ActivityFormValues) => Promise<void> | void;
  /** Lets the hosting screen show a spinner in its header save icon. */
  onSubmittingChange?: (submitting: boolean) => void;
}

/**
 * Save lives in the hosting screen's header (checkmark icon), not as an
 * in-form button — frees enough vertical space for the whole form (name,
 * emoji, color, days) to fit on one screen without scrolling. The screen
 * triggers submission imperatively via the forwarded ref.
 */
export const ActivityForm = forwardRef<ActivityFormHandle, ActivityFormProps>(
  function ActivityForm({ initial, onSubmit, onSubmittingChange }, ref) {
    const t = useTranslation();
    const theme = useTheme();
    const [name, setName] = useState(initial?.name ?? '');
    const [emoji, setEmoji] = useState(initial?.emoji ?? POPULAR_EMOJI[0]!);
    const [color, setColor] = useState<string>(initial?.color ?? activityColors[0] ?? '#4AABF5');
    const [scheduledDays, setScheduledDays] = useState<DayOfWeek[]>(
      initial?.scheduledDays ?? [],
    );
    const [touched, setTouched] = useState(false);

    const nameError = touched && name.trim().length === 0;

    function toggleDay(day: DayOfWeek) {
      setScheduledDays((prev) =>
        prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
      );
    }

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

    return (
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: theme.colors.background }}
      >
        <TextInput
          mode="outlined"
          dense
          label={t.activity.nameLabel}
          value={name}
          onChangeText={setName}
          onBlur={() => setTouched(true)}
          error={nameError}
          autoFocus={!initial?.name}
        />
        {nameError ? <HelperText type="error" style={styles.helper}>{t.activity.nameRequired}</HelperText> : null}

        <Text variant="labelLarge" style={styles.sectionLabel}>
          {t.activity.emojiLabel}
        </Text>
        <View style={styles.emojiGrid}>
          {POPULAR_EMOJI.map((e) => (
            <Pressable
              key={e}
              onPress={() => setEmoji(e)}
              style={[
                styles.emojiCell,
                {
                  backgroundColor:
                    e === emoji ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${t.activity.emojiLabel} ${e}`}
            >
              <Text style={styles.emojiText}>{e}</Text>
            </Pressable>
          ))}
        </View>

        <Text variant="labelLarge" style={styles.sectionLabel}>
          {t.activity.colorLabel}
        </Text>
        <View style={styles.colorGrid}>
          {activityColors.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              accessibilityRole="button"
              accessibilityLabel={`${t.activity.colorLabel} ${c}`}
              style={[
                styles.colorSwatch,
                {
                  backgroundColor: c,
                  borderColor: c === color ? theme.colors.onSurface : 'transparent',
                },
              ]}
            />
          ))}
        </View>

        <Text variant="labelLarge" style={styles.sectionLabel}>
          {t.activity.scheduledDaysLabel}
        </Text>
        <View style={styles.daysRow}>
          {ALL_DAYS_LIST.map((day) => {
            const selected = scheduledDays.includes(day);
            return (
              <Pressable
                key={day}
                onPress={() => toggleDay(day)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.dayPill,
                  {
                    backgroundColor: selected ? color : theme.colors.surfaceVariant,
                    borderColor: selected ? color : theme.colors.outlineVariant,
                  },
                ]}
              >
                <Text
                  variant="labelMedium"
                  style={{
                    color: selected
                      ? '#fff'
                      : theme.colors.onSurfaceVariant,
                    fontWeight: '600',
                  }}
                >
                  {t.days.short[day]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    padding: 12,
    paddingBottom: 16,
    gap: 4,
  },
  helper: {
    marginTop: -4,
    marginBottom: -4,
  },
  sectionLabel: {
    marginTop: 10,
    marginBottom: 6,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  emojiCell: {
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: { fontSize: 19 },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2.5,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayPill: {
    minWidth: 38,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
