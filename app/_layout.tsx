import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { DatabaseProvider } from '../src/context/DatabaseContext';
import { CabinetProvider } from '../src/context/CabinetContext';
import { RevenueCatProvider } from '../src/context/RevenueCatContext';
import { Colors } from '../src/constants/colors';
import { Button, Fonts, T } from '../src/components/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Expo Router renders this in place of the crashed screen tree when any
// descendant throws during render (e.g. a missing context provider, or bad
// data reaching an unguarded array op) — without it, that's a white screen.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={errorStyles.container}>
      <T v="title3" align="center">Something went wrong</T>
      <T v="subhead" color={Colors.secondaryLabel} align="center" style={{ marginVertical: 12 }}>
        {error.message}
      </T>
      <Button title="Reload" onPress={retry} kind="tinted" />
    </View>
  );
}

const errorStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: Colors.background },
});

const headerStyle = {
  headerStyle: { backgroundColor: Colors.background },
  headerShadowVisible: false,
  headerTintColor: Colors.tint,
  headerTitleStyle: { fontFamily: Fonts.semibold, fontSize: 17, color: Colors.label },
  headerTitleAlign: 'center' as const,
  headerBackTitleStyle: { fontFamily: Fonts.regular },
  contentStyle: { backgroundColor: Colors.background },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <DatabaseProvider>
      <RevenueCatProvider>
        <CabinetProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={headerStyle}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="results" options={{ title: '', headerBackTitle: 'Back' }} />
            <Stack.Screen
              name="pharmacist-card"
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="family" options={{ title: 'Family', headerBackTitle: 'Back' }} />
            <Stack.Screen name="settings" options={{ title: 'About', headerBackTitle: 'Back' }} />
          </Stack>
        </CabinetProvider>
      </RevenueCatProvider>
    </DatabaseProvider>
  );
}
