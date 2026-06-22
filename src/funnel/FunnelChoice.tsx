import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { COLORS, FONTS } from '@/ui/theme';
import { AnimatedPressable } from '@/ui/anim/AnimatedPressable';

interface FunnelChoiceProps {
  label: string;
  emoji?: string;
  selected: boolean;
  onPress: () => void;
  /** Barva zvýraznění při výběru — default brand zelená. */
  accentColor?: string;
}

/** Dlaždice/chip pro výběrové kroky funnelu — pill, border, tinted bg +
 *  check při výběru (stejný vizuální jazyk jako starý habit-picker onboarding). */
export function FunnelChoice({
  label,
  emoji,
  selected,
  onPress,
  accentColor = COLORS.primary,
}: FunnelChoiceProps) {
  return (
    <AnimatedPressable
      onPress={onPress}
      hapticStyle="light"
      style={[
        styles.chip,
        selected && { backgroundColor: `${accentColor}1A`, borderColor: accentColor },
      ]}
    >
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      <Text style={[styles.label, selected && { color: accentColor }]}>{label}</Text>
      {selected ? (
        <View style={[styles.check, { backgroundColor: accentColor }]}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#F7F7F7',
  },
  emoji: { fontSize: 20 },
  label: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
});
