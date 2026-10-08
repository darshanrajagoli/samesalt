import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { Colors } from '../../src/constants/colors';
import { Fonts } from '../../src/components/ui';

type IconName = keyof typeof Ionicons.glyphMap;

function icon(filled: IconName, outline: IconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? filled : outline} size={25} color={color} />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.tint,
        tabBarInactiveTintColor: '#999999',
        tabBarLabelStyle: { fontFamily: Fonts.medium, fontSize: 10, marginTop: 1 },
        tabBarStyle: {
          backgroundColor: 'rgba(249,249,249,0.97)',
          borderTopColor: Colors.hairline,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Search', tabBarIcon: icon('search', 'search-outline') }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan', tabBarIcon: icon('scan', 'scan-outline') }} />
      <Tabs.Screen name="cabinet" options={{ title: 'Cabinet', tabBarIcon: icon('bookmarks', 'bookmarks-outline') }} />
    </Tabs>
  );
}
