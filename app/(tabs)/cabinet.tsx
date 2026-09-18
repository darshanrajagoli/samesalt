import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { useCabinet } from '../../src/context/CabinetContext';
import { useRevenueCat } from '../../src/context/RevenueCatContext';
import { formatPrice } from '../../src/utils/formatting';
import { SavedMedicine } from '../../src/utils/storage';
import { Config } from '../../src/constants/config';

export default function CabinetScreen() {
  const router = useRouter();
  const { data, activeProfile, totalSavings, removeMedicine, setRefillReminder } =
    useCabinet();
  const { isPro } = useRevenueCat();

  const handleAddProfile = () => {
    if (!isPro) {
      router.push('/paywall');
      return;
    }
    if (data.profiles.length >= Config.MAX_FAMILY_PROFILES) {
      Alert.alert('Limit Reached', `Maximum ${Config.MAX_FAMILY_PROFILES} profiles allowed.`);
      return;
    }
    router.push('/family');
  };

  const handleRemove = (med: SavedMedicine) => {
    Alert.alert('Remove Medicine', `Remove ${med.name} from your cabinet?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeMedicine(med.id),
      },
    ]);
  };

  const handleSetReminder = (med: SavedMedicine) => {
    if (!isPro) {
      router.push('/paywall');
      return;
    }
    Alert.alert('Refill Reminder', 'Remind me to refill in:', [
      { text: '15 days', onPress: () => setRefillReminder(med.id, 15) },
      { text: '30 days', onPress: () => setRefillReminder(med.id, 30) },
      { text: '60 days', onPress: () => setRefillReminder(med.id, 60) },
      { text: '90 days', onPress: () => setRefillReminder(med.id, 90) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const medicines = activeProfile.medicines;

  return (
    <View style={styles.container}>
      {/* Profile selector */}
      <View style={styles.profileBar}>
        <View style={styles.profileInfo}>
          <Ionicons name="person-circle" size={32} color={Colors.teal600} />
          <Text style={styles.profileName}>{activeProfile.name}</Text>
          {data.profiles.length > 1 && (
            <TouchableOpacity onPress={() => router.push('/family')}>
              <Text style={styles.switchText}>Switch</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={handleAddProfile} style={styles.addProfileBtn}>
          <Ionicons name="person-add-outline" size={20} color={Colors.teal600} />
        </TouchableOpacity>
      </View>

      {/* Savings summary */}
      {totalSavings > 0 && (
        <View style={styles.savingsBanner}>
          <Ionicons name="wallet-outline" size={22} color={Colors.success} />
          <View style={styles.savingsInfo}>
            <Text style={styles.savingsLabel}>Potential Monthly Savings</Text>
            <Text style={styles.savingsAmount}>
              {formatPrice(totalSavings)}
            </Text>
          </View>
        </View>
      )}

      {/* Medicine list */}
      <FlatList
        data={medicines}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="medical-outline"
              size={56}
              color={Colors.gray200}
            />
            <Text style={styles.emptyTitle}>Your cabinet is empty</Text>
            <Text style={styles.emptyDesc}>
              Search or scan a medicine and tap the bookmark icon to save it
              here.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/(tabs)/')}
            >
              <Text style={styles.emptyBtnText}>Search Medicines</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const hasSavings =
            item.per_unit_price != null &&
            item.cheapest_price != null &&
            item.per_unit_price > item.cheapest_price;
          const savingsPerMonth = hasSavings
            ? (item.per_unit_price! - item.cheapest_price!) * 30
            : 0;

          return (
            <View style={styles.medCard}>
              <View style={styles.medHeader}>
                <Text style={styles.medName} numberOfLines={1}>
                  {item.name}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemove(item)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.gray400} />
                </TouchableOpacity>
              </View>

              <Text style={styles.medSalt} numberOfLines={1}>
                {item.salt_composition}
              </Text>

              <View style={styles.medFooter}>
                {hasSavings ? (
                  <View style={styles.savingsTag}>
                    <Text style={styles.savingsTagText}>
                      Save {formatPrice(savingsPerMonth)}/mo
                    </Text>
                  </View>
                ) : (
                  <View />
                )}

                <TouchableOpacity
                  style={styles.reminderBtn}
                  onPress={() => handleSetReminder(item)}
                >
                  <Ionicons
                    name={item.refill_reminder_days ? 'notifications' : 'notifications-outline'}
                    size={18}
                    color={Colors.teal600}
                  />
                  <Text style={styles.reminderText}>
                    {item.refill_reminder_days
                      ? `${item.refill_reminder_days}d`
                      : 'Remind'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  profileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  profileInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  switchText: { fontSize: 13, color: Colors.teal600, fontWeight: '600' },
  addProfileBtn: { padding: 8 },
  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    margin: 16,
    marginBottom: 0,
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  savingsInfo: {},
  savingsLabel: { fontSize: 12, color: '#166534' },
  savingsAmount: { fontSize: 20, fontWeight: '800', color: Colors.success },
  list: { padding: 16, paddingBottom: 100 },
  medCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  medHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  medSalt: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  medFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  savingsTag: {
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  savingsTagText: { fontSize: 12, fontWeight: '600', color: Colors.success },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reminderText: { fontSize: 13, color: Colors.teal600, fontWeight: '500' },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 12, padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  emptyDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: Colors.teal700,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  emptyBtnText: { color: Colors.white, fontWeight: '600' },
});
