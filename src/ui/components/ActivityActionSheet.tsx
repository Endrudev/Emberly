import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { Activity } from '@/domain/types';
import { useAppTheme } from '@/ui/useAppTheme';
import { useTranslation } from '@/i18n';
import { COLORS, FONTS } from '@/ui/theme';
import { AnimatedPressable } from '@/ui/anim/AnimatedPressable';
import { useReduceMotion } from '@/ui/anim/useReduceMotion';

const EXIT_MS = 200;

interface ActivityActionSheetProps {
  visible: boolean;
  activity: Activity | null;
  onClose: () => void;
  onEdit: (activityId: number) => void;
  onDelete: (activityId: number) => void;
}

/**
 * Bottom action sheet for a single activity row (Edit / Delete). Mirrors the
 * icon-bubble + label row style from the Settings screen so it reads as part
 * of the same design system rather than a bolted-on menu.
 */
export function ActivityActionSheet({
  visible,
  activity,
  onClose,
  onEdit,
  onDelete,
}: ActivityActionSheetProps) {
  const C = useAppTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  // Keep the Modal mounted through the exit animation so the slide-down is
  // visible instead of being cut off by an instant unmount.
  const [mounted, setMounted] = useState(visible);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const translateY = useSharedValue(40);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      if (exitTimer.current) {
        clearTimeout(exitTimer.current);
        exitTimer.current = null;
      }
      setMounted(true);
      if (reduceMotion) {
        translateY.value = 0;
        backdropOpacity.value = withTiming(1, { duration: 150 });
      } else {
        translateY.value = withTiming(0, { duration: 240, easing: Easing.out(Easing.cubic) });
        backdropOpacity.value = withTiming(1, { duration: 180 });
      }
    } else {
      backdropOpacity.value = withTiming(0, { duration: EXIT_MS });
      translateY.value = reduceMotion
        ? 0
        : withTiming(40, { duration: EXIT_MS, easing: Easing.in(Easing.cubic) });
      exitTimer.current = setTimeout(() => setMounted(false), EXIT_MS);
    }
    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, [visible, reduceMotion, translateY, backdropOpacity]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  if (!mounted || !activity) return null;

  return (
    <Modal transparent visible statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: C.surface, paddingBottom: Math.max(insets.bottom, 16) },
          sheetStyle,
        ]}
      >
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.headerEmoji}>{activity.emoji}</Text>
          <Text style={[styles.headerName, { color: C.text }]} numberOfLines={1}>
            {activity.name}
          </Text>
        </View>

        <AnimatedPressable
          style={styles.row}
          hapticStyle="light"
          onPress={() => onEdit(activity.id)}
        >
          <View style={[styles.rowIcon, { backgroundColor: '#EEF4FF' }]}>
            <MaterialCommunityIcons name="pencil-outline" size={19} color="#4C8DF0" />
          </View>
          <Text style={[styles.rowText, { color: C.text }]}>{t.common.edit}</Text>
        </AnimatedPressable>

        <AnimatedPressable
          style={styles.row}
          hapticStyle="light"
          onPress={() => onDelete(activity.id)}
        >
          <View style={[styles.rowIcon, { backgroundColor: '#FFE8E8' }]}>
            <MaterialCommunityIcons name="delete-outline" size={19} color={COLORS.error} />
          </View>
          <Text style={[styles.rowText, { color: COLORS.error }]}>{t.common.delete}</Text>
        </AnimatedPressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(120,120,120,0.35)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  headerEmoji: { fontSize: 22 },
  headerName: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    fontSize: 15.5,
    fontFamily: FONTS.semiBold,
  },
});
