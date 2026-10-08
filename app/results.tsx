import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { Config } from '../src/constants/config';
import { Medicine, findAlternatives, countAlternatives, getMedicineById } from '../src/utils/db';
import {
  LivePriceReport,
  Store,
  fetchLivePrices,
  fetchNearbyStores,
  timeAgo,
  isRecent,
} from '../src/utils/live';
import { formatDosageForm, formatPrice } from '../src/utils/formatting';
import { NTIWarning } from '../src/components/NTIWarning';
import { useCabinet } from '../src/context/CabinetContext';
import { SavedMedicine } from '../src/utils/storage';
import { Button, Card, Pill, Row, Section, T } from '../src/components/ui';

type Load<T> = { state: 'idle' | 'loading' | 'done' | 'error'; data?: T; error?: string };

const PRINTED_ROWS = 6;

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ medicineId: string; scannedBrand?: string }>();
  const { saveMedicine, activeProfile } = useCabinet();

  const [loading, setLoading] = useState(true);
  const [med, setMed] = useState<Medicine | null>(null);
  const [alternatives, setAlternatives] = useState<Medicine[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [live, setLive] = useState<Load<LivePriceReport>>({ state: 'idle' });
  const [stores, setStores] = useState<Load<{ stores: Store[]; fetchedAt: number }>>({
    state: 'idle',
  });

  useEffect(() => {
    (async () => {
      try {
        const m = await getMedicineById(Number(params.medicineId));
        setMed(m);
        if (m?.canonical_key) {
          const [alts, total] = await Promise.all([
            findAlternatives(m.canonical_key),
            countAlternatives(m.canonical_key),
          ]);
          setAlternatives(alts);
          setTotalCount(total);
        }
        if (m && !m.is_nti) loadLive(m);
      } catch (err) {
        console.error('Failed to load results:', err);
      }
      setLoading(false);
    })();
  }, []);

  const loadLive = useCallback(async (m: Medicine) => {
    setLive({ state: 'loading' });
    try {
      setLive({ state: 'done', data: await fetchLivePrices(m) });
    } catch (e: any) {
      setLive({ state: 'error', error: e?.message || 'Live prices unavailable' });
    }
  }, []);

  const findStores = useCallback(async () => {
    setStores({ state: 'loading' });
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setStores({ state: 'error', error: 'Location permission is needed to find stores near you.' });
        return;
      }
      const pos = await locate();
      const out = await fetchNearbyStores(pos.coords.latitude, pos.coords.longitude);
      setStores({ state: 'done', data: out });
    } catch (e: any) {
      setStores({ state: 'error', error: e?.message || 'Could not load nearby stores' });
    }
  }, []);

  // Printed-price savings (2022 MRP data). An isolated price far below the
  // rest of the same salt is more likely a unit/pack mismatch than a real
  // 90%+ markup, so it isn't advertised.
  const printed = useMemo(() => {
    const prices = alternatives
      .map((m) => m.per_unit_price)
      .filter((p): p is number => p != null)
      .sort((a, b) => a - b);
    const median = prices.length ? prices[Math.floor(prices.length / 2)] : null;
    const cheapest = prices.length ? prices[0] : null;
    const unverified = cheapest != null && median != null && median > 0 && cheapest < median / 10;
    const mine = med?.per_unit_price ?? null;
    const has = !unverified && mine != null && cheapest != null && mine > cheapest;
    return {
      pct: has ? Math.round(((mine! - cheapest!) / mine!) * 100) : 0,
      perMonth: has ? (mine! - cheapest!) * 30 : 0,
      unverified,
    };
  }, [alternatives, med]);

  const alreadySaved = med ? activeProfile.medicines.some((x) => x.id === med.id) : false;

  const handleSave = () => {
    if (!med) return;
    const cheapest = alternatives
      .filter((m) => m.id !== med.id && m.per_unit_price != null)
      .sort((a, b) => (a.per_unit_price ?? 0) - (b.per_unit_price ?? 0))[0];
    const saved: SavedMedicine = {
      id: med.id,
      name: med.name,
      salt_composition: med.salt_composition || '',
      canonical_key: med.canonical_key,
      per_unit_price: med.per_unit_price,
      cheapest_price: cheapest?.per_unit_price ?? med.per_unit_price,
      added_at: new Date().toISOString(),
    };
    saveMedicine(saved);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const openPharmacistCard = (m: Medicine) =>
    router.push({
      pathname: '/pharmacist-card',
      params: { salt: m.salt_composition || '', strength: '', form: m.dosage_form || '', brand: m.name },
    });

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: '' }} />
        <ActivityIndicator color={Colors.secondaryLabel} />
      </View>
    );
  }

  if (!med) {
    return (
      <View style={styles.center}>
        <T v="headline">Medicine not found</T>
      </View>
    );
  }

  if (med.is_nti) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: '' }} />
        <Header med={med} scannedBrand={params.scannedBrand} count={null} />
        <NTIWarning />
        <Section footer="SameSalt doesn't suggest substitutes for narrow-therapeutic-index drugs. Keep taking the brand your doctor prescribed.">
          <Row title={med.name} subtitle={med.salt_composition || undefined} last />
        </Section>
      </ScrollView>
    );
  }

  const printedRows = showAll ? alternatives : alternatives.slice(0, PRINTED_ROWS);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '' }} />
      <Header med={med} scannedBrand={params.scannedBrand} count={totalCount} />

      {/* Hero: the one number that matters */}
      {printed.pct > 0 ? (
        <Card style={styles.hero}>
          <T v="subhead" color={Colors.secondaryLabel}>
            Same salt, same strength, same form — up to
          </T>
          <View style={styles.heroRow}>
            <T style={styles.heroNumber} color={Colors.greenDeep}>
              {printed.pct}%
            </T>
            <T v="title3" color={Colors.greenDeep} style={{ marginLeft: 8, marginBottom: 10 }}>
              cheaper
            </T>
          </View>
          <T v="subhead" color={Colors.secondaryLabel}>
            {formatPrice(printed.perMonth)} a month less, at one a day · printed MRP
          </T>
        </Card>
      ) : printed.unverified ? (
        <Card style={styles.hero}>
          <T v="subhead" color={Colors.secondaryLabel}>
            Printed prices for this salt are inconsistent (pack-size mismatches), so no savings
            estimate is shown. Compare the live prices below.
          </T>
        </Card>
      ) : null}

      <LiveSection live={live} med={med} onRetry={() => loadLive(med)} />

      <StoresSection stores={stores} onFind={findStores} />

      <Section
        header={`All ${totalCount} identical brands`}
        footer={
          alternatives.length < totalCount
            ? `Printed MRP from ${Config.DATASET_DATE}. The ${alternatives.length} cheapest are listed.`
            : `Printed MRP from ${Config.DATASET_DATE}. Cheapest first.`
        }
      >
        {printedRows.map((m, i) => {
          const isYours = m.id === med.id;
          const pct =
            !isYours && med.per_unit_price && m.per_unit_price
              ? Math.round(((med.per_unit_price - m.per_unit_price) / med.per_unit_price) * 100)
              : 0;
          return (
            <Row
              key={m.id}
              title={m.name}
              subtitle={m.manufacturer || undefined}
              onPress={() => openPharmacistCard(m)}
              value={
                <View style={{ alignItems: 'flex-end' }}>
                  <T v="body" tabular>
                    {m.per_unit_price != null ? `₹${m.per_unit_price.toFixed(2)}` : '—'}
                  </T>
                  {isYours ? (
                    <T v="caption" color={Colors.tint}>Yours</T>
                  ) : pct > 0 ? (
                    <T v="caption" color={Colors.greenDeep}>{pct}% less</T>
                  ) : null}
                </View>
              }
              last={i === printedRows.length - 1 && (showAll || alternatives.length <= PRINTED_ROWS)}
            />
          );
        })}
        {!showAll && alternatives.length > PRINTED_ROWS ? (
          <Row
            title={<T v="body" color={Colors.tint}>Show {alternatives.length - PRINTED_ROWS} more{alternatives.length < totalCount ? ' of the cheapest' : ''}</T>}
            onPress={() => setShowAll(true)}
            last
          />
        ) : null}
      </Section>

      <View style={styles.actions}>
        <Button title="Show to pharmacist" icon="phone-portrait-outline" onPress={() => openPharmacistCard(med)} />
        <Button
          title={alreadySaved ? 'Saved to Cabinet' : 'Save to Cabinet'}
          icon={alreadySaved ? 'checkmark' : 'bookmark-outline'}
          kind="tinted"
          onPress={handleSave}
          disabled={alreadySaved}
          style={{ marginTop: 10 }}
        />
      </View>

      <T v="caption" color={Colors.secondaryLabel} align="center" style={styles.disclaimer}>
        Informational only, not medical advice. Ask your doctor or pharmacist before switching brands.
      </T>
    </ScrollView>
  );
}

