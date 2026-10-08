import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PurchasesPackage } from 'react-native-purchases';
import { Colors } from '../constants/colors';
import { useRevenueCat } from '../context/RevenueCatContext';
import { useCabinet } from '../context/CabinetContext';
import { formatPrice } from '../utils/formatting';
import { Button, T } from '../components/ui';

export function PaywallScreen() {
  const router = useRouter();
  const { packages, purchasePackage, restorePurchases } = useRevenueCat();
  const { totalSavings } = useCabinet();
  const [loading, setLoading] = useState(false);
  // `packages` can arrive after this component mounts (offerings fetched
  // async), so this can't be a useState initializer — it needs to react
  // once the real list shows up, or the annual pre-selection silently never
  // applies if the paywall opens before getOfferings() resolves.
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    if (packages.length === 0) return;
    const annualIdx = packages.findIndex((p) => p.packageType === 'ANNUAL');
    setSelectedIdx(annualIdx >= 0 ? annualIdx : 0);
  }, [packages]);

  const handlePurchase = async () => {
    const pkg = packages[selectedIdx];
    if (!pkg) return;
    setLoading(true);
    const result = await purchasePackage(pkg);
    setLoading(false);
    if (result === 'success') {
      router.back();
    } else if (result === 'error') {
      Alert.alert(
        'Purchase Not Completed',
        "We couldn't complete that purchase. Please check your connection and try again."
      );
    }
    // 'cancelled' — the user backed out of the native purchase sheet; no
    // alert needed, they know what they just did.
  };

  const handleRestore = async () => {
    setLoading(true);
    const restored = await restorePurchases();
    setLoading(false);
    if (restored) {
      router.back();
    } else {
      Alert.alert(
        'Nothing to Restore',
        "We couldn't find an active SameSalt Family subscription for this device."
      );
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable style={styles.close} onPress={() => router.back()} hitSlop={14}>
        <Ionicons name="close" size={18} color={Colors.secondaryLabel} />
      </Pressable>

      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons name="people" size={34} color={Colors.white} />
        </View>
        <T v="title1" align="center" style={{ marginTop: 16 }}>SameSalt Family</T>
        <T v="body" color={Colors.secondaryLabel} align="center" style={{ marginTop: 6 }}>
          Everyone's medicines, one cabinet.
        </T>
      </View>

      {totalSavings > 0 ? (
        <View style={styles.callout}>
          <T v="subhead" color={Colors.greenDeep} align="center">
            You've already found {formatPrice(totalSavings)} a month in savings for yourself.
          </T>
        </View>
      ) : null}

      <View style={styles.features}>
        {(
          [
            ['people', 'Up to 6 family profiles'],
            ['alarm', 'Refill reminders'],
            ['stats-chart', 'Monthly savings summary'],
          ] as const
        ).map(([icon, text]) => (
          <View key={text} style={styles.featureRow}>
            <Ionicons name={icon} size={22} color={Colors.tint} />
            <T v="body" style={{ marginLeft: 14 }}>{text}</T>
          </View>
        ))}
      </View>

      {packages.length === 0 ? (
        <T v="footnote" color={Colors.secondaryLabel} align="center" style={{ marginBottom: 20 }}>
          Plans aren't available right now. Check your connection and try again.
        </T>
      ) : (
        <View style={{ gap: 10, marginBottom: 20 }}>
          {packages.map((pkg, idx) => {
            const isAnnual = pkg.packageType === 'ANNUAL';
            const selected = idx === selectedIdx;
            return (
              <Pressable
                key={pkg.identifier}
                style={[styles.plan, selected && styles.planSelected]}
                onPress={() => setSelectedIdx(idx)}
              >
                <View style={{ flex: 1 }}>
                  <T v="headline">{isAnnual ? 'Annual' : 'Monthly'}</T>
                  <T v="subhead" color={Colors.secondaryLabel}>
                    {pkg.product.priceString}
                    {isAnnual ? ' a year' : ' a month'}
                    {isAnnual && pkg.product.introPrice ? ' · 7-day free trial' : ''}
                  </T>
                </View>
                <Ionicons
                  name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={selected ? Colors.tint : Colors.tertiaryLabel}
                />
              </Pressable>
            );
          })}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={Colors.tint} style={{ height: 50 }} />
      ) : (
        <Button
          title={packages[selectedIdx]?.product.introPrice ? 'Start Free Trial' : 'Subscribe'}
          onPress={handlePurchase}
          disabled={packages.length === 0}
        />
      )}
      <Button title="Restore Purchases" kind="plain" onPress={handleRestore} style={{ marginTop: 4 }} />

      <T v="caption" color={Colors.secondaryLabel} align="center" style={{ marginTop: 8 }}>
        Renews automatically unless cancelled 24 hours before the period ends. Search, scan, live prices and
        a personal cabinet stay free.
      </T>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },
  content: { padding: 24, paddingTop: 56 },
  close: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { alignItems: 'center', marginBottom: 24 },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: Colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callout: { backgroundColor: Colors.greenSoft, borderRadius: 12, padding: 12, marginBottom: 20 },
  features: { marginBottom: 24, gap: 16, paddingHorizontal: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planSelected: { borderColor: Colors.tint, backgroundColor: Colors.tintSoft },
});
