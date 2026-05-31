import { Tabs, useRouter } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/ui/theme';
import { t } from '@/i18n/cs';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TAB_CONFIG: Record<string, { icon: IconName; iconFocused: IconName; label: string }> = {
  index:    { icon: 'home-outline',    iconFocused: 'home',           label: t.tabs.habits   },
  stats:    { icon: 'chart-bar',       iconFocused: 'chart-bar',      label: t.tabs.insights },
  streak:   { icon: 'fire',            iconFocused: 'fire',           label: t.tabs.streak   },
  settings: { icon: 'account-outline', iconFocused: 'account',        label: t.tabs.profile  },
};

// ─── Custom floating pill tab bar ────────────────────────────────────────────
function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const cfg = TAB_CONFIG[route.name];
          if (!cfg) return null;
          const iconName = focused ? cfg.iconFocused : cfg.icon;
          const iconColor = focused ? COLORS.primary : '#BDBDBD';

          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={styles.tabItem}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={cfg.label}
            >
              {/* Active: green pill with icon + label. Inactive: just icon */}
              <View style={[styles.tabInner, focused && styles.tabInnerActive]}>
                <MaterialCommunityIcons name={iconName} size={21} color={iconColor} />
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

// ─── Layout ──────────────────────────────────────────────────────────────────
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    />
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Outer container sits at the absolute bottom above safe area
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    // Transparent bg — content shows through
  },
  // The white floating pill
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    paddingVertical: 6,
    paddingHorizontal: 8,
    width: '100%',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  // Each tab gets equal space
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  // Inner container — auto-sized, NOT flex
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 24,
  },
  // Active state — green tinted pill behind icon+label
  tabInnerActive: {
    backgroundColor: COLORS.primaryLight,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
