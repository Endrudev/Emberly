import { getLocales } from 'expo-localization';
import { cs as csDateFns, de as deDateFns } from 'date-fns/locale';
import { useSettingsStore } from '@/store/useSettingsStore';
import { cs } from './cs';
import { en } from './en';
import { de } from './de';

export type { Translation } from './cs';

function getDeviceLanguage(): 'cs' | 'en' | 'de' {
  const code = getLocales()[0]?.languageCode ?? 'en';
  if (code === 'cs') return 'cs';
  if (code === 'de') return 'de';
  return 'en';
}

function resolveLanguage(setting: 'auto' | 'cs' | 'en' | 'de'): 'cs' | 'en' | 'de' {
  if (setting === 'auto') return getDeviceLanguage();
  return setting;
}

function translationFor(lang: 'cs' | 'en' | 'de') {
  if (lang === 'cs') return cs;
  if (lang === 'de') return de;
  return en;
}

export function useTranslation() {
  const language = useSettingsStore((s) => s.language);
  return translationFor(resolveLanguage(language));
}

export function useDateLocale() {
  const language = useSettingsStore((s) => s.language);
  const resolved = resolveLanguage(language);
  if (resolved === 'cs') return csDateFns;
  if (resolved === 'de') return deDateFns;
  return undefined;
}

/** Resolved 'cs' | 'en' | 'de' code (not the translation object) — for places that
 *  need the language tag itself, e.g. widget mock data (`WidgetData.lang`). */
export function useResolvedLanguage(): 'cs' | 'en' | 'de' {
  const language = useSettingsStore((s) => s.language);
  return resolveLanguage(language);
}

/** Non-hook variant for code outside React components (e.g. the notification
 *  scheduler) — reads the language setting directly from the store. */
export function getTranslation() {
  return translationFor(resolveLanguage(useSettingsStore.getState().language));
}
