import { StyleSheet, View } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';

interface StreakBadgeProps {
  label: string;
  value: number;
  unit: string;
  icon?: string; // emoji nebo string
  emphasized?: boolean;
}

export function StreakBadge({ label, value, unit, icon, emphasized }: StreakBadgeProps) {
  const theme = useTheme();
  return (
    <Surface
      style={[
        styles.card,
        {
          backgroundColor: emphasized
            ? theme.colors.primaryContainer
            : theme.colors.surfaceVariant,
        },
      ]}
      elevation={emphasized ? 2 : 0}
    >
      <View style={styles.row}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <View style={{ flex: 1 }}>
          <Text
            variant="labelSmall"
            style={{
              color: emphasized
                ? theme.colors.onPrimaryContainer
                : theme.colors.onSurfaceVariant,
            }}
          >
            {label}
          </Text>
          <Text
            variant="headlineMedium"
            style={{
              color: emphasized
                ? theme.colors.onPrimaryContainer
                : theme.colors.onSurface,
              fontWeight: '700',
            }}
          >
            {value}
            <Text
              variant="bodyMedium"
              style={{
                color: emphasized
                  ? theme.colors.onPrimaryContainer
                  : theme.colors.onSurfaceVariant,
              }}
            >
              {' '}
              {unit}
            </Text>
          </Text>
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    minWidth: 140,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 28,
    marginRight: 8,
  },
});
