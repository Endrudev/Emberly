import { StyleSheet, View } from 'react-native';

import { FunnelChoice } from './FunnelChoice';

export interface ChoiceOption<K extends string> {
  key: K;
  label: string;
  emoji?: string;
}

interface ChoiceGroupProps<K extends string> {
  options: ChoiceOption<K>[];
  isSelected: (key: K) => boolean;
  onPress: (key: K) => void;
  accentColor?: string;
}

/** Svislý seznam `FunnelChoice` dlaždic — výběrová logika (single/multi) je
 *  na volajícím (`isSelected`/`onPress`), tahle komponenta jen renderuje. */
export function ChoiceGroup<K extends string>({
  options,
  isSelected,
  onPress,
  accentColor,
}: ChoiceGroupProps<K>) {
  return (
    <View style={styles.list}>
      {options.map((opt) => (
        <FunnelChoice
          key={opt.key}
          label={opt.label}
          emoji={opt.emoji}
          selected={isSelected(opt.key)}
          onPress={() => onPress(opt.key)}
          accentColor={accentColor}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
});
