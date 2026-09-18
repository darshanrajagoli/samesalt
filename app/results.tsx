import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { Config } from '../src/constants/config';
import {
  Medicine,
  findAlternatives,
  countAlternatives,
  getMedicineById,
} from '../src/utils/db';
import { MedicineCard } from '../src/components/MedicineCard';
import { SavingsHeader } from '../src/components/SavingsHeader';
import { NTIWarning } from '../src/components/NTIWarning';
import { useCabinet } from '../src/context/CabinetContext';
import { SavedMedicine } from '../src/utils/storage';

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    medicineId: string;
    canonicalKey: string;
    name: string;
    scannedBrand?: string;
    scannedSalt?: string;
  }>();

  const { saveMedicine } = useCabinet();

  const [loading, setLoading] = useState(true);
  const [scannedMedicine, setScannedMedicine] = useState<Medicine | null>(null);
  const [alternatives, setAlternatives] = useState<Medicine[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const med = await getMedicineById(Number(params.medicineId));
      setScannedMedicine(med);

      if (med?.canonical_key) {
        const [alts, total] = await Promise.all([
          findAlternatives(med.canonical_key),
          countAlternatives(med.canonical_key),
        ]);
        setAlternatives(alts);
        setTotalCount(total);
      }
    } catch (err) {
      console.error('Failed to load results:', err);
    }
    setLoading(false);
  }

  const handleSave = (med: Medicine) => {
    const cheapestAlt = alternatives
      .filter((m) => m.id !== med.id && m.per_unit_price != null)
      .sort((a, b) => (a.per_unit_price ?? Infinity) - (b.per_unit_price ?? Infinity))[0];

    const saved: SavedMedicine = {
      id: med.id,
      name: med.name,
      salt_composition: med.salt_composition || '',
      canonical_key: med.canonical_key,
      per_unit_price: med.per_unit_price,
      cheapest_price: cheapestAlt?.per_unit_price ?? med.per_unit_price,
      added_at: new Date().toISOString(),
    };
    saveMedicine(saved);
  };

  const handlePharmacistCard = () => {
    if (!scannedMedicine) return;
    router.push({
      pathname: '/pharmacist-card',
      params: {
        salt: scannedMedicine.salt_composition || '',
        strength: '',
        form: scannedMedicine.dosage_form || '',
        brand: scannedMedicine.name,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.teal600} />
        <Text style={styles.loadingText}>Finding alternatives...</Text>
      </View>
    );
  }

  if (!scannedMedicine) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle" size={48} color={Colors.error} />
        <Text style={styles.errorText}>Medicine not found</Text>
      </View>
    );
  }

  // Check if NTI
  if (scannedMedicine.is_nti) {
    return (
      <View style={styles.container}>
        <View style={styles.pad}>
          <NTIWarning />
          <View style={styles.ntiMedCard}>
            <Text style={styles.ntiMedName}>{scannedMedicine.name}</Text>
            <Text style={styles.ntiMedSalt}>
              {scannedMedicine.salt_composition}
            </Text>
          </View>
          <Text style={styles.ntiNote}>
            SameSalt does not show alternatives for NTI drugs because even small
            differences between brands can affect how the drug works in your body.
            Please continue using your prescribed brand.
          </Text>
        </View>
      </View>
    );
  }

  // Already sorted by the DB query: Jan Aushadhi first, then per-unit price ascending.
  const allSorted = alternatives;

  return (
    <View style={styles.container}>
      <FlatList
        data={allSorted}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <SavingsHeader
              scannedPerUnit={scannedMedicine.per_unit_price}
              cheapestPerUnit={
                allSorted.length > 0
                  ? Math.min(
                      ...allSorted
                        .filter((m) => m.per_unit_price != null)
                        .map((m) => m.per_unit_price!)
                    )
                  : null
              }
              saltName={scannedMedicine.salt_composition || 'Unknown'}
              alternativesCount={totalCount}
            />

            {/* Pharmacist card CTA */}
            <TouchableOpacity
              style={styles.pharmacistBtn}
              onPress={handlePharmacistCard}
            >
              <Ionicons name="phone-portrait-outline" size={20} color={Colors.teal700} />
              <Text style={styles.pharmacistBtnText}>
                Show Pharmacist Card
              </Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.teal700} />
            </TouchableOpacity>
          </>
        }
        ListFooterComponent={
          <Text style={styles.footer}>
            Prices from {Config.DATASET_DATE} ·{' '}
            {totalCount > allSorted.length
              ? `showing ${allSorted.length} of ${totalCount} brands`
              : `${totalCount} brands found`}
          </Text>
        }
        renderItem={({ item, index }) => (
          <MedicineCard
            medicine={item}
            scannedPrice={scannedMedicine.per_unit_price}
            rank={index + 1}
            showSavings={item.id !== scannedMedicine.id}
            onPress={() =>
              router.push({
                pathname: '/pharmacist-card',
                params: {
                  salt: item.salt_composition || '',
                  strength: '',
                  form: item.dosage_form || '',
                  brand: item.name,
                },
              })
            }
            onSave={() => handleSave(item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14, color: Colors.textSecondary },
  errorText: { fontSize: 16, fontWeight: '600', color: Colors.error },
  pad: { padding: 16 },
  list: { padding: 16, paddingBottom: 100 },
  pharmacistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.teal50,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.teal200,
  },
  pharmacistBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.teal700,
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 16,
  },
  ntiMedCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ntiMedName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  ntiMedSalt: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  ntiNote: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
