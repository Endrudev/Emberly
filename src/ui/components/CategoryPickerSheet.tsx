import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { Activity, Category } from '@/domain/types';
import { useAppTheme } from '@/ui/useAppTheme';
import { useTranslation } from '@/i18n';
import { COLORS, FONTS } from '@/ui/theme';
import { AnimatedPressable } from '@/ui/anim/AnimatedPressable';
import { useReduceMotion } from '@/ui/anim/useReduceMotion';

const EXIT_MS = 200;

interface CategoryPickerSheetProps {
  visible: boolean;
  activity: Activity | null;
  categories: readonly Category[];
  onClose: () => void;
  onSelect: (activityId: number, categoryId: number | null) => void;
  onCreate: (name: string) => Promise<Category>;
}

/**
 * Quick category picker — opened from the edit-mode row's "Kategorie" button
 * so users can categorize an existing habit without opening the full
 * ActivityForm. Mirrors ActivityActionSheet's bottom-sheet look. Wrapped in
 * KeyboardAvoidingView (not just relying on Android's activity-level
 * `adjustResize`) because a transparent Modal renders in its own window on
 * Android and doesn't reliably inherit that resize behavior — see the same
 * keyboard-visibility issue fixed in ActivityForm's inline category input.
 */
export function CategoryPickerSheet({
  visible,
  activity,
  categories,
  onClose,
  onSelect,
  onCreate,
}: CategoryPickerSheetProps) {
  const C = useAppTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  const [mounted, setMounted] = useState(visible);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const translateY = useSharedValue(40);
  const backdropOpacity = useSharedValue(0);

  const [newCategoryName, setNewCategoryName] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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
      exitTimer.current = setTimeout(() => {
        setMounted(false);
        setNewCategoryName(null);
      }, EXIT_MS);
    }
    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, [visible, reduceMotion, translateY, backdropOpacity]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  if (!mounted || !activity) return null;

  const chipBg = C.isDark ? '#3A3A3C' : '#F0F0F0';
  const chipText = C.isDark ? '#ABABAB' : '#888888';

  async function handleCreate() {
    const name = newCategoryName?.trim();
    if (!name) {
      setNewCategoryName(null);
      return;
    }
    setCreating(true);
    try {
      const created = await onCreate(name);
      onSelect(activity!.id, created.id);
      setNewCategoryName(null);
      onClose();
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal transparent visible statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
      </Animated.View>

      <KeyboardAvoidingView behavior="position" style={styles.kav} pointerEvents="box-none">
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

          <View style={styles.pillRow}>
            <AnimatedPressable
              hapticStyle="light"
              onPress={() => {
                onSelect(activity.id, null);
                onClose();
              }}
              style={[
                styles.pill,
                activity.categoryId == null
                  ? {
                      backgroundColor: 'transparent',
                      borderColor: COLORS.primary,
                      borderWidth: 1.5,
                    }
                  : { backgroundColor: chipBg, borderWidth: 1.5, borderColor: 'transparent' },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: activity.categoryId == null }}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: activity.categoryId == null ? COLORS.primary : chipText },
                ]}
              >
                {t.activity.noCategoryLabel}
              </Text>
            </AnimatedPressable>

            {categories.map((cat) => {
              const selected = activity.categoryId === cat.id;
              return (
                <AnimatedPressable
                  key={cat.id}
                  hapticStyle="light"
                  onPress={() => {
                    onSelect(activity.id, selected ? null : cat.id);
                    onClose();
                  }}
                  style={[
                    styles.pill,
                    selected
                      ? {
                          backgroundColor: 'transparent',
                          borderColor: COLORS.primary,
                          borderWidth: 1.5,
                        }
                      : { backgroundColor: chipBg, borderWidth: 1.5, borderColor: 'transparent' },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.pillText, { color: selected ? COLORS.primary : chipText }]}>
                    {cat.name}
                  </Text>
                </AnimatedPressable>
              );
            })}

            {newCategoryName === null ? (
              <AnimatedPressable
                hapticStyle="light"
                onPress={() => setNewCategoryName('')}
                style={[
                  styles.pill,
                  { backgroundColor: chipBg, borderWidth: 1.5, borderColor: 'transparent' },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t.activity.newCategoryLabel}
              >
                <Text style={[styles.pillText, { color: chipText }]}>
                  + {t.activity.newCategoryLabel}
                </Text>
              </AnimatedPressable>
            ) : null}
          </View>

          {newCategoryName !== null ? (
            <View style={styles.newCategoryRow}>
              <RNTextInput
                style={[styles.newCategoryInput, { color: C.text, backgroundColor: chipBg }]}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                onSubmitEditing={handleCreate}
                placeholder={t.activity.newCategoryPlaceholder}
                placeholderTextColor={C.textTertiary}
                autoFocus
                editable={!creating}
              />
              <AnimatedPressable
                hapticStyle="light"
                onPress={handleCreate}
                disabled={creating}
                style={styles.newCategoryBtn}
                accessibilityRole="button"
                accessibilityLabel={t.common.done}
              >
                <MaterialCommunityIcons name="check" size={18} color={COLORS.primary} />
              </AnimatedPressable>
              <AnimatedPressable
                hapticStyle="light"
                onPress={() => setNewCategoryName(null)}
                disabled={creating}
                style={styles.newCategoryBtn}
                accessibilityRole="button"
                accessibilityLabel={t.common.cancel}
              >
                <MaterialCommunityIcons name="close" size={18} color={chipText} />
              </AnimatedPressable>
            </View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
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
  kav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 16,
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
    paddingBottom: 14,
  },
  headerEmoji: { fontSize: 22 },
  headerName: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    flex: 1,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 4,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  pillText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
  newCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  newCategoryInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  newCategoryBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
