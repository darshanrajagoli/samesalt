import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DatabaseProvider } from '../src/context/DatabaseContext';
import { CabinetProvider } from '../src/context/CabinetContext';
import { RevenueCatProvider } from '../src/context/RevenueCatContext';
import { Colors } from '../src/constants/colors';

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <RevenueCatProvider>
        <CabinetProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: Colors.white },
              headerTintColor: Colors.teal800,
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: Colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="results"
              options={{ title: 'Alternatives', headerBackTitle: 'Back' }}
            />
            <Stack.Screen
              name="pharmacist-card"
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="paywall"
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name="family"
              options={{ title: 'Family Profiles', headerBackTitle: 'Back' }}
            />
            <Stack.Screen
              name="settings"
              options={{ title: 'Settings', headerBackTitle: 'Back' }}
            />
          </Stack>
        </CabinetProvider>
      </RevenueCatProvider>
    </DatabaseProvider>
  );
}
