import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { useRevenueCat } from '../src/context/RevenueCatContext';
import { Config } from '../src/constants/config';

export default function SettingsScreen() {
  const { isPro, restorePurchases, customerInfo } = useRevenueCat();

  const handleRestore = async () => {
    const restored = await restorePurchases();
    Alert.alert(
      restored ? 'Restored' : 'No Purchases Found',
      restored
        ? 'Your SameSalt Family subscription has been restored.'
        : 'No previous purchases were found for this account.'
    );
  };

  const handleManageSubscription = () => {
    if (customerInfo?.managementURL) {
      Linking.openURL(customerInfo.managementURL);
    } else {
      Alert.alert(
        'Manage Subscription',
        'Go to your device Settings → Subscriptions to manage your SameSalt subscription.'
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Subscription status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <View
              style={[
                styles.statusBadge,
                isPro ? styles.proBadge : styles.freeBadge,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isPro ? styles.proText : styles.freeText,
                ]}
              >
                {isPro ? 'Family' : 'Free'}
              </Text>
            </View>
          </View>

          {isPro && (
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={handleManageSubscription}
            >
              <Text style={styles.manageBtnText}>Manage Subscription</Text>
              <Ionicons
                name="open-outline"
                size={16}
                color={Colors.teal600}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore}>
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Database</Text>
            <Text style={styles.value}>{Config.DATASET_DATE}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Source</Text>
            <Text style={styles.value}>Kaggle A-Z Medicine Dataset</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Version</Text>
            <Text style={styles.value}>1.0.0</Text>
          </View>
        </View>
      </View>

      {/* Disclaimer */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Disclaimer</Text>
        <View style={styles.card}>
          <Text style={styles.disclaimer}>
            SameSalt is an informational tool and does not provide medical
            advice. Medicine prices shown are from {Config.DATASET_DATE} and may
            not reflect current market prices. Always consult your doctor or
            pharmacist before switching medicine brands, especially for Narrow
            Therapeutic Index (NTI) drugs.
          </Text>
        </View>
      </View>

      {/* Open source */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            Linking.openURL('https://github.com/darshanrajagoli/samesalt')
          }
        >
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="logo-github" size={22} color={Colors.textPrimary} />
              <Text style={styles.label}>View Source Code</Text>
            </View>
            <Ionicons
              name="open-outline"
              size={16}
              color={Colors.textMuted}
            />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 60 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 15, color: Colors.textPrimary },
  value: { fontSize: 14, color: Colors.textSecondary },
  statusBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  proBadge: { backgroundColor: Colors.teal100 },
  freeBadge: { backgroundColor: Colors.gray100 },
  statusText: { fontSize: 13, fontWeight: '700' },
  proText: { color: Colors.teal700 },
  freeText: { color: Colors.textSecondary },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  manageBtnText: { fontSize: 14, color: Colors.teal600, fontWeight: '600' },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  restoreText: { fontSize: 14, color: Colors.textMuted },
  disclaimer: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
