import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

export type WidgetLang = 'cs' | 'en';

const SETTINGS_KEY = 'emberly-settings';

/** Headless JS task nemá přístup k React hooks — jazyk čteme přímo z AsyncStorage. */
export async function resolveWidgetLanguage(): Promise<WidgetLang> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const lang = (JSON.parse(raw)?.state?.language as string | undefined) ?? 'auto';
      if (lang === 'cs' || lang === 'en') return lang;
    }
  } catch {
    // ignore — fall through to device locale
  }
  const code = getLocales()[0]?.languageCode ?? 'en';
  return code === 'cs' ? 'cs' : 'en';
}

/** Stejný princip jako jazyk výše — "začátek týdne" čteme přímo z AsyncStorage. */
export async function resolveWidgetWeekStartsOn(): Promise<0 | 1> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const weekStart = JSON.parse(raw)?.state?.weekStart as string | undefined;
      if (weekStart === 'sunday') return 0;
    }
  } catch {
    // ignore — fall back to Monday-start
  }
  return 1;
}

export const widgetStrings = {
  cs: {
    dayLabels: ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'] as const,
    today: 'DNES',
    noActivitiesToday: 'Dnes žádné aktivity 🎉',
    completed: 'splněno',
    notCompleted: 'nesplněno',
    streakHeadline: (streak: number) => (streak > 0 ? 'Nejdelší série!' : 'Začni sérii dnes!'),
    badgeEarned: (target: number) => `Odznak „${target}" získán! 🏆`,
    daysToBadge: (n: number, target: number) =>
      `Ještě ${n} ${n === 1 ? 'den' : n < 5 ? 'dny' : 'dní'} do odznaku „${target}"`,
    streakShield: '📦 Ochrana série 1×',
    personalRecordBadge: '🎉 Osobní rekord',
    allDoneTitle: 'Hotovo na dnešek!',
    allDoneSubtitle: (n: number) => `Všech ${n} návyků splněno 🎉`,
    streakProgress: (prev: number, current: number) => `Série ${prev} → ${current} dní`,
    newRecordTitle: 'Nová nejdelší série!',
    newRecordHeadline: (n: number) => `${n} dní`,
    newRecordSubtitle: (n: number) => `Den splněn — všech ${n} návyků ✓`,
    back: '← Zpět',
  },
  en: {
    dayLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const,
    today: 'TODAY',
    noActivitiesToday: 'No activities today 🎉',
    completed: 'completed',
    notCompleted: 'not completed',
    streakHeadline: (streak: number) => (streak > 0 ? 'Longest streak!' : 'Start a streak today!'),
    badgeEarned: (target: number) => `"${target}" badge earned! 🏆`,
    daysToBadge: (n: number, target: number) => `${n} ${n === 1 ? 'day' : 'days'} to "${target}" badge`,
    streakShield: '📦 Streak shield 1×',
    personalRecordBadge: '🎉 Personal record',
    allDoneTitle: 'Done for today!',
    allDoneSubtitle: (n: number) => `All ${n} habits completed 🎉`,
    streakProgress: (prev: number, current: number) => `Streak ${prev} → ${current} days`,
    newRecordTitle: 'New longest streak!',
    newRecordHeadline: (n: number) => `${n} days`,
    newRecordSubtitle: (n: number) => `Day complete — all ${n} habits ✓`,
    back: '← Back',
  },
} as const;

export type WidgetStrings = typeof widgetStrings.cs;