function Header({
  med,
  scannedBrand,
  count,
}: {
  med: Medicine;
  scannedBrand?: string;
  count: number | null;
}) {
  return (
    <View style={styles.header}>
      {scannedBrand ? (
        <View style={styles.scannedTag}>
          <Ionicons name="scan" size={13} color={Colors.secondaryLabel} />
          <T v="footnote" color={Colors.secondaryLabel} style={{ marginLeft: 5 }}>
            Read from strip: {scannedBrand}
          </T>
        </View>
      ) : null}
      <T v="largeTitle" numberOfLines={2}>
        {med.name.replace(/\s+(Tablet|Capsule|Syrup|Injection|Suspension)s?$/i, '')}
      </T>
      <T v="subhead" color={Colors.secondaryLabel} style={{ marginTop: 4 }}>
        {med.salt_composition}
      </T>
      <View style={styles.pills}>
        {med.dosage_form ? <Pill label={formatDosageForm(med.dosage_form)} color={Colors.secondaryLabel} bg={Colors.fill} /> : null}
        {med.manufacturer ? <Pill label={med.manufacturer} color={Colors.secondaryLabel} bg={Colors.fill} /> : null}
        {count != null ? <Pill label={`${count} identical brands`} /> : null}
      </View>
    </View>
  );
}

