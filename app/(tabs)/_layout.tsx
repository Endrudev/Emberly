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
      <Text style={[styles.label, { color: focused ? COLORS.primary : '#9E9E9E' }]}>
        {label}
      </Text>
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    paddingTop: 4,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 2,
    minWidth: 64,
  },
  iconWrapActive: {
    backgroundColor: COLORS.primaryLight,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
