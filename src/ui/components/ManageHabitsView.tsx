import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';

import type { Activity, Category } from '@/domain/types';
import { useTranslation } from '@/i18n';
import { useAppTheme } from '@/ui/useAppTheme';
import { FONTS, getPastelColor } from '@/ui/theme';
import { AnimatedPressable } from '@/ui/anim/AnimatedPressable';
import { EditMinusButton } from './EditMinusButton';
import { ReorderableGroup } from './ReorderableGroup';

const CATEGORY_ROW_HEIGHT = 52;
const HABIT_ROW_HEIGHT = 66;
// Gap between rows — baked into the SLOT spacing passed to ReorderableGroup,
// not a margin on the row itself: ReorderableGroup positions rows via
// `top = slot * itemHeight`, a fixed stride independent of the row's own
// rendered height, so a `marginBottom` on the row is invisible (the next
// row's slot starts exactly at itemHeight regardless of the row's margin).
const ROW_GAP = 10;
const CATEGORY_ITEM_HEIGHT = CATEGORY_ROW_HEIGHT + ROW_GAP;
const HABIT_ITEM_HEIGHT = HABIT_ROW_HEIGHT + ROW_GAP;

interface ManageHabitsViewProps {
  activities: readonly Activity[];
  categories: readonly Category[];
  /** Resolved category name lookup (index.tsx already builds this). */
  categoryNameById: ReadonlyMap<number, string>;
  onReorderActivities: (categoryId: number | null, orderedIds: number[]) => void;
  onReorderCategories: (orderedIds: number[]) => void;
  onDeleteActivity: (activityId: number) => void;
  onEditActivity: (activityId: number) => void;
  /** Deletes a category — habits inside it are unassigned, not deleted. */
  onDeleteCategory: (categoryId: number) => void;
  /** Opens the quick category picker — how a habit moves to a different
   *  category from Manage mode. Not a cross-section drag: ReorderableGroup
   *  only reorders WITHIN one fixed-height list, so moving between
   *  categories reuses the same tap-to-reassign sheet used elsewhere,
   *  rather than a much bigger "drag across independent lists" rebuild. */
  onOpenCategoryPicker: (activityId: number) => void;
  isDark: boolean;
}

/**
 * Manage mode — replaces the virtualized FlatList while `editMode` is on.
 * Deliberately non-virtualized (see ReorderableGroup) and structured as TWO
 * separate reorder surfaces rather than one deeply nested drag list:
 *
 * 1. A compact "category order" strip (fixed-height rows, name only) — drag
 *    here reorders the category BLOCKS below it.
 * 2. Per-category blocks (in that order), each with its own independent
 *    reorderable list of habits.
 *
 * Splitting it this way sidesteps a real constraint of the hand-rolled
 * ReorderableGroup: it assumes uniform row height within one instance, and a
 * category block's height varies with its habit count — so the category
 * blocks themselves can't be *the* draggable items directly. Trade-off: a
 * category drag only animates the compact name row in real time; the full
 * block (header + habits) snaps into its new position once the drag ends,
 * rather than dragging the whole block's content along pixel-for-pixel.
 */