function LiveSection({ live, med, onRetry }: { live: Load<LivePriceReport>; med: Medicine; onRetry: () => void }) {
  const r = live.data;
  const brand = med.name.replace(/\s+(Tablet|Capsule|Syrup|Injection|Suspension)s?$/i, '');
  const unit = (med.dosage_form || 'unit').toLowerCase() === 'tablet' ? 'tablet' : 'unit';

  if (live.state === 'loading' || live.state === 'idle') {
    return (
      <Section header="Today's prices online">
        <View style={styles.liveLoading}>
          <ActivityIndicator color={Colors.secondaryLabel} />
          <T v="subhead" color={Colors.secondaryLabel} style={{ marginLeft: 10 }}>
            Checking Indian pharmacies…
          </T>
        </View>
      </Section>
    );
  }
  if (live.state === 'error' || !r) {
    return (
      <Section header="Today's prices online" footer={live.error}>
        <Row title={<T v="body" color={Colors.tint}>Try again</T>} onPress={onRetry} last />
      </Section>
    );
  }

  const best = r.yours[0];
  const worst = r.yours[r.yours.length - 1];
  const spread =
    best?.perUnit && worst?.perUnit && worst.perUnit > best.perUnit
      ? Math.round(((worst.perUnit - best.perUnit) / best.perUnit) * 100)
      : 0;
  const twins = r.twins.slice(0, 5);
  const open = (url: string | null) => url && Linking.openURL(url);

  return (
    <>
      <Section
        header="Today's prices online"
        headerRight={
          <Pill
            label={r.stale ? `Cached ${timeAgo(r.fetchedAt)}` : isRecent(r.fetchedAt) ? 'Live' : `Updated ${timeAgo(r.fetchedAt)}`}
            color={r.stale ? Colors.orange : Colors.greenDeep}
            icon="pulse"
          />
        }
        footer={`${r.offersSeen} listings from ${r.sellers} sellers via Google Shopping. Prices refresh daily.`}
      >
        {best ? (
          <>
            <Row
              title={`Lowest price for ${brand}`}
              subtitle={`${best.seller} · ${formatPrice(best.price)}${best.units ? ` for ${best.units}` : ''}`}
              value={best.perUnit ? `₹${best.perUnit.toFixed(2)}/${unit}` : formatPrice(best.price)}
              valueColor={Colors.label}
              onPress={() => open(best.link)}
              chevron
            />
            {spread >= 10 ? (
              <Row
                title={
                  <T v="body">
                    Same strip, <T v="body" weight="semibold">{spread}% apart</T>
                  </T>
                }
                subtitle={`${r.yours.length} pharmacies sell ${brand}, from ${formatPrice(best.price)} at ${best.seller} to ${formatPrice(worst.price)} at ${worst.seller}.`}
                numberOfLines={1}
                last
              />
            ) : (
              <Row title={`${r.yours.length} pharmacies sell ${brand} online`} last />
            )}
          </>
        ) : (
          <Row title={`${brand} isn't listed online right now`} subtitle="Its same-salt twins are below." last />
        )}
      </Section>

      {twins.length > 0 ? (
        <Section
          header="Same salt, buyable today"
          footer="Each brand is checked against the composition database — only exact matches (salt, strength, form) are shown."
        >
          {twins.map((o, i) => {
            const cheaper = best?.perUnit && o.perUnit ? o.perUnit < best.perUnit : false;
            return (
              <Row
                key={`${o.medicine.id}-${o.seller}`}
                title={o.medicine.name.replace(/\s+(Tablet|Capsule)s?$/i, '')}
                subtitle={`${o.seller} · ${formatPrice(o.price)}${o.units ? ` for ${o.units}` : ''}`}
                value={
                  <View style={{ alignItems: 'flex-end' }}>
                    <T v="body" tabular color={cheaper ? Colors.greenDeep : Colors.label}>
                      {o.perUnit ? `₹${o.perUnit.toFixed(2)}` : formatPrice(o.price)}
                    </T>
                    <T v="caption" color={Colors.secondaryLabel}>
                      per {unit}
                    </T>
                  </View>
                }
                onPress={() => open(o.link)}
                chevron
                last={i === twins.length - 1}
              />
            );
          })}
        </Section>
      ) : null}
    </>
  );
}

