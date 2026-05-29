import { StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

import { parseIsoDate } from '@/domain/week';
import { t } from '@/i18n/cs';

interface WeekHeaderProps {
  weekStartIso: string;
  isCurrentWeek: boolean;
  onPrev: () => void;
  onNext: () => void;
  onJumpToToday: () => void;
}

export function WeekHeader({
  weekStartIso,
  isCurrentWeek,
  onPrev,
  onNext,
  onJumpToToday,
}: WeekHeaderProps) {
  const theme = useTheme();
  const start = parseIsoDate(weekStartIso);
  const end = parseIsoDate(weekStartIso);
  end.setDate(end.getDate() + 6);
  const label = `${format(start, 'd. MMM', { locale: cs })} – ${format(end, 'd. MMM', { locale: cs })}`;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <IconButton
        icon="chevron-left"
        onPress={onPrev}
        accessibilityLabel={t.home.previousWeek}
      />
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text variant="titleMedium">{isCurrentWeek ? t.home.thisWeek : label}</Text>
        {!isCurrentWeek ? (
          <Text
            variant="labelSmall"
            onPress={onJumpToToday}
            style={{ color: theme.colors.primary, marginTop: 2 }}
          >
            {t.common.today}
          </Text>
        ) : (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {label}
          </Text>
        )}
      </View>
      <IconButton icon="chevron-right" onPress={onNext} accessibilityLabel={t.home.nextWeek} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});
