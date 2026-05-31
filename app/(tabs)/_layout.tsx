import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/ui/theme';
import { t } from '@/i18n/cs';

// ─── Design tokens ───────────────────────────────────────────────────────────
// All tab bar measurements in one place — change here, updates everywhere.

/** Height of the white pill itself. */
export const TAB_PILL_HEIGHT = 72;

/** Total space tab bar takes from bottom of SafeAreaView (pill + gap). */
export const TAB_BAR_SPACE = TAB_PILL_HEIGHT + 16;

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TAB_CONFIG: Record<string, { icon: IconName; iconFocused: IconName; label: string }> = {
  index:    { icon: 'home-outline',    iconFocused: 'home',      label: t.tabs.habits   },
  stats:    { icon: 'chart-bar',       iconFocused: 'chart-bar', label: t.tabs.insights },
  streak:   { icon: 'fire',            iconFocused: 'fire',       label: t.tabs.streak   },
  settings: { icon: 'account-outline', iconFocused: 'account',   label: t.tabs.profile  },
};

// ─── Custom tab bar ───────────────────────────────────────────────────────────
function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const cfg = TAB_CONFIG[route.name];
          if (!cfg) return null;

          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={styles.tabItem}
              android_ripple={{ color: 'transparent' }}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={cfg.label}
            >
              {/*
               * Both active and inactive share the SAME paddingVertical so the
               * pill height never changes when switching tabs.
               */}
              <View style={[styles.tabInner, focused && styles.tabInnerActive]}>
                <MaterialCommunityIcons
                  name={focused ? cfg.iconFocused : cfg.icon}
                  size={22}
                  color={focused ? COLORS.primary : '#BDBDBD'}
                />
                {focused && (
                  <Text style={styles.tabLabel} numberOfLines={1}>
                    {cfg.label}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 44,
    paddingHorizontal: 8,
    paddingVertical: 8,
    elevation: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
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
    gap: 7,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },

  /** Active: green background, slightly more horizontal padding for label room */
  tabInnerActive: {
    paddingHorizontal: 16,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 16,
  },

  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: -0.1,
  },
});
