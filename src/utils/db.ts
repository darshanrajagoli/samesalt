/**
 * SQLite database utilities for medicine lookups.
 */
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

export interface Medicine {
  id: number;
  name: string;
  manufacturer: string | null;
  salt_composition: string | null;
  canonical_key: string;
  price: number | null;
  pack_size: number | null;
  per_unit_price: number | null;
  dosage_form: string | null;
  release_type: string | null;
  is_nti: boolean;
  is_jan_aushadhi: boolean;
  composition_incomplete: boolean;
}

export interface SearchResult {
  medicine: Medicine;
  alternatives: Medicine[];
  cheapest: Medicine | null;
  savings_per_unit: number | null;
  savings_per_month: number | null;
}

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Copy the bundled database asset to a writable location and open it.
 */
export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  const dbName = 'samesalt.db';
  const dbPath = `${FileSystem.documentDirectory}SQLite/${dbName}`;

  // Ensure directory exists
  const dirInfo = await FileSystem.getInfoAsync(
    `${FileSystem.documentDirectory}SQLite`
  );
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(
      `${FileSystem.documentDirectory}SQLite`,
      { intermediates: true }
    );
  }

  // Copy asset if DB doesn't exist yet (or force refresh)
  const dbInfo = await FileSystem.getInfoAsync(dbPath);
  if (!dbInfo.exists) {
    const asset = Asset.fromModule(require('../../assets/samesalt.db'));
    await asset.downloadAsync();
    if (asset.localUri) {
      await FileSystem.copyAsync({ from: asset.localUri, to: dbPath });
    }
  }

  db = await SQLite.openDatabaseAsync(dbName);
  return db;
}

/**
 * Search medicines by brand name (fuzzy).
 */
export async function searchByName(
  query: string,
  limit = 20
): Promise<Medicine[]> {
  const database = await openDatabase();
  const results = await database.getAllAsync<Medicine>(
    `SELECT * FROM medicines
     WHERE name LIKE ? COLLATE NOCASE
     ORDER BY
       CASE WHEN name LIKE ? COLLATE NOCASE THEN 0 ELSE 1 END,
       name COLLATE NOCASE
     LIMIT ?`,
    [`%${query}%`, `${query}%`, limit]
  );
  return results.map(normalizeMedicine);
}

/**
 * Search medicines by salt composition text (fuzzy).
 */
export async function searchBySalt(
  query: string,
  limit = 20
): Promise<Medicine[]> {
  const database = await openDatabase();
  const results = await database.getAllAsync<Medicine>(
    `SELECT * FROM medicines
     WHERE salt_composition LIKE ? COLLATE NOCASE
     ORDER BY per_unit_price ASC NULLS LAST
     LIMIT ?`,
    [`%${query}%`, limit]
  );
  return results.map(normalizeMedicine);
}

/**
 * Find all medicines with the same canonical key (same salt composition).
 * Returns them sorted: Jan Aushadhi first, then by per-unit price ascending.
 */
const MAX_ALTERNATIVES = 50;

export async function findAlternatives(
  canonicalKey: string
): Promise<Medicine[]> {
  if (!canonicalKey) return [];

  const database = await openDatabase();
  const results = await database.getAllAsync<Medicine>(
    `SELECT * FROM medicines
     WHERE canonical_key = ?
       AND composition_incomplete = 0
     ORDER BY
       is_jan_aushadhi DESC,
       per_unit_price ASC NULLS LAST,
       name ASC
     LIMIT ?
    `,
    [canonicalKey, MAX_ALTERNATIVES]
  );
  return results.map(normalizeMedicine);
}

/**
 * Total count of medicines sharing a canonical key (for "showing N of TOTAL").
 */
export async function countAlternatives(canonicalKey: string): Promise<number> {
  if (!canonicalKey) return 0;
  const database = await openDatabase();
  const row = await database.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM medicines WHERE canonical_key = ? AND composition_incomplete = 0`,
    [canonicalKey]
  );
  return row?.c ?? 0;
}

/**
 * Get a single medicine by ID.
 */
export async function getMedicineById(id: number): Promise<Medicine | null> {
  const database = await openDatabase();
  const result = await database.getFirstAsync<Medicine>(
    'SELECT * FROM medicines WHERE id = ?',
    [id]
  );
  return result ? normalizeMedicine(result) : null;
}

/**
 * Get database metadata.
 */
export async function getMetadata(): Promise<Record<string, string>> {
  const database = await openDatabase();
  const rows = await database.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM metadata'
  );
  const meta: Record<string, string> = {};
  for (const row of rows) {
    meta[row.key] = row.value;
  }
  return meta;
}

/**
 * Build a full search result with alternatives and savings.
 */
export async function getSearchResult(
  medicine: Medicine
): Promise<SearchResult> {
  const alternatives = await findAlternatives(medicine.canonical_key);

  // Find cheapest alternative (excluding current medicine)
  const othersWithPrice = alternatives.filter(
    (m) => m.id !== medicine.id && m.per_unit_price != null
  );
  const cheapest =
    othersWithPrice.length > 0
      ? othersWithPrice.reduce((a, b) =>
          (a.per_unit_price ?? Infinity) < (b.per_unit_price ?? Infinity)
            ? a
            : b
        )
      : null;

  // Calculate savings
  let savingsPerUnit: number | null = null;
  let savingsPerMonth: number | null = null;

  if (
    medicine.per_unit_price != null &&
    cheapest?.per_unit_price != null &&
    medicine.per_unit_price > cheapest.per_unit_price
  ) {
    savingsPerUnit = medicine.per_unit_price - cheapest.per_unit_price;
    savingsPerMonth = savingsPerUnit * 30; // Assume 30 units/month
  }

  return {
    medicine,
    alternatives,
    cheapest,
    savings_per_unit: savingsPerUnit,
    savings_per_month: savingsPerMonth,
  };
}

/**
 * Normalize boolean fields from SQLite integers.
 */
function normalizeMedicine(row: any): Medicine {
  return {
    ...row,
    is_nti: row.is_nti === 1 || row.is_nti === true,
    is_jan_aushadhi: row.is_jan_aushadhi === 1 || row.is_jan_aushadhi === true,
    composition_incomplete:
      row.composition_incomplete === 1 || row.composition_incomplete === true,
  };
}