/**
 * A position good enough for "stores within a few km": a recent cached fix if
 * there is one, else a network fix, else GPS. Each attempt is time-boxed so a
 * phone indoors (or without network location) never spins forever.
 */
async function locate(): Promise<Location.LocationObject> {
  const recent = await Location.getLastKnownPositionAsync({ maxAge: 15 * 60 * 1000 }).catch(() => null);
  if (recent) return recent;
  const within = <T,>(p: Promise<T>, ms: number) =>
    Promise.race([p, new Promise<never>((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);
  try {
    return await within(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 8000);
  } catch {
    try {
      return await within(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), 15000);
    } catch {
      const any = await Location.getLastKnownPositionAsync().catch(() => null);
      if (any) return any;
      throw new Error("Couldn't get your location. Check that location is turned on, then try again.");
    }
  }
}

function StoresSection({
  stores,
  onFind,
}: {
  stores: Load<{ stores: Store[]; fetchedAt: number }>;
  onFind: () => void;
}) {
  const header = 'Government generics near you';
  const footer =
    'Jan Aushadhi Kendras sell generic medicines under the government PMBJP scheme, typically far below branded prices. Store data via Google Maps.';

  if (stores.state === 'idle') {
    return (
      <Section header={header} footer={footer}>
        <Row
          title={<T v="body" color={Colors.tint}>Find Jan Aushadhi stores nearby</T>}
          trailing={<Ionicons name="location" size={18} color={Colors.tint} />}
          onPress={onFind}
          last
        />
      </Section>
    );
  }
  if (stores.state === 'loading') {
    return (
      <Section header={header}>
        <View style={styles.liveLoading}>
          <ActivityIndicator color={Colors.secondaryLabel} />
          <T v="subhead" color={Colors.secondaryLabel} style={{ marginLeft: 10 }}>
            Finding stores near you…
          </T>
        </View>
      </Section>
    );
  }
  if (stores.state === 'error' || !stores.data) {
    return (
      <Section header={header} footer={stores.error}>
        <Row title={<T v="body" color={Colors.tint}>Try again</T>} onPress={onFind} last />
      </Section>
    );
  }
  const list = stores.data.stores.slice(0, 3);
  if (list.length === 0) {
    return (
      <Section header={header} footer={footer}>
        <Row title="No Jan Aushadhi Kendra found nearby" last />
      </Section>
    );
  }
  return (
    <Section header={header} footer={footer}>
      {list.map((s, i) => (
        <Row
          key={`${s.name}-${s.lat}`}
          title={s.name}
          subtitle={[s.address, s.openState].filter(Boolean).join(' · ')}
          value={
            <View style={{ alignItems: 'flex-end' }}>
              <T v="body" tabular>
                {s.distanceKm < 1 ? `${Math.round(s.distanceKm * 1000)} m` : `${s.distanceKm.toFixed(1)} km`}
              </T>
              {s.rating ? (
                <T v="caption" color={Colors.secondaryLabel}>
                  ★ {s.rating.toFixed(1)}
                </T>
              ) : null}
            </View>
          }
          onPress={() =>
            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`)
          }
          chevron
          last={i === list.length - 1}
        />
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 },
  scannedTag: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  hero: { marginHorizontal: 16, marginBottom: 28, paddingVertical: 18 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 2 },
  heroNumber: { fontFamily: 'Inter_700Bold', fontSize: 64, lineHeight: 72, letterSpacing: -2.5 },
  liveLoading: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  actions: { marginHorizontal: 16, marginBottom: 16 },
  disclaimer: { marginHorizontal: 32, marginBottom: 12 },
});
