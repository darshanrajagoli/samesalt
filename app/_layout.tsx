import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DatabaseProvider } from '../src/context/DatabaseContext';
import { CabinetProvider } from '../src/context/CabinetContext';
import { RevenueCatProvider } from '../src/context/RevenueCatContext';
import { Colors } from '../src/constants/colors';

// Expo Router renders this in place of the crashed screen tree when any
// descendant throws during render (e.g. a missing context provider, or bad
// data reaching an unguarded array op) — without it, that's a white screen.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={errorStyles.container}>
      <Text style={errorStyles.title}>Something went wrong</Text>
      <Text style={errorStyles.message}>{error.message}</Text>
      <TouchableOpacity style={errorStyles.button} onPress={retry}>
        <Text style={errorStyles.buttonText}>Reload</Text>
      </TouchableOpacity>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Colors.background },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  message: { fontSize: 13, color: Colors.textSecondary, marginBottom: 20, textAlign: 'center' },
  button: { backgroundColor: Colors.teal700, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  buttonText: { color: Colors.white, fontWeight: '600' },
});

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
