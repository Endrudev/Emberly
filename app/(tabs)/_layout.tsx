import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { useTheme } from 'react-native-paper';
import { COLORS, FONTS } from '@/ui/theme';
import { useAppTheme } from '@/ui/useAppTheme';
import { useTranslation } from '@/i18n';
import {
  HomeTabIcon,
  StatsTabIcon,
  StreakTabIcon,
  ProfileTabIcon,
} from '@/ui/components/TabIcons';

// ─── Design tokens ───────────────────────────────────────────────────────────
// All tab bar measurements in one place — change here, updates everywhere.

/** Height of the white pill itself. */
export const TAB_PILL_HEIGHT = 84;

/** Total space tab bar takes from bottom of SafeAreaView (pill + gap). */
export const TAB_BAR_SPACE = TAB_PILL_HEIGHT + 20;

type TabIconComponent = React.ComponentType<{ color: string; size: number }>;

// ─── Custom tab bar ───────────────────────────────────────────────────────────
function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { dark: isDark } = useTheme();
  const t = useTranslation();

  const TAB_CONFIG: Record<string, { Icon: TabIconComponent; label: string }> = {
    index:    { Icon: HomeTabIcon,    label: t.tabs.habits   },
    stats:    { Icon: StatsTabIcon,   label: t.tabs.insights },
    streak:   { Icon: StreakTabIcon,  label: t.tabs.streak   },
    settings: { Icon: ProfileTabIcon, label: t.tabs.profile  },
  };

  // Dark-mode adaptive colours
  const pillBg        = isDark ? '#2C2C2E' : '#FFFFFF';
  const activeTabBg   = isDark ? 'rgba(45,181,74,0.18)' : COLORS.primaryLight;
  const inactiveColor = isDark ? '#8E8E93' : '#5A6270';

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      <View style={[styles.pillShadow, { backgroundColor: pillBg }]}>
        <View style={[styles.pill, { backgroundColor: pillBg }]}>
          {state.routes.map((route) => {
            const focused = state.index === state.routes.indexOf(route);
            const cfg = TAB_CONFIG[route.name];
            if (!cfg) return null;

            const { Icon, label } = cfg;
            const iconColor = focused ? COLORS.primary : inactiveColor;

            return (
              <Animated.View key={route.key} layout={LinearTransition.duration(250)}>
                <Pressable
                  onPress={() => navigation.navigate(route.name)}
                  android_ripple={{ color: 'transparent' }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={label}
                >
                  {/*
                   * Both active and inactive share the SAME paddingVertical so the
                   * pill height never changes when switching tabs — only the width
                   * grows/shrinks as the label appears/disappears.
                   */}
                  <View style={[
                    styles.tabInner,
                    focused && styles.tabInnerActive,
                    focused && { backgroundColor: activeTabBg },
                  ]}>
                    <Icon color={iconColor} size={22} />
                    {focused && (
                      <Animated.Text
                        entering={FadeIn.duration(150).delay(80)}
                        exiting={FadeOut.duration(80)}
                        numberOfLines={1}
                        style={[styles.tabLabel, { color: COLORS.primary }]}
                      >
                        {label}
                      </Animated.Text>
                    )}
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function TabsLayout() {
  const C = useAppTheme();
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Without this the tab navigator's default (white) scene background
        // flashes between the old and new screen on every tab switch — most
        // visible in dark mode against the dark content underneath.
        sceneStyle: { backgroundColor: C.BG },
      }}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  /**
   * Wrapper: absolute-positioned, sits above safe area.
   * pointerEvents="box-none" lets taps pass through transparent areas.
   */
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  /**
   * Shadow wrapper — kept separate from the clipped pill below because
   * Android's elevation shadow gets cut off by overflow: 'hidden'.
   */
  pillShadow: {
    borderRadius: 44,
    elevation: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
  },

  /**
   * White floating pill — items are NOT equal-width (no flex), so the
   * active tab's icon+label bubble can grow while the others shrink to
   * icon-only. space-between spreads the remaining room between them.
   * overflow: 'hidden' clips the rightmost tab so its grow animation
   * never visually escapes the pill bounds.
   */
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: 'hidden',
  },

  /**
   * Inner container — identical paddingVertical for active + inactive
   * so pill height never jumps when switching tabs. flexDirection row
   * lets the label sit beside the icon when active.
   */
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 6,
  },

  /** Active: green background, fully rounded pill */
  tabInnerActive: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 44,
  },

  tabLabel: {
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
});
