import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { formatPrice } from '../utils/formatting';

interface Props {
  scannedPerUnit: number | null;
  cheapestPerUnit: number | null;
  saltName: string;
  alternativesCount: number;
}

export function SavingsHeader({
  scannedPerUnit,
  cheapestPerUnit,
  saltName,
  alternativesCount,
}: Props) {
  const hasSavings =
    scannedPerUnit != null &&
    cheapestPerUnit != null &&
    scannedPerUnit > cheapestPerUnit;

  const savingsPerUnit = hasSavings
    ? scannedPerUnit! - cheapestPerUnit!
    : 0;
  const savingsPerMonth = savingsPerUnit * 30;
  const pct =
    hasSavings ? Math.round((savingsPerUnit / scannedPerUnit!) * 100) : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.saltName} numberOfLines={2}>
        {saltName}
      </Text>
      <Text style={styles.altCount}>
        {alternativesCount} identical{' '}
        {alternativesCount === 1 ? 'medicine' : 'medicines'} found
      </Text>

      {hasSavings ? (
        <View style={styles.savingsBox}>
          <Ionicons name="wallet-outline" size={20} color={Colors.success} />
          <View>
            <Text style={styles.savingsLabel}>
              Save up to {pct}% by switching
            </Text>
            <Text style={styles.savingsValue}>
              {formatPrice(savingsPerUnit)}/unit ·{' '}
              {formatPrice(savingsPerMonth)}/month
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.teal50,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  saltName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.teal800,
    marginBottom: 4,
  },
  altCount: {
    fontSize: 14,
    color: Colors.teal600,
  },
  savingsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 10,
  },
  savingsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
  savingsValue: {
    fontSize: 13,
    color: '#166534',
    marginTop: 2,
  },
});
