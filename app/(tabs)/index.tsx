import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { useDatabase } from '../../src/context/DatabaseContext';
import { useCabinet } from '../../src/context/CabinetContext';
import { searchByName, Medicine } from '../../src/utils/db';
import { formatPrice } from '../../src/utils/formatting';
import { Config } from '../../src/constants/config';

export default function HomeScreen() {
  const router = useRouter();
  const { isReady, error } = useDatabase();
  const { totalSavings } = useCabinet();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Medicine[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const runSearch = useCallback(async (text: string) => {
    const mySeq = ++requestSeq.current;
    setSearching(true);
    try {
      const hits = await searchByName(text.trim());
      // A newer keystroke may have started a query that resolved first —
      // ignore this response if it's no longer the latest one in flight.
      if (mySeq !== requestSeq.current) return;
      setResults(hits);
      setHasSearched(true);
    } catch (err) {
      console.error('Search error:', err);
    }
    if (mySeq === requestSeq.current) setSearching(false);
  }, []);

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (text.trim().length < 2) {
        requestSeq.current++; // invalidate any in-flight search
        setResults([]);
        setHasSearched(false);
        setSearching(false);
        return;
      }

      debounceRef.current = setTimeout(() => {
        runSearch(text);
      }, 250);
    },
    [runSearch]
  );

  const handleSelectMedicine = useCallback(
    (medicine: Medicine) => {
      router.push({
        pathname: '/results',
        params: {
          medicineId: medicine.id.toString(),
          canonicalKey: medicine.canonical_key,
          name: medicine.name,
        },
      });
    },
    [router]
  );

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle" size={48} color={Colors.error} />
        <Text style={styles.errorText}>Failed to load medicine database</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Hero section */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>💊 SameSalt</Text>
        <Text style={styles.heroSubtitle}>
          Find cheaper medicines with the exact same salt
        </Text>

        {totalSavings > 0 && (
          <View style={styles.savingsChip}>
            <Ionicons name="trending-down" size={16} color={Colors.success} />
            <Text style={styles.savingsChipText}>
              {formatPrice(totalSavings)}/month saved
            </Text>
          </View>
        )}
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color={Colors.gray400}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by medicine name..."
          placeholderTextColor={Colors.gray400}
          value={query}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          editable={isReady}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => handleSearch('')}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={20} color={Colors.gray400} />
          </TouchableOpacity>
        )}
      </View>

      {!isReady && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.teal600} />
          <Text style={styles.loadingText}>Loading medicine database...</Text>
        </View>
      )}

      {/* Quick actions (when not searching) */}
      {!hasSearched && isReady && (
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/scan')}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.teal100 }]}>
              <Ionicons name="camera" size={28} color={Colors.teal700} />
            </View>
            <Text style={styles.actionTitle}>Scan Strip</Text>
            <Text style={styles.actionDesc}>
              Point camera at any medicine strip
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/settings')}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.amber100 }]}>
              <Ionicons name="information-circle" size={28} color={Colors.amber600} />
            </View>
            <Text style={styles.actionTitle}>About</Text>
            <Text style={styles.actionDesc}>
              How SameSalt works
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search results */}
      {searching && (
        <ActivityIndicator
          style={styles.spinner}
          size="small"
          color={Colors.teal600}
        />
      )}

      {hasSearched && !searching && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.resultsList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={40} color={Colors.gray300} />
              <Text style={styles.emptyText}>No medicines found</Text>
              <Text style={styles.emptyHint}>
                Try a different spelling or use the camera scan
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => handleSelectMedicine(item)}
            >
              <View style={styles.resultInfo}>
                <Text style={styles.resultName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.resultSalt} numberOfLines={1}>
                  {item.salt_composition || 'No composition data'}
                </Text>
              </View>
              <View style={styles.resultPrice}>
                <Text style={styles.resultPriceText}>
                  {formatPrice(item.price)}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={Colors.gray400}
                />
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Dataset date */}
      <Text style={styles.datasetDate}>
        Database: {Config.DATASET_DATE}
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 16, fontWeight: '600', color: Colors.error, marginTop: 12 },
  errorDetail: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  hero: { padding: 20, paddingTop: 12, paddingBottom: 4 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: Colors.teal800 },
  heroSubtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4 },
  savingsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
    gap: 6,
  },
  savingsChipText: { fontSize: 13, fontWeight: '600', color: Colors.success },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 48,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    height: '100%',
  },
  loadingContainer: { alignItems: 'center', marginTop: 40, gap: 12 },
  loadingText: { fontSize: 14, color: Colors.textSecondary },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 8,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  actionDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  spinner: { marginTop: 20 },
  resultsList: { paddingHorizontal: 16, paddingBottom: 100 },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  resultSalt: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  resultPrice: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultPriceText: { fontSize: 14, fontWeight: '600', color: Colors.teal700 },
  emptyState: { alignItems: 'center', marginTop: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  emptyHint: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  datasetDate: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingBottom: 8,
  },
});
