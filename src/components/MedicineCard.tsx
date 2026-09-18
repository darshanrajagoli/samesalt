import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Medicine } from '../utils/db';
import {
  formatPerUnit,
  formatPrice,
  formatSavingsPercent,
} from '../utils/formatting';

interface Props {
  medicine: Medicine;
  scannedPrice?: number | null;
  rank?: number;
  onPress?: () => void;
  onSave?: () => void;
  showSavings?: boolean;
}

export function MedicineCard({
  medicine,
  scannedPrice,
  rank,
  onPress,
  onSave,
  showSavings = true,
}: Props) {
  const savings =
    showSavings && scannedPrice
      ? formatSavingsPercent(scannedPrice, medicine.per_unit_price)
      : '';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        medicine.is_jan_aushadhi && styles.janAushadhiCard,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {rank != null && (
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{rank}</Text>
            </View>
          )}
          <View style={styles.nameBlock}>
            <Text style={styles.name} numberOfLines={1}>
              {medicine.name}
            </Text>
            {medicine.manufacturer ? (
              <Text style={styles.manufacturer} numberOfLines={1}>
                {medicine.manufacturer}
              </Text>
            ) : null}
          </View>
        </View>

        {onSave && (
          <TouchableOpacity onPress={onSave} hitSlop={8} style={styles.saveBtn}>
            <Ionicons name="bookmark-outline" size={22} color={Colors.teal600} />
          </TouchableOpacity>
        )}
      </View>

      {medicine.is_jan_aushadhi && (
        <View style={styles.jaBadge}>
          <Ionicons name="shield-checkmark" size={14} color={Colors.white} />
          <Text style={styles.jaText}>Jan Aushadhi Generic</Text>
        </View>
      )}

      <View style={styles.priceRow}>
        <View>
          <Text style={styles.priceLabel}>Pack Price</Text>
          <Text style={styles.price}>{formatPrice(medicine.price)}</Text>
        </View>
        <View>
          <Text style={styles.priceLabel}>Per Unit</Text>
          <Text style={styles.pricePerUnit}>
            {formatPerUnit(medicine.per_unit_price)}
          </Text>
        </View>
        {savings ? (
          <View style={styles.savingsBadge}>
            <Ionicons name="trending-down" size={14} color={Colors.success} />
            <Text style={styles.savingsText}>{savings}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  janAushadhiCard: {
    borderColor: Colors.janAushadhi,
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankBadge: {
    backgroundColor: Colors.teal100,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 10,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.teal700,
  },
  nameBlock: { flex: 1 },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  manufacturer: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  saveBtn: {
    padding: 4,
  },
  jaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.janAushadhi,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
    gap: 4,
  },
  jaText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 12,
    gap: 20,
  },
  priceLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  pricePerUnit: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    marginLeft: 'auto',
  },
  savingsText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success,
  },
});