export function ManageHabitsView({
  activities,
  categories,
  categoryNameById,
  onReorderActivities,
  onReorderCategories,
  onDeleteActivity,
  onEditActivity,
  onDeleteCategory,
  onOpenCategoryPicker,
  isDark,
}: ManageHabitsViewProps) {
  const t = useTranslation();
  const C = useAppTheme();

  const cardBg = isDark ? '#2C2C2E' : '#FFFFFF';
  const nameColor = isDark ? '#F2F2F7' : '#1A1A1A';
  const handleColor = isDark ? '#8E8E93' : '#B0B0B0';
  const categoryBtnBg = isDark ? '#3A3A3C' : '#F0F0F0';
  const categoryBtnFg = isDark ? '#ABABAB' : '#666666';

  // Sort by `sortOrder` explicitly here rather than trusting that the
  // incoming `activities` array is already globally ordered to match it —
  // any store action that patches sortOrder without also re-sorting the
  // array (easy to miss, already happened once) would otherwise silently
  // misplace rows within their group, overlapping whichever habit actually
  // owns that slot.
  const uncategorized = useMemo(
    () => activities.filter((a) => a.categoryId == null).sort((a, b) => a.sortOrder - b.sortOrder),
    [activities],
  );
  const byCategory = useMemo(() => {
    const map = new Map<number, Activity[]>();
    for (const cat of categories) {
      map.set(
        cat.id,
        activities.filter((a) => a.categoryId === cat.id).sort((a, b) => a.sortOrder - b.sortOrder),
      );
    }
    return map;
  }, [activities, categories]);

  function renderHabitRow(activity: Activity, dragHandleGesture: GestureType) {
    const categoryName =
      activity.categoryId != null ? categoryNameById.get(activity.categoryId) : null;
    return (
      <View style={[styles.habitRow, { backgroundColor: cardBg }]}>
        <EditMinusButton
          editMode
          onPress={() => onDeleteActivity(activity.id)}
          accessibilityLabel={`${t.common.delete} – ${activity.name}`}
        />
        <Pressable
          style={styles.habitContent}
          onPress={() => onEditActivity(activity.id)}
          accessibilityRole="button"
          accessibilityLabel={`${t.common.edit} – ${activity.name}`}
        >
          <View style={[styles.badge, { backgroundColor: getPastelColor(activity.color) }]}>
            <Text style={styles.badgeEmoji}>{activity.emoji}</Text>
          </View>
          <Text style={[styles.habitName, { color: nameColor }]} numberOfLines={1}>
            {activity.name}
          </Text>
        </Pressable>
        <AnimatedPressable
          hapticStyle="light"
          onPress={() => onOpenCategoryPicker(activity.id)}
          style={[styles.categoryBtn, { backgroundColor: categoryBtnBg }]}
          accessibilityRole="button"
          accessibilityLabel={
            categoryName ? `${t.activity.categoryLabel}: ${categoryName}` : t.activity.categoryLabel
          }
        >
          <MaterialCommunityIcons
            name={categoryName ? 'tag' : 'tag-outline'}
            size={18}
            color={categoryBtnFg}
          />
        </AnimatedPressable>
        <GestureDetector gesture={dragHandleGesture}>
          <View style={styles.dragHandle} hitSlop={12}>
            <MaterialCommunityIcons name="drag-horizontal-variant" size={22} color={handleColor} />
          </View>
        </GestureDetector>
      </View>
    );
  }

  if (activities.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: C.textSecondary }]}>{t.home.empty}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {categories.length > 0 ? (
        <>
          <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>
            {t.home.categoryOrderLabel}
          </Text>
          <ReorderableGroup
            items={categories}
            keyExtractor={(cat) => `cat-${cat.id}`}
            itemHeight={CATEGORY_ITEM_HEIGHT}
            onReorder={(ordered) => onReorderCategories(ordered.map((c) => c.id))}
            renderItem={(cat, dragHandleGesture) => (
              <View style={[styles.categoryRow, { backgroundColor: cardBg }]}>
                <EditMinusButton
                  editMode
                  onPress={() => onDeleteCategory(cat.id)}
                  accessibilityLabel={`${t.common.delete} – ${cat.name}`}
                />
                <Text style={[styles.categoryName, { color: nameColor }]} numberOfLines={1}>
                  {cat.name}
                </Text>
                <GestureDetector gesture={dragHandleGesture}>
                  <View style={styles.dragHandle} hitSlop={12}>
                    <MaterialCommunityIcons
                      name="drag-horizontal-variant"
                      size={22}
                      color={handleColor}
                    />
                  </View>
                </GestureDetector>
              </View>
            )}
          />
        </>
      ) : null}

      {categories.map((cat) => {
        const items = byCategory.get(cat.id) ?? [];
        if (items.length === 0) return null;
        return (
          <View key={cat.id} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>{cat.name}</Text>
            <ReorderableGroup
              items={items}
              keyExtractor={(a) => String(a.id)}
              itemHeight={HABIT_ITEM_HEIGHT}
              onReorder={(ordered) =>
                onReorderActivities(
                  cat.id,
                  ordered.map((a) => a.id),
                )
              }
              renderItem={renderHabitRow}
            />
          </View>
        );
      })}

      {uncategorized.length > 0 ? (
        <View style={styles.section}>
          {categories.length > 0 ? (
            <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>
              {t.home.uncategorized}
            </Text>
          ) : null}
          <ReorderableGroup
            items={uncategorized}
            keyExtractor={(a) => String(a.id)}
            itemHeight={HABIT_ITEM_HEIGHT}
            onReorder={(ordered) =>
              onReorderActivities(
                null,
                ordered.map((a) => a.id),
              )
            }
            renderItem={renderHabitRow}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: FONTS.extraBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 8,
  },
  section: {
    marginTop: 4,
  },

  categoryRow: {
    height: CATEGORY_ROW_HEIGHT,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryName: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    flex: 1,
  },

  habitRow: {
    height: HABIT_ROW_HEIGHT,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  habitContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeEmoji: { fontSize: 18 },
  habitName: {
    fontSize: 15.5,
    fontFamily: FONTS.bold,
    flexShrink: 1,
  },
  categoryBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dragHandle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    textAlign: 'center',
  },
});
