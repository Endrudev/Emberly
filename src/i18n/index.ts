import { getLocales } from 'expo-localization';
import { cs as csDateFns } from 'date-fns/locale';
import { useSettingsStore } from '@/store/useSettingsStore';
import { cs } from './cs';
import { en } from './en';

export type { Translation } from './cs';

function getDeviceLanguage(): 'cs' | 'en' {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return code === 'cs' ? 'cs' : 'en';
}

function resolveLanguage(setting: 'auto' | 'cs' | 'en'): 'cs' | 'en' {
  if (setting === 'auto') return getDeviceLanguage();
  return setting;
}

export function useTranslation() {
  const language = useSettingsStore((s) => s.language);
  return resolveLanguage(language) === 'cs' ? cs : en;
}

export function useDateLocale() {
  const language = useSettingsStore((s) => s.language);
  return resolveLanguage(language) === 'cs' ? csDateFns : undefined;
}
