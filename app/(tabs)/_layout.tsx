import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/ui/theme';
import { t } from '@/i18n/cs';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface TabIconProps {
  icon: IconName;
  label: string;
  focused: boolean;
}

function TabBarIcon({ icon, label, focused }: TabIconProps) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={focused ? COLORS.primary : '#9E9E9E'}
      />
      {/* Label only visible on active tab — matches design */}
      {focused && (
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  // Tab bar height: icon area (56px) + bottom safe area (nav bar)
  const tabBarHeight = 56 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabBarHeight,
            paddingBottom: insets.bottom,
          },
        ],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon="home-outline" label={t.tabs.habits} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon="chart-bar" label={t.tabs.insights} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="streak"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon="fire" label={t.tabs.streak} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon="account-outline" label={t.tabs.profile} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    // Floating pill — all corners rounded
    borderRadius: 32,
    // Lift off the screen edge
    marginHorizontal: 16,
    marginBottom: 12,
    // Shadow so it floats above content
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    paddingTop: 6,
  },
  iconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  iconWrapActive: {
    backgroundColor: COLORS.primaryLight,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
