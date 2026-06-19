import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useSettingsStore, type AppLanguage } from '@/store/useSettingsStore';
import { useAppTheme } from '@/ui/useAppTheme';
import { COLORS, FONTS } from '@/ui/theme';
import { useTranslation } from '@/i18n';

const LANGUAGES: AppLanguage[] = ['auto', 'cs', 'en'];

export default function LanguageScreen() {
  const t = useTranslation();
  const C = useAppTheme();
  const router = useRouter();
  const settings = useSettingsStore();

  function labelFor(lang: AppLanguage) {
    if (lang === 'auto') return t.settings.languageAuto;
    if (lang === 'cs') return t.settings.languageCz;
    return t.settings.languageEn;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.BG }]} edges={['bottom', 'left', 'right']}>
      <Appbar.Header style={{ backgroundColor: C.BG }} elevated={false}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={t.settings.language} titleStyle={{ fontFamily: FONTS.bold }} />
      </Appbar.Header>

      <View style={styles.content}>
        <View style={[styles.section, { backgroundColor: C.surface }]}>
          {LANGUAGES.map((lang, i) => {
            const selected = settings.language === lang;
            return (
              <Pressable
                key={lang}
                onPress={() => {
                  settings.setLanguage(lang);
                  router.back();
                }}
                style={({ pressed }) => [
                  styles.row,
                  i < LANGUAGES.length - 1 && [styles.rowBorder, { borderBottomColor: C.border }],
                  pressed ? { backgroundColor: C.rowPressed } : null,
                ]}
              >
                <Text style={[styles.rowText, { color: C.text }]}>{labelFor(lang)}</Text>
                {selected && (
                  <MaterialCommunityIcons name="check" size={22} color={COLORS.primary} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20 },
  section: {
    borderRadius: 16,
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
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { fontSize: 16, fontFamily: FONTS.semiBold },
});
