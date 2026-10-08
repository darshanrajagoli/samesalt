import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet } from 'react-native';
import { Colors } from '../src/constants/colors';
import { useRevenueCat } from '../src/context/RevenueCatContext';
import { Config } from '../src/constants/config';
import { Glyph, Row, Section, T } from '../src/components/ui';

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
      Alert.alert('Manage Subscription', 'Go to your device Settings → Subscriptions.');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Section header="How it works">
        <Row
          leading={<Glyph name="flask" color={Colors.tint} />}
          title="Exact composition match"
          subtitle="246,068 Indian medicines keyed by salt, strength, dosage form and release type. Two brands match only if all four are identical."
          numberOfLines={2}
        />
        <Row
          leading={<Glyph name="pricetags" color={Colors.green} />}
          title="Live prices"
          subtitle="Today's prices at Indian online pharmacies, via SerpApi's Google Shopping API. Every listing is checked against the composition database before it's shown."
        />
        <Row
          leading={<Glyph name="location" color={Colors.orange} />}
          title="Government generics nearby"
          subtitle="Nearest Jan Aushadhi Kendras, via SerpApi's Google Maps API."
        />
        <Row
          leading={<Glyph name="shield-checkmark" color={Colors.red} />}
          title="Safety first"
          subtitle="For narrow-therapeutic-index drugs (warfarin, thyroxine, lithium…) SameSalt refuses to suggest substitutes."
          last
        />
      </Section>

      <Section header="Subscription">
        <Row title="Plan" value={isPro ? 'Family' : 'Free'} last={!isPro && false} />
        {isPro ? <Row title="Manage Subscription" chevron onPress={handleManageSubscription} /> : null}
        <Row title={<T v="body" color={Colors.tint}>Restore Purchases</T>} onPress={handleRestore} last />
      </Section>

      <Section
        header="Data"
        footer={`Medicine data adapted from "A-Z Medicine Dataset of India" by Shudhanshu Singh (CC BY-SA 4.0); printed prices as of ${Config.DATASET_DATE}. Live prices and store listings come from Google via SerpApi and may change.`}
      >
        <Row
          title="Dataset on Kaggle"
          chevron
          onPress={() =>
            Linking.openURL('https://www.kaggle.com/datasets/shudhanshusingh/az-medicine-dataset-of-india')
          }
        />
        <Row
          title="Source Code"
          chevron
          onPress={() => Linking.openURL('https://github.com/darshanrajagoli/samesalt')}
          last
        />
      </Section>

      <T v="footnote" color={Colors.secondaryLabel} align="center" style={{ marginHorizontal: 32 }}>
        SameSalt is informational and not medical advice. Ask your doctor or pharmacist before switching
        brands.
      </T>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { paddingTop: 12, paddingBottom: 48 },
});
