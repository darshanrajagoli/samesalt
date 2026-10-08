/**
 * Live market data via the worker (SerpApi):
 *   - today's prices at Indian online pharmacies (google_shopping)
 *   - nearby Jan Aushadhi Kendras (google_maps)
 *
 * Shopping listings are matched back to the local database, so a listing is
 * only shown as an alternative when its brand is a known medicine with the
 * *identical* canonical composition (salt + strength + form + release). A
 * search for "Dolo 650" also returns Doxoril 650 — a different drug — and
 * that must never be presented as interchangeable.
 */
import { Config } from '../constants/config';
import { Medicine, brandsWithKey } from './db';
import { MatchedOffer, Offer, liveQueries, matchOffers } from './match';

export type { MatchedOffer, Offer };

export interface LivePriceReport {
  yours: MatchedOffer[]; // offers for the brand the user has, cheapest first
  twins: MatchedOffer[]; // cheapest offer per verified same-salt brand
  offersSeen: number;
  sellers: number;
  fetchedAt: number | null;
  stale: boolean;
}

export interface Store {
  name: string;
  address: string | null;
  rating: number | null;
  reviews: number | null;
  openState: string | null;
  phone: string | null;
  lat: number;
  lng: number;
  distanceKm: number;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(`${Config.SCAN_WORKER_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-App-Secret': Config.SCAN_WORKER_SECRET },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !(json as any).success) {
      throw new Error((json as any).error || `Request failed (${res.status})`);
    }
    return json as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchLivePrices(med: Medicine): Promise<LivePriceReport> {
  const queries = liveQueries(med);
  const [resp, sameSalt] = await Promise.all([
    post<{ results: { ok: boolean; data?: Offer[]; fetchedAt?: number; source?: string }[] }>(
      '/prices',
      { queries }
    ),
    brandsWithKey(med.canonical_key),
  ]);
  const ok = resp.results.filter((r) => r.ok && r.data);
  if (ok.length === 0) throw new Error('Live prices are unavailable right now');
  const offers = ok.flatMap((r) => r.data!);
  const { yours, twins } = matchOffers(offers, med, sameSalt);
  return {
    yours,
    twins,
    offersSeen: offers.length,
    sellers: new Set(offers.map((o) => o.seller.toLowerCase())).size,
    fetchedAt: Math.min(...ok.map((r) => r.fetchedAt ?? Date.now())),
    stale: ok.some((r) => r.source === 'stale'),
  };
}

export async function fetchNearbyStores(lat: number, lng: number) {
  const resp = await post<{ data: Store[]; fetchedAt: number; source: string }>('/stores', { lat, lng });
  return { stores: resp.data, fetchedAt: resp.fetchedAt, stale: resp.source === 'stale' };
}

export function timeAgo(ts: number | null): string {
  if (!ts) return '';
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}
