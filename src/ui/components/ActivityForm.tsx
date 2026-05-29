import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';

import type { DayOfWeek } from '@/domain/types';
import { t } from '@/i18n/cs';
import { activityColors, getPastelColor } from '@/ui/theme';

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

interface ActivityFormProps {
  initial?: Partial<ActivityFormValues>;
  submitLabel: string;
  onSubmit: (values: ActivityFormValues) => Promise<void> | void;
  onCancel?: () => void;
}

export function ActivityForm({ initial, submitLabel, onSubmit, onCancel }: ActivityFormProps) {
  const theme = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? POPULAR_EMOJI[0]!);
  const [color, setColor] = useState<string>(initial?.color ?? activityColors[0] ?? '#4AABF5');
  const [scheduledDays, setScheduledDays] = useState<DayOfWeek[]>(
    initial?.scheduledDays ?? [],
  );
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const nameError = touched && name.trim().length === 0;

  function toggleDay(day: DayOfWeek) {
    setScheduledDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  async function handleSubmit() {
    setTouched(true);
    if (name.trim().length === 0) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        emoji,
        color,
        scheduledDays,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: theme.colors.background }}
    >
      <TextInput
        mode="outlined"
        label={t.activity.nameLabel}
        value={name}
        onChangeText={setName}
        onBlur={() => setTouched(true)}
        error={nameError}
        autoFocus={!initial?.name}
      />
      {nameError ? <HelperText type="error">{t.activity.nameRequired}</HelperText> : null}

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
            accessibilityLabel={`Emoji ${e}`}
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
            accessibilityLabel={`Barva ${c}`}
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

      <View style={styles.actions}>
        {onCancel ? (
          <Button mode="text" onPress={onCancel} disabled={submitting}>
            {t.common.cancel}
          </Button>
        ) : null}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          style={{ marginLeft: 8 }}
        >
          {submitLabel}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 48,
    gap: 8,
  },
  sectionLabel: {
    marginTop: 16,
    marginBottom: 8,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiCell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: { fontSize: 22 },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayPill: {
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
});
