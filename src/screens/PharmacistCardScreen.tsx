import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { T } from '../components/ui';
import { formatDosageForm } from '../utils/formatting';

/** Full-screen card to hand to the pharmacist: the salt, not the brand. */
export function PharmacistCardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ salt: string; strength: string; form: string; brand: string }>();
  const salts = (params.salt || 'Unknown composition').split(/\s*\+\s*/);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <T v="footnote" weight="semibold" color={Colors.secondaryLabel}>
          SHOW TO THE PHARMACIST
        </T>
        <Pressable onPress={() => router.back()} hitSlop={14} style={styles.close}>
          <Ionicons name="close" size={18} color={Colors.secondaryLabel} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <T v="title3" color={Colors.secondaryLabel}>I need any brand of</T>
        {salts.map((s) => (
          <T key={s} style={styles.salt}>
            {s}
          </T>
        ))}
        {params.form ? (
          <T v="title2" color={Colors.tint} style={{ marginTop: 8 }}>
            {formatDosageForm(params.form)}
          </T>
        ) : null}

        <View style={styles.rule} />

        <T v="title3">The most affordable one, please.</T>
        <T v="title3" color={Colors.secondaryLabel} style={{ marginTop: 6 }}>
          कृपया इसी साल्ट की सबसे सस्ती दवा दें।
        </T>
      </View>

      <View style={styles.footer}>
        {params.brand ? (
          <T v="footnote" color={Colors.secondaryLabel} align="center">
            Prescribed as {params.brand}
          </T>
        ) : null}
        <T v="caption" color={Colors.tertiaryLabel} align="center" style={{ marginTop: 4 }}>
          SameSalt · informational, not medical advice
        </T>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  salt: {
    fontFamily: 'Inter_700Bold',
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1.2,
    color: Colors.label,
    marginTop: 6,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.separator,
    marginVertical: 28,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 20 },
});
