# SameSalt

**Scan a medicine strip. See every brand with the identical salt, what each one costs today at Indian pharmacies, and the nearest government generic store.**

India sells the same molecule under hundreds of brand names. Paracetamol 650 mg alone has **532** brands in our database; pantoprazole 40 mg has **1,841**. Their printed prices differ by up to 97%, and on the same day the same strip of Dolo 650 cost **₹24.21 at PharmEasy and ₹32.28 at another online pharmacy**, 33% apart. Nobody at the counter tells you that.

SameSalt reads the strip, finds every brand with the *exact* same composition (salt, strength, dosage form and release type), then uses **SerpApi** to show what those brands actually cost right now, and where the nearest Jan Aushadhi Kendra is.

[Demo video](#demo) · [Download the Android APK](https://github.com/darshanrajagoli/samesalt/releases/latest) · [How SerpApi is used](#how-samesalt-uses-serpapi)

---

## What it does

1. **Scan or search.** Photograph a strip, pick a photo, or type a name. A vision model reads the brand and salt printed on it.
2. **Exact-composition match, offline.** A local SQLite database of **246,068 Indian medicines** is keyed by *sorted salts + strength + dosage form + release type*. Two brands match only if all four are identical, so a sustained-release tablet never matches a regular one.
3. **Today's prices, via SerpApi.** Two Google Shopping searches per medicine (the brand itself, and its salt) return live listings from 1mg, PharmEasy, Apollo 24|7, Truemeds, Netmeds, Amazon, blinkit and dozens more. Every listing is **verified against the composition database** before it's shown (see below).
4. **Government generics nearby, via SerpApi.** A Google Maps search for Jan Aushadhi Kendras (the government PMBJP generic pharmacies) around you, with distance, rating, opening hours and one-tap directions.
5. **Pharmacist card.** A full-screen card with the salt and form, plus "the most affordable one, please" in English and Hindi, to hand across the counter.
6. **Safety.** For narrow-therapeutic-index drugs (warfarin, thyroxine, lithium, phenytoin…) SameSalt refuses to suggest substitutes at all.

## How SameSalt uses SerpApi

| Engine | Query | Fields used | Why it matters |
|---|---|---|---|
| **Google Shopping** (`engine=google_shopping`, `gl=in`) | the brand, e.g. `dolo 650 tablet` | `shopping_results[]`: `title`, `source`, `extracted_price`, `product_link`, `delivery` | What *your* medicine costs today, and how much pharmacies disagree. The bundled dataset's prices are printed MRPs from 2022; this is the live market. |
| **Google Shopping** (`engine=google_shopping`, `gl=in`) | the salt, e.g. `paracetamol 650mg tablet` | same | Which *same-salt* brands are actually buyable online today. The cheapest brand in the 2022 data is often an obscure one nobody stocks. |
| **Google Maps** (`engine=google_maps`, `type=search`, `ll=@lat,lng,14z`) | `Jan Aushadhi Kendra` | `local_results[]`: `title`, `address`, `gps_coordinates`, `rating`, `open_state`, `phone` | The nearest government generic pharmacy, where the same salts sell far below branded prices. |

**Listings are verified, not trusted.** A Google Shopping search for "Dolo 650" also returns *Doxoril 650*, a different drug. SameSalt loads every brand that shares the medicine's canonical composition key from the local database (532 for paracetamol 650 mg) and accepts a listing only if its title contains one of those brand stems (`dolo 650`, `calpol 650`, `pacimol 650`, …). Imposters such as Doxoril, Doxiflo and Dolo Xtraa are dropped. Pack sizes are parsed from listing titles ("Strip of 15", "15's", "(15tab)"), so prices are compared **per tablet**, not per box.

**The API key never ships in the app.** All SerpApi calls go through a Cloudflare Worker (`worker/`) that holds the key as a secret and checks an app secret and a per-IP rate limit. Results are cached in Workers KV: fresh for 24 hours for prices and 7 days for stores, with store lookups bucketed to a ~1 km grid so neighbours share one search. If SerpApi is unreachable, the last good result is served and labelled "Cached, N h ago" rather than failing.

## Architecture

```
 Phone (React Native / Expo)                          Cloudflare Worker
 ┌───────────────────────────────┐                   ┌───────────────────────────────┐
 │ Scan ─ photo ───────────────────── POST /scan ───▶│ vision model (OpenRouter)     │
 │                               │                   │                               │
 │ SQLite: 246,068 medicines     │                   │ KV cache (24 h / 7 d,         │
 │  exact-composition match      │                   │   stale fallback)             │
 │                               │                   │                               │
 │ Live prices ─ brand + salt ─────── POST /prices ─▶│ SerpApi google_shopping gl=in │
 │  ◀─ listings, verified vs DB  │                   │                               │
 │ Stores ─ location ──────────────── POST /stores ─▶│ SerpApi google_maps           │
 └───────────────────────────────┘                   └───────────────────────────────┘
```

- `src/utils/match.ts`: pure listing-to-medicine matching (brand stems, strength guard, per-unit pricing).
- `src/utils/live.ts`: worker calls for prices and stores.
- `worker/src/serp.js`: SerpApi calls, response shaping, pack-size parsing, KV caching with stale fallback. `worker/test_serp.mjs` checks the shaping against a recorded response.
- `pipeline/`: Python build of the composition database from the Kaggle CSV (salt-name normalisation, unit standardisation, canonical keys, NTI flags).

## Try it

**Android:** install the APK from [Releases](https://github.com/darshanrajagoli/samesalt/releases/latest) (sideload; arm64 phones and x86_64 emulators). Tap a medicine under "Try one" on the home screen, or scan a strip.

**Build from source:**

```bash
npm install
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

**Worker:**

```bash
cd worker && npm install
npx wrangler kv namespace create PRICE_CACHE        # put the id in wrangler.toml
npx wrangler secret put SERPAPI_API_KEY
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put APP_SHARED_SECRET
npx wrangler deploy
node test_serp.mjs <recorded google_shopping response.json>
```

**Database:** download the Kaggle CSV to `pipeline/data/`, then `cd pipeline && pip install -r requirements.txt && python build_db.py`.

## Limitations

- Printed prices are MRPs from the November 2022 dataset. The live section is the current market, and both are labelled.
- Shopping listings are matched to brands by name. A listing whose title doesn't contain the brand and strength together (e.g. "Dolo Tablet (650mg)") is skipped rather than guessed at.
- Some listings don't state the pack size; those fall back to the pack size in the database.
- Jan Aushadhi results depend on what's listed on Google Maps near you.
- SameSalt is informational, not medical advice. Ask your doctor or pharmacist before switching brands.

## Demo

Demo video: *link added on upload*

## AI tools used

Built with **Claude Code** (Anthropic) for code, design and the demo video. In the product, a vision model (Google Gemini 2.5 Flash via OpenRouter) reads text from strip photos. All matching, verification and price arithmetic is deterministic code.

## License

App source code is MIT — see [LICENSE](LICENSE). The bundled database (`assets/samesalt.db`) is derived from a CC BY-SA 4.0 dataset — see [DATA_LICENSE.md](DATA_LICENSE.md).

## History

SameSalt was first built in September 2026 as an offline salt-matching app (search, scan, NTI safety, cabinet). The live SerpApi layer (online pharmacy prices, verified same-salt listings, the Jan Aushadhi store finder), the KV-cached worker endpoints and the redesign were built for the **SerpApi India Hackathon 2026**; see the commit history from October 2026.
