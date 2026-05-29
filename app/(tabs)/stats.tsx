import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import { t } from '@/i18n/cs';

export default function StatsScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">{t.stats.title}</Text>
      <Text variant="bodyMedium" style={{ marginTop: 8 }}>
        {t.common.placeholder}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
