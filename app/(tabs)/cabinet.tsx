import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { useCabinet } from '../../src/context/CabinetContext';
import { useRevenueCat } from '../../src/context/RevenueCatContext';
import { formatPrice } from '../../src/utils/formatting';
import { SavedMedicine } from '../../src/utils/storage';
import { Config } from '../../src/constants/config';
import { Button, Card, LargeTitle, Row, Section, T } from '../../src/components/ui';

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
    const pick = async (days: number) => {
      const ok = await setRefillReminder(med.id, days);
      if (!ok) {
        Alert.alert(
          'Reminder Not Scheduled',
          'SameSalt needs notification permission to remind you. Enable it in your phone Settings > Apps > SameSalt > Notifications, then try again.'
        );
      }
    };
    Alert.alert('Refill Reminder', 'Remind me to refill in:', [
      { text: '15 days', onPress: () => pick(15) },
      { text: '30 days', onPress: () => pick(30) },
      { text: '60 days', onPress: () => pick(60) },
      { text: '90 days', onPress: () => pick(90) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const medicines = activeProfile.medicines;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <LargeTitle
          title="Cabinet"
          subtitle={data.profiles.length > 1 ? `Showing ${activeProfile.name}` : undefined}
          right={
            <Pressable onPress={handleAddProfile} hitSlop={10} style={styles.addBtn}>
              <Ionicons name="person-add" size={21} color={Colors.tint} />
            </Pressable>
          }
        />

        {totalSavings > 0 ? (
          <Card style={styles.hero}>
            <T v="subhead" color={Colors.secondaryLabel}>Switching to the cheapest identical brands saves</T>
            <T style={styles.heroNumber} color={Colors.greenDeep}>{formatPrice(totalSavings)}</T>
            <T v="subhead" color={Colors.secondaryLabel}>every month, at one a day</T>
          </Card>
        ) : null}

        {data.profiles.length > 1 ? (
          <Section>
            <Row title="Family" value={activeProfile.name} chevron onPress={() => router.push('/family')} last />
          </Section>
        ) : null}

        {medicines.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bookmarks-outline" size={48} color={Colors.tertiaryLabel} />
            <T v="title3" style={{ marginTop: 14 }}>No Saved Medicines</T>
            <T v="subhead" color={Colors.secondaryLabel} align="center" style={{ marginTop: 6, marginBottom: 20 }}>
              Save the medicines you take to track what switching saves, and get refill reminders.
            </T>
            <Button title="Find a Medicine" kind="tinted" onPress={() => router.push('/(tabs)/')} />
          </View>
        ) : (
          <Section header={`${medicines.length} saved`} footer="Savings use printed MRPs. Long-press a medicine to remove it.">
            {medicines.map((item, i) => {
              const hasSavings =
                item.per_unit_price != null &&
                item.cheapest_price != null &&
                item.per_unit_price > item.cheapest_price;
              const perMonth = hasSavings ? (item.per_unit_price! - item.cheapest_price!) * 30 : 0;
              return (
                <Pressable key={item.id} onLongPress={() => handleRemove(item)}>
                  <Row
                    title={item.name}
                    subtitle={item.salt_composition}
                    value={
                      <View style={{ alignItems: 'flex-end' }}>
                        {hasSavings ? (
                          <T v="body" color={Colors.greenDeep} tabular>
                            −{formatPrice(perMonth)}
                          </T>
                        ) : (
                          <T v="body" color={Colors.secondaryLabel}>—</T>
                        )}
                        <T v="caption" color={Colors.secondaryLabel}>{hasSavings ? 'per month' : 'cheapest'}</T>
                      </View>
                    }
                    trailing={
                      <Pressable onPress={() => handleSetReminder(item)} hitSlop={10} style={{ marginLeft: 14 }}>
                        <Ionicons
                          name={item.refill_reminder_days ? 'alarm' : 'alarm-outline'}
                          size={21}
                          color={item.refill_reminder_days ? Colors.orange : Colors.tint}
                        />
                      </Pressable>
                    }
                    last={i === medicines.length - 1}
                  />
                </Pressable>
              );
            })}
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  addBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  hero: { marginHorizontal: 16, marginBottom: 28 },
  heroNumber: { fontFamily: 'Inter_700Bold', fontSize: 48, lineHeight: 56, letterSpacing: -1.5, marginVertical: 2 },
  empty: { alignItems: 'center', marginTop: 48, paddingHorizontal: 40 },
});
