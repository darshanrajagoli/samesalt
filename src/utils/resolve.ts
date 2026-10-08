/**
 * Turn what the vision model read off a strip ("DOLO-650", "Paracetamol 650mg")
 * into one medicine from the database.
 *
 * Strips print brands in every style: hyphens, no spaces, all caps. A plain
 * LIKE on the raw text misses most of them, and falling straight back to a
 * salt search would land on whichever same-salt brand happens to be cheapest,
 * which is not the medicine the user is holding.
 */
import { Medicine, searchByName, searchByNamePrefix, searchBySalt } from './db';

const uniq = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter((x) => x.length >= 2))];

/** Spellings of a printed brand worth trying against the database. */
export function brandVariants(raw: string): string[] {
  const spaced = raw.replace(/[-_./]+/g, ' ').replace(/\s+/g, ' ').trim();
  const split = spaced.replace(/([a-z])(\d)/gi, '$1 $2').replace(/(\d)([a-z]{3,})/gi, '$1 $2');
  return uniq([raw, spaced, split, spaced.replace(/\s+/g, '')]);
}

const numbers = (s: string): string[] => s.match(/\d+(?:\.\d+)?/g) ?? [];
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** Best match first: same brand word, same strength, same salt. */
export function rankCandidates(cands: Medicine[], brand: string, salt: string): Medicine[] {
  const brandWord = words(brand).find((w) => /^[a-z]{2,}$/.test(w)) ?? '';
  const brandNums = numbers(brand);
  const saltWord = words(salt).find((w) => /^[a-z]{4,}$/.test(w)) ?? '';
  const saltNums = numbers(salt);

  const score = (m: Medicine) => {
    const name = m.name.toLowerCase();
    const comp = (m.salt_composition || '').toLowerCase();
    const nameNums = numbers(name);
    const compNums = numbers(comp);
    let s = 0;
    if (brandWord && words(name)[0] === brandWord) s += 4;
    else if (brandWord && name.includes(brandWord)) s += 1;
    if (brandNums.length && brandNums.every((n) => nameNums.includes(n) || compNums.includes(n))) s += 3;
    if (saltWord && comp.includes(saltWord)) s += 2;
    if (saltNums.length && saltNums.every((n) => compNums.includes(n))) s += 1;
    if (/\btablet\b/.test(name)) s += 0.5; // the common case, all else equal
    return s;
  };

  return cands
    .map((m) => ({ m, s: score(m) }))
    .sort((a, b) => b.s - a.s || a.m.name.length - b.m.name.length)
    .map((x) => x.m);
}

export async function resolveScan(brand: string | null, salt: string | null): Promise<Medicine | null> {
  const b = (brand || '').trim();
  const s = (salt || '').trim();
  const byId = new Map<number, Medicine>();
  const add = (ms: Medicine[]) => ms.forEach((m) => byId.set(m.id, m));

  if (b) {
    // Indexed prefix lookups first; a full-table contains-search only if they miss.
    const variants = brandVariants(b);
    for (const v of variants) add(await searchByNamePrefix(v, 30));
    if (byId.size === 0) {
      // "DOLO-650 TABLETS IP" → try just the brand word, let strength pick.
      const word = words(b).find((w) => /^[a-z]{3,}$/.test(w));
      if (word) add(await searchByNamePrefix(word, 80));
    }
    if (byId.size === 0) add(await searchByName(b.replace(/[-_./]+/g, ' ').replace(/\s+/g, ' '), 30));
  }
  if (byId.size === 0 && s) add(await searchBySalt(s, 20));
  if (byId.size === 0 && s) {
    // The database writes "Metformin (500mg)"; the strip says "Metformin 500mg".
    const word = words(s).find((w) => /^[a-z]{4,}$/.test(w));
    if (word) add(await searchBySalt(word, 80));
  }
  if (byId.size === 0) return null;

  const ranked = rankCandidates([...byId.values()], b, s);
  return ranked[0] ?? null;
}
