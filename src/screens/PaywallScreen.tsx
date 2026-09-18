import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PurchasesPackage } from 'react-native-purchases';
import { Colors } from '../constants/colors';
import { useRevenueCat } from '../context/RevenueCatContext';
import { useCabinet } from '../context/CabinetContext';
import { formatPrice } from '../utils/formatting';

export function PaywallScreen() {
  const router = useRouter();
  const { packages, purchasePackage, restorePurchases } = useRevenueCat();
  const { totalSavings } = useCabinet();
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(
    // Pre-select annual
    packages.findIndex((p) => p.packageType === 'ANNUAL') >= 0
      ? packages.findIndex((p) => p.packageType === 'ANNUAL')
      : 0
  );

  const handlePurchase = async () => {
    const pkg = packages[selectedIdx];
    if (!pkg) return;
    setLoading(true);
    const success = await purchasePackage(pkg);
    setLoading(false);
    if (success) {
      router.back();
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    const restored = await restorePurchases();
    setLoading(false);
    if (restored) {
      router.back();
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Close button */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => router.back()}
        hitSlop={16}
      >
        <Ionicons name="close" size={28} color={Colors.textSecondary} />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.emoji}>👨‍👩‍👧‍👦</Text>
        <Text style={styles.title}>SameSalt Family</Text>
        <Text style={styles.subtitle}>
          Track medicines for your whole family
        </Text>
      </View>

      {/* Dynamic savings callout */}
      {totalSavings > 0 && (
        <View style={styles.savingsCallout}>
          <Ionicons name="trending-up" size={20} color={Colors.success} />
          <Text style={styles.savingsText}>
            You've already found {formatPrice(totalSavings)}/month in savings.
            Imagine that across your whole family.
          </Text>
        </View>
      )}

      {/* Features */}
      <View style={styles.features}>
        {[
          ['people-outline', 'Up to 6 family profiles'],
          ['notifications-outline', 'Refill reminders'],
          ['bar-chart-outline', 'Monthly savings summary'],
          ['heart-outline', 'Support indie development'],
        ].map(([icon, text]) => (
          <View key={text} style={styles.featureRow}>
            <Ionicons
              name={icon as any}
              size={22}
              color={Colors.teal600}
            />
            <Text style={styles.featureText}>{text}</Text>
          </View>
        ))}
      </View>

      {/* Package selector */}
      <View style={styles.packages}>
        {packages.map((pkg, idx) => {
          const isAnnual = pkg.packageType === 'ANNUAL';
          const selected = idx === selectedIdx;
          return (
            <TouchableOpacity
              key={pkg.identifier}
              style={[
                styles.packageCard,
                selected && styles.packageSelected,
              ]}
              onPress={() => setSelectedIdx(idx)}
            >
              {isAnnual && (
                <View style={styles.bestValueBadge}>
                  <Text style={styles.bestValueText}>BEST VALUE</Text>
                </View>
              )}
              <View style={styles.packageInfo}>
                <Text
                  style={[
                    styles.packageTitle,
                    selected && styles.packageTitleSelected,
                  ]}
                >
                  {isAnnual ? 'Annual' : 'Monthly'}
                </Text>
                <Text style={styles.packagePrice}>
                  {pkg.product.priceString}
                  {isAnnual ? '/year' : '/month'}
                </Text>
                {isAnnual && pkg.product.introPrice && (
                  <Text style={styles.trialText}>
                    7-day free trial
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.radio,
                  selected && styles.radioSelected,
                ]}
              >
                {selected && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.ctaBtn, loading && styles.ctaDisabled]}
        onPress={handlePurchase}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.ctaText}>
            {packages[selectedIdx]?.product.introPrice
              ? 'Start Free Trial'
              : 'Subscribe'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Restore */}
      <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore}>
        <Text style={styles.restoreText}>Restore Purchases</Text>
      </TouchableOpacity>

      {/* Fine print */}
      <Text style={styles.finePrint}>
        Payment will be charged to your App Store or Google Play account.
        Subscription auto-renews unless cancelled at least 24 hours before the
        end of the current period. Free scans, search, and single-profile
        cabinet remain free forever.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { padding: 24, paddingTop: 60 },
  closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10 },
  header: { alignItems: 'center', marginBottom: 24 },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.teal800 },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  savingsCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  savingsText: { fontSize: 14, color: '#166534', flex: 1, lineHeight: 20 },
  features: { marginBottom: 24, gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontSize: 16, color: Colors.textPrimary },
  packages: { gap: 12, marginBottom: 24 },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
  },
  packageSelected: { borderColor: Colors.teal600, backgroundColor: Colors.teal50 },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    left: 16,
    backgroundColor: Colors.amber500,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bestValueText: { fontSize: 10, fontWeight: '800', color: Colors.white },
  packageInfo: { flex: 1 },
  packageTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  packageTitleSelected: { color: Colors.teal800 },
  packagePrice: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  trialText: { fontSize: 12, color: Colors.teal600, marginTop: 2, fontWeight: '600' },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.teal600 },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.teal600,
  },
  ctaBtn: {
    backgroundColor: Colors.teal700,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { fontSize: 18, fontWeight: '700', color: Colors.white },
  restoreBtn: { alignItems: 'center', paddingVertical: 12 },
  restoreText: { fontSize: 14, color: Colors.teal600, fontWeight: '600' },
  finePrint: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 8,
  },
});
