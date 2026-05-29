import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, PaperProvider, Text } from 'react-native-paper';
import { useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useDbInit } from '@/db/useDbInit';
import { darkTheme, lightTheme } from '@/ui/theme';

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;
  const { ready, error } = useDbInit();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {error ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              backgroundColor: theme.colors.background,
            }}
          >
            <Text variant="titleMedium" style={{ color: theme.colors.error, textAlign: 'center' }}>
              Chyba databáze: {error.message}
            </Text>
          </View>
        ) : !ready ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.background,
            }}
          >
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="activity/new"
              options={{ presentation: 'modal', headerShown: true, title: 'Nová aktivita' }}
            />
            <Stack.Screen
              name="activity/[id]"
              options={{ presentation: 'modal', headerShown: true, title: 'Upravit aktivitu' }}
            />
          </Stack>
        )}
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
