/**
 * Pure matching of shopping listings to local medicines (no I/O), split out
 * of live.ts so it can be tested outside the app.
 */
import type { Medicine } from './db';

export interface Offer {
  title: string;
  seller: string;
  price: number;
  packCount: number | null;
  link: string | null;
  delivery: string | null;
}

export interface MatchedOffer extends Offer {
  medicine: Pick<Medicine, 'id' | 'name' | 'pack_size' | 'manufacturer'>;
  units: number | null;
  perUnit: number | null;
}

// ── Name normalisation ──────────────────────────────────────────────────

const FORM_WORDS = new Set([
  'tablet', 'tablets', 'tab', 'tabs', 'capsule', 'capsules', 'cap', 'caps', 'syrup',
  'suspension', 'injection', 'inj', 'strip', 'drops', 'drop', 'gel', 'cream', 'ointment',
  'solution', 'sachet', 'powder', 'spray', 'inhaler', 'lotion', 'oral', 'kid', 'kids',
]);
const NOISE = new Set(['buy', 'online', 'mg', 'mcg', 'ml', 'gm', 'g', 'of', 'the', 'and']);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/(\d)\s*(mg|mcg|ml|gm|g)\b/g, '$1')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((t) => t && !NOISE.has(t));
}

/** "Dolo 650 Tablet" → "dolo 650"; "Augmentin 625 Duo Tablet" → "augmentin 625 duo". */
export function stemOf(name: string): string {
  const out: string[] = [];
  for (const t of tokens(name)) {
    if (FORM_WORDS.has(t)) break;
    out.push(t);
  }
  return out.join(' ');
}

function strengthNumbers(salt: string | null): string[] {
  return (salt || '').match(/\d+(?:\.\d+)?/g) ?? [];
}

const FORM_FOR_QUERY: Record<string, string> = {
  tablet: 'tablet',
  capsule: 'capsule',
  syrup: 'syrup',
  suspension: 'suspension',
  injection: 'injection',
};

/** The two searches for a medicine: the brand itself, and its salt. */
export function liveQueries(med: Medicine): string[] {
  const form = FORM_FOR_QUERY[(med.dosage_form || '').toLowerCase()] ?? '';
  const brand = `${stemOf(med.name)} ${form}`.trim();
  const salt = `${(med.salt_composition || '')
    .replace(/[()+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} ${form}`
    .toLowerCase()
    .trim();
  return [brand, salt].filter((q, i, a) => q.length > 2 && a.indexOf(q) === i);
}

// ── Matching ────────────────────────────────────────────────────────────

/**
 * Match shopping listings to same-composition brands from the local DB.
 * Longest stem wins ("dolo 650" over "dolo"); a stem without its own
 * strength number only counts if the listing title carries the salt's
 * strength, so "Crocin" can't match a different-strength Crocin listing.
 */
export function matchOffers(
  offers: Offer[],
  scanned: Medicine,
  sameSalt: Pick<Medicine, 'id' | 'name' | 'pack_size' | 'manufacturer'>[]
): { yours: MatchedOffer[]; twins: MatchedOffer[] } {
  const scannedStem = stemOf(scanned.name);
  const strengths = strengthNumbers(scanned.salt_composition);
  const stems = sameSalt
    .map((m) => ({ stem: stemOf(m.name), med: m }))
    .filter((s) => s.stem.length >= 3)
    .sort((a, b) => b.stem.length - a.stem.length);

  const yours: MatchedOffer[] = [];
  const twins: MatchedOffer[] = [];
  const seen = new Set<string>();

  for (const offer of offers) {
    const dedupe = `${offer.seller}|${offer.title}|${offer.price}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);

    const title = ` ${tokens(offer.title).join(' ')} `;
    const hit = stems.find(({ stem }) => {
      if (!title.includes(` ${stem} `)) return false;
      if (/\d/.test(stem)) return true;
      return strengths.length > 0 && strengths.every((n) => title.includes(` ${n} `));
    });
    if (!hit) continue;

    const units = offer.packCount ?? hit.med.pack_size ?? null;
    const matched: MatchedOffer = {
      ...offer,
      medicine: hit.med,
      units,
      perUnit: units ? offer.price / units : null,
    };
    (hit.stem === scannedStem ? yours : twins).push(matched);
  }

  const byUnit = (a: MatchedOffer, b: MatchedOffer) =>
    (a.perUnit ?? Infinity) - (b.perUnit ?? Infinity);
  yours.sort(byUnit);

  // One row per alternative brand: its cheapest listing.
  const bestPerBrand = new Map<number, MatchedOffer>();
  for (const o of twins) {
    const cur = bestPerBrand.get(o.medicine.id);
    if (!cur || byUnit(o, cur) < 0) bestPerBrand.set(o.medicine.id, o);
  }
  return { yours, twins: [...bestPerBrand.values()].sort(byUnit) };
}
