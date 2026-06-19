import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeIn } from 'react-native-reanimated';

import type { Activity, Completion } from '@/domain/types';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { COLORS } from '@/ui/theme';
import { useReduceMotion } from '@/ui/anim/useReduceMotion';
import { useTranslation } from '@/i18n';

const CELL_SIZE = 14;
const CELL_GAP = 3;
const WEEK_COUNT = 15;

const GREEN_LEVELS = [
  '#EFEFEF', // 0 – empty
  '#C6F0CE', // 1 – low
  '#7ED99B', // 2
  '#43C468', // 3
  '#2DB54A', // 4 – full
];

function getGreenLevel(rate: number): string {
  if (rate === 0) return GREEN_LEVELS[0]!;
  if (rate <= 0.25) return GREEN_LEVELS[1]!;
  if (rate <= 0.5) return GREEN_LEVELS[2]!;
  if (rate <= 0.75) return GREEN_LEVELS[3]!;
  return GREEN_LEVELS[4]!;
}

interface HabitHeatmapProps {
  activities: Activity[];
  completions: Completion[];
  todayIso: string;
}

export function HabitHeatmap({ activities, completions, todayIso }: HabitHeatmapProps) {
  const reduceMotion = useReduceMotion();
  const t = useTranslation();

  // Build week grid: WEEK_COUNT weeks ending with current week
  const cells = useMemo(() => {
    const completionSet = new Set(completions.map((c) => `${c.activityId}|${c.date}`));
    const today = parseISO(todayIso);

    // Anchor = Monday of the current week
    const anchor = startOfWeek(today, { weekStartsOn: 1 });
    // Go back (WEEK_COUNT - 1) weeks
    const gridStart = addDays(anchor, -(WEEK_COUNT - 1) * 7);

    const result: Array<{
      date: string;
      rate: number;
      isToday: boolean;
      isFuture: boolean;
    }> = [];

    for (let w = 0; w < WEEK_COUNT; w++) {
      for (let d = 0; d < 7; d++) {
        const cellDate = addDays(gridStart, w * 7 + d);
        const dateIso = format(cellDate, 'yyyy-MM-dd');
        const isFuture = dateIso > todayIso;
        const isToday = dateIso === todayIso;

        let rate = 0;
        if (!isFuture) {
          const scheduledOnDay = activities.filter((a) => {
            if (a.createdAt > cellDate.getTime()) return false;
            const dow = ((cellDate.getDay() + 6) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
            return a.scheduledDays.includes(dow);
          });
          if (scheduledOnDay.length > 0) {
            const completed = scheduledOnDay.filter((a) =>
              completionSet.has(`${a.id}|${dateIso}`),
            ).length;
            rate = completed / scheduledOnDay.length;
          }
        }

        result.push({ date: dateIso, rate, isToday, isFuture });
      }
    }
    return result;
  }, [activities, completions, todayIso]);

  // Count active days (rate > 0)
  const activeDays = cells.filter((c) => c.rate > 0 && !c.isFuture).length;

  // Transpose: render by columns (weeks), each column is 7 days (Mon–Sun)
  const columns: (typeof cells)[] = [];
  for (let w = 0; w < WEEK_COUNT; w++) {
    columns.push(cells.slice(w * 7, w * 7 + 7));
  }

  // Forces the grid to remount (replaying the reveal) whenever the underlying
  // rates actually change — not on every re-render (e.g. tab refocus).
  const gridKey = useMemo(() => cells.map((c) => c.rate).join(','), [cells]);

  return (
    <View>
      <View style={styles.legendRow}>
        <Text variant="labelSmall" style={{ color: COLORS.textSecondary }}>
          {t.stats.activeDays(activeDays)}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View key={gridKey} style={styles.grid}>
          {columns.map((week, wIdx) => (
            <View key={wIdx} style={styles.column}>
              {week.map((cell) => (
                <Animated.View
                  key={cell.date}
                  entering={
                    reduceMotion
                      ? undefined
                      : FadeIn.delay(wIdx * 30).duration(300).withInitialValues({ transform: [{ scale: 0.7 }] })
                  }
                  style={[
                    styles.cell,
                    {
                      backgroundColor: cell.isFuture ? 'transparent' : getGreenLevel(cell.rate),
                      borderWidth: cell.isToday ? 1.5 : 0,
                      borderColor: cell.isToday ? COLORS.primary : 'transparent',
                    },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.scaleRow}>
        <Text variant="labelSmall" style={{ color: COLORS.textTertiary }}>
          {t.stats.less}
        </Text>
        {GREEN_LEVELS.map((c, i) => (
          <View key={i} style={[styles.scaleCell, { backgroundColor: c }]} />
        ))}
        <Text variant="labelSmall" style={{ color: COLORS.textTertiary }}>
          {t.stats.more}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  column: {
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 3,
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  scaleCell: {
    width: 11,
    height: 11,
    borderRadius: 2,
  },
});
