import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { useAppTheme } from '@/ui/useAppTheme';
import { COLORS, FONTS } from '@/ui/theme';
import { useTranslation } from '@/i18n';
import { WidgetShowcasePreview } from '@/ui/components/WidgetShowcasePreview';
import { AnimatedPressable } from '@/ui/anim/AnimatedPressable';
import { pinWidget, type WidgetVariant } from '@/widget/pinWidget';

export default function WidgetShowcaseScreen() {
  const t = useTranslation();
  const C = useAppTheme();
  const router = useRouter();

  function handleAdd(variant: WidgetVariant) {
    const started = pinWidget(variant);
    if (!started) {
      Alert.alert(t.widget.pinFallbackTitle, t.widget.pinFallbackBody);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.BG }]} edges={['bottom', 'left', 'right']}>
      <Appbar.Header style={{ backgroundColor: C.BG }} elevated={false}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={t.widget.showcaseTitle} titleStyle={{ fontFamily: FONTS.bold }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.description, { color: C.textSecondary }]}>
          {t.widget.showcaseDescription}
        </Text>

        <View style={styles.section}>
          <Text style={[styles.variantLabel, { color: C.text }]}>{t.widget.variant4x3Label}</Text>
          <View style={styles.previewWrap}>
            <WidgetShowcasePreview variant="4x3" />
          </View>
          <AnimatedPressable
            style={[styles.addButton, { backgroundColor: COLORS.primary }]}
            hapticStyle="light"
            onPress={() => handleAdd('EmberlyWidget')}
            accessibilityRole="button"
          >
            <Text style={styles.addButtonText}>{t.widget.addButton}</Text>
          </AnimatedPressable>
        </View>

        <View style={styles.section}>
          <Text style={[styles.variantLabel, { color: C.text }]}>{t.widget.variant4x2Label}</Text>
          <View style={styles.previewWrap}>
            <WidgetShowcasePreview variant="4x2" />
          </View>
          <AnimatedPressable
            style={[styles.addButton, { backgroundColor: COLORS.primary }]}
            hapticStyle="light"
            onPress={() => handleAdd('EmberlyWidget4x2')}
            accessibilityRole="button"
          >
            <Text style={styles.addButtonText}>{t.widget.addButton}</Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 32 },
  description: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    lineHeight: 20,
    marginBottom: 4,
  },
  section: {
    gap: 14,
  },
  variantLabel: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    alignSelf: 'flex-start',
  },
  previewWrap: {
    alignItems: 'center',
  },
  addButton: {
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
});
