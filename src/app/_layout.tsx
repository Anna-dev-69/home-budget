import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { migrateDatabase } from '@/data/database';
import { BudgetProvider } from '@/data/store';
import { useTheme } from '@/theme';

export default function RootLayout() {
  const p = useTheme();
  const base = p.dark ? DarkTheme : DefaultTheme;
  const navTheme = { ...base, colors: { ...base.colors, background: p.bg, card: p.card, primary: p.accent, text: p.text, border: p.border } };

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <SQLiteProvider databaseName="home-budget.db" onInit={migrateDatabase}>
          <BudgetProvider
            fallback={
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg }}>
                <ActivityIndicator color={p.accent} />
              </View>
            }
          >
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="transaction" options={{ presentation: 'modal' }} />
              <Stack.Screen name="account" options={{ presentation: 'modal' }} />
              <Stack.Screen name="limit" options={{ presentation: 'modal' }} />
              <Stack.Screen name="goal" options={{ presentation: 'modal' }} />
            </Stack>
          </BudgetProvider>
        </SQLiteProvider>
        <StatusBar style={p.dark ? 'light' : 'dark'} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
