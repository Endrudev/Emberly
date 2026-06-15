import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from 'react-native-paper';
import { COLORS, FONTS } from '@/ui/theme';
import { t } from '@/i18n/cs';
import {
  HomeTabIcon,
  StatsTabIcon,
  StreakTabIcon,
  ProfileTabIcon,
} from '@/ui/components/TabIcons';

// ─── Design tokens ───────────────────────────────────────────────────────────
// All tab bar measurements in one place — change here, updates everywhere.

/** Height of the white pill itself. */
export const TAB_PILL_HEIGHT = 80;

/** Total space tab bar takes from bottom of SafeAreaView (pill + gap). */
export const TAB_BAR_SPACE = TAB_PILL_HEIGHT + 20;

type TabIconComponent = React.ComponentType<{ color: string; size: number }>;

const TAB_CONFIG: Record<string, { Icon: TabIconComponent; label: string }> = {
  index:    { Icon: HomeTabIcon,    label: t.tabs.habits   },
  stats:    { Icon: StatsTabIcon,   label: t.tabs.insights },
  streak:   { Icon: StreakTabIcon,  label: t.tabs.streak   },
  settings: { Icon: ProfileTabIcon, label: t.tabs.profile  },
};

// ─── Custom tab bar ───────────────────────────────────────────────────────────
function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { dark: isDark } = useTheme();

  // Dark-mode adaptive colours
  const pillBg        = isDark ? '#2C2C2E' : '#FFFFFF';
  const activeTabBg   = isDark ? 'rgba(45,181,74,0.18)' : COLORS.primaryLight;
  const inactiveColor = isDark ? '#8E8E93' : '#5A6270';

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      <View style={[styles.pill, { backgroundColor: pillBg }]}>
        {state.routes.map((route) => {
          const focused = state.index === state.routes.indexOf(route);
          const cfg = TAB_CONFIG[route.name];
          if (!cfg) return null;

          const { Icon, label } = cfg;
          const iconColor = focused ? COLORS.primary : inactiveColor;

          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={styles.tabItem}
              android_ripple={{ color: 'transparent' }}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
            >
              {/*
               * Both active and inactive share the SAME paddingVertical so the
               * pill height never changes when switching tabs.
               */}
              <View style={[
                styles.tabInner,
                focused && styles.tabInnerActive,
                focused && { backgroundColor: activeTabBg },
              ]}>
                <Icon color={iconColor} size={22} />
                {focused && (
                  <Text style={styles.tabLabel} numberOfLines={1}>
                    {label}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
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

  /** White floating pill */
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 44,
    paddingHorizontal: 18,
    paddingVertical: 10,
    elevation: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
  },

  /** Each tab — equal share of the pill width */
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /**
   * Inner container — identical paddingVertical for active + inactive
   * so pill height never jumps when switching tabs.
   */
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },

  /** Active: green background, fully rounded pill */
  tabInnerActive: {
    paddingHorizontal: 16,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 44,
  },

  tabLabel: {
    fontSize: 12,
    fontFamily: FONTS.extraBold,
    color: COLORS.primary,
    letterSpacing: -0.2,
  },
});
