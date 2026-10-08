/**
 * SerpApi calls and response shaping for the SameSalt worker.
 *
 * Two engines:
 *   google_shopping (gl=in) — what a medicine costs today at Indian online
 *     pharmacies. The bundled database's prices are printed MRPs from 2022;
 *     this is the live market.
 *   google_maps — Jan Aushadhi Kendras (government generic pharmacies) near
 *     the user, where the same salts sell at a fraction of branded prices.
 *
 * Responses are cached in KV. A search result is "fresh" for FRESH_MS; after
 * that it's refreshed, but the stale copy is kept and served if SerpApi
 * fails (quota, outage), labelled with its real fetch time.
 */

const SERPAPI = "https://serpapi.com/search.json";
const SHOP_FRESH_MS = 24 * 60 * 60 * 1000;
const STORES_FRESH_MS = 7 * 24 * 60 * 60 * 1000;

export function shopCacheKey(query) {
  return "shop:" + normalizeQuery(query);
}

export function storesCacheKey(lat, lng) {
  // ~1 km grid: nearby users share one lookup.
  return `stores:${lat.toFixed(2)},${lng.toFixed(2)}`;
}

export function normalizeQuery(q) {
  return String(q || "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Shape google_shopping results into the fields the app uses. */
export function shapeShopping(raw) {
  const results = raw?.shopping_results || [];
  return results
    .filter((r) => typeof r.extracted_price === "number" && r.title && r.source)
    .map((r) => ({
      title: r.title,
      seller: cleanSeller(r.source),
      price: r.extracted_price,
      packCount: parsePackCount(r.title),
      link: r.product_link || null,
      delivery: r.delivery || null,
      rating: r.rating ?? null,
      reviews: r.reviews ?? null,
    }));
}

function cleanSeller(source) {
  return String(source).replace(/\.(com|in)$/i, "").replace(/^www\./i, "");
}

/**
 * Units in the pack, when the listing says so: "Strip Of 15 Tablets",
 * "15's", "15 Tablets", "(15tab)", "Pack-15". Never the strength ("650mg").
 */
export function parsePackCount(title) {
  const t = String(title || "");
  const patterns = [
    /strip\s+of\s+(\d{1,3})\b/i,
    /pack\s*[-of]*\s*(\d{1,3})\b/i,
    /\b(\d{1,3})\s*['’]?s\b/i,
    /\b(\d{1,3})\s*(?:tablets?|tabs?|capsules?|caps?)\b/i,
    /\((\d{1,3})\s*tab\)/i,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      const n = Number(m[1]);
      if (n >= 2 && n <= 200) return n;
    }
  }
  return null;
}

/** Shape google_maps local results (Jan Aushadhi Kendras). */
export function shapeStores(raw, lat, lng) {
  const results = raw?.local_results || [];
  return results
    .filter((r) => r.gps_coordinates && /jan\s*aushadhi|pmbj|janaushadhi/i.test(r.title || ""))
    .map((r) => ({
      name: r.title,
      address: r.address || null,
      rating: r.rating ?? null,
      reviews: r.reviews ?? null,
      openState: r.open_state || null,
      phone: r.phone || null,
      lat: r.gps_coordinates.latitude,
      lng: r.gps_coordinates.longitude,
      distanceKm: haversineKm(lat, lng, r.gps_coordinates.latitude, r.gps_coordinates.longitude),
      placeId: r.place_id || null,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10;
}

async function serpapi(params, env) {
  const url = new URL(SERPAPI);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("api_key", env.SERPAPI_API_KEY);
  const res = await fetch(url.toString());
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    throw new Error(body.error || `SerpApi HTTP ${res.status}`);
  }
  return body;
}

/**
 * Cached lookup: serve fresh cache, else call SerpApi, else fall back to a
 * stale copy. Returns { data, fetchedAt, source: "live" | "cache" | "stale" }.
 */
async function cached(env, key, freshMs, fetcher) {
  const hit = await env.PRICE_CACHE.get(key, "json");
  if (hit && Date.now() - hit.fetchedAt < freshMs) {
    return { data: hit.data, fetchedAt: hit.fetchedAt, source: "cache" };
  }
  try {
    const data = await fetcher();
    const entry = { data, fetchedAt: Date.now() };
    await env.PRICE_CACHE.put(key, JSON.stringify(entry));
    return { ...entry, source: "live" };
  } catch (err) {
    if (hit) return { data: hit.data, fetchedAt: hit.fetchedAt, source: "stale" };
    throw err;
  }
}

export async function livePrices(env, query) {
  const q = normalizeQuery(query);
  return cached(env, shopCacheKey(q), SHOP_FRESH_MS, async () =>
    shapeShopping(await serpapi({ engine: "google_shopping", q, gl: "in", hl: "en" }, env))
  );
}

export async function nearbyStores(env, lat, lng) {
  const key = storesCacheKey(lat, lng);
  const out = await cached(env, key, STORES_FRESH_MS, async () => {
    const raw = await serpapi(
      {
        engine: "google_maps",
        type: "search",
        q: "Jan Aushadhi Kendra",
        ll: `@${lat.toFixed(4)},${lng.toFixed(4)},14z`,
        hl: "en",
        gl: "in",
      },
      env
    );
    return shapeStores(raw, lat, lng);
  });
  // The cache is shared across a ~1 km cell; distances are per-user.
  out.data = out.data
    .map((s) => ({ ...s, distanceKm: haversineKm(lat, lng, s.lat, s.lng) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
  return out;
}
