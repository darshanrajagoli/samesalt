import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { useDatabase } from '../../src/context/DatabaseContext';
import { useCabinet } from '../../src/context/CabinetContext';
import { searchByName, Medicine } from '../../src/utils/db';
import { formatPrice } from '../../src/utils/formatting';
import { Fonts, Glyph, Row, Section, T } from '../../src/components/ui';

const EXAMPLES = ['Dolo 650 Tablet', 'PAN 40 Tablet', 'Augmentin 625 Duo Tablet', 'Telma 40 Tablet'];

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

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const runSearch = useCallback(async (text: string) => {
    const mySeq = ++requestSeq.current;
    setSearching(true);
    try {
      const hits = await searchByName(text.trim());
      // A newer keystroke may have started a query that resolved first.
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
      debounceRef.current = setTimeout(() => runSearch(text), 250);
    },
    [runSearch]
  );

  const open = useCallback(
    (m: Medicine) => {
      Keyboard.dismiss();
      router.push({ pathname: '/results', params: { medicineId: m.id.toString() } });
    },
    [router]
  );

  const openExample = useCallback(
    async (name: string) => {
      const [hit] = await searchByName(name, 1);
      if (hit) open(hit);
    },
    [open]
  );

  if (error) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <T v="headline">Couldn't open the medicine database</T>
        <T v="footnote" color={Colors.secondaryLabel} style={{ marginTop: 6 }}>{error}</T>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.titleBlock}>
          <T v="largeTitle">SameSalt</T>
          <T v="subhead" color={Colors.secondaryLabel} style={{ marginTop: 2 }}>
            The same medicine, for less.
          </T>
        </View>

        <View style={styles.searchField}>
          <Ionicons name="search" size={17} color={Colors.secondaryLabel} />
          <TextInput
            style={styles.searchInput}
            placeholder="Medicine name"
            placeholderTextColor={Colors.secondaryLabel}
            value={query}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            editable={isReady}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => handleSearch('')} hitSlop={10}>
              <Ionicons name="close-circle" size={17} color={Colors.tertiaryLabel} />
            </Pressable>
          ) : null}
        </View>

        {!isReady ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.secondaryLabel} />
            <T v="footnote" color={Colors.secondaryLabel} style={{ marginTop: 8 }}>
              Preparing 246,068 medicines…
            </T>
          </View>
        ) : searching && !hasSearched ? (
          <ActivityIndicator color={Colors.secondaryLabel} style={{ marginTop: 24 }} />
        ) : hasSearched ? (
          results.length === 0 ? (
            <View style={styles.empty}>
              <T v="title3">No Results</T>
              <T v="subhead" color={Colors.secondaryLabel} align="center" style={{ marginTop: 6 }}>
                Check the spelling, or scan the strip instead.
              </T>
            </View>
          ) : (
            <Section>
              {results.map((m, i) => (
                <Row
                  key={m.id}
                  title={m.name}
                  subtitle={m.salt_composition || 'Composition not listed'}
                  value={formatPrice(m.price)}
                  chevron
                  onPress={() => open(m)}
                  last={i === results.length - 1}
                />
              ))}
            </Section>
          )
        ) : (
          <>
            <Pressable onPress={() => router.push('/(tabs)/scan')} style={({ pressed }) => [styles.scanCard, pressed && { opacity: 0.85 }]}>
              <View style={{ flex: 1 }}>
                <T v="title3" color={Colors.white}>Scan a strip</T>
                <T v="subhead" color="rgba(255,255,255,0.85)" style={{ marginTop: 4 }}>
                  Point the camera at any medicine. See every brand with the identical salt, and what it
                  costs today.
                </T>
              </View>
              <View style={styles.scanIcon}>
                <Ionicons name="scan" size={30} color={Colors.tint} />
              </View>
            </Pressable>

            {totalSavings > 0 ? (
              <Section header="Your savings">
                <Row
                  leading={<Glyph name="arrow-down" color={Colors.green} />}
                  title="By switching brands"
                  value={`${formatPrice(totalSavings)}/mo`}
                  valueColor={Colors.greenDeep}
                  last
                />
              </Section>
            ) : null}

            <Section header="Try one">
              {EXAMPLES.map((name, i) => (
                <Row
                  key={name}
                  title={name.replace(/\s+Tablet$/, '')}
                  chevron
                  onPress={() => openExample(name)}
                  last={i === EXAMPLES.length - 1}
                />
              ))}
            </Section>

            <Section>
              <Row
                leading={<Glyph name="information" color={Colors.secondaryLabel} />}
                title="How SameSalt works"
                chevron
                onPress={() => router.push('/settings')}
                last
              />
            </Section>

            <T v="footnote" color={Colors.secondaryLabel} align="center" style={{ marginHorizontal: 32 }}>
              246,068 Indian medicines, matched by exact composition. Search works offline.
            </T>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  titleBlock: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.fill,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 10,
    paddingHorizontal: 9,
    height: 38,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 17,
    color: Colors.label,
    paddingVertical: 0,
  },
  loading: { alignItems: 'center', marginTop: 40 },
  empty: { alignItems: 'center', marginTop: 56, paddingHorizontal: 40 },
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.tint,
    marginHorizontal: 16,
    marginBottom: 28,
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  scanIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
