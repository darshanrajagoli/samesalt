# SameSalt Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User's Phone                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              React Native (Expo) App                 │   │
│  │                                                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │  Camera   │  │  Search  │  │  Medicine Cabinet │  │   │
│  │  │  (Scan)   │  │  (Text)  │  │  (AsyncStorage)  │  │   │
│  │  └────┬─────┘  └────┬─────┘  └──────────────────┘  │   │
│  │       │              │                               │   │
│  │       │              ▼                               │   │
│  │       │     ┌─────────────────┐                     │   │
│  │       │     │   SQLite DB     │ ◀── Built by        │   │
│  │       │     │  (250K+ meds)   │     Python pipeline │   │
│  │       │     └─────────────────┘                     │   │
│  │       │                                              │   │
│  │       │     ┌─────────────────┐                     │   │
│  │       │     │   RevenueCat    │ ◀── Subscriptions   │   │
│  │       │     │   SDK           │     (anonymous ID)  │   │
│  │       │     └─────────────────┘                     │   │
│  └───────┼──────────────────────────────────────────────┘   │
│          │                                                   │
└──────────┼───────────────────────────────────────────────────┘
           │
           ▼ HTTPS (photo)
┌──────────────────────┐        ┌────────────────────┐
│  Cloudflare Worker   │──────▶ │   OpenRouter API   │
│  (scan proxy)        │◀────── │   (Gemini Flash)   │
│  Keeps API key safe  │        └────────────────────┘
└──────────────────────┘
```

## Data Flow

### 1. Database Pipeline (offline, one-time)

```
Kaggle CSV ──▶ normalize.py ──▶ build_db.py ──▶ samesalt.db
  250K+          - Normalize salts        - Create tables
  medicines      - Standardize units      - Index canonical keys
                 - Sort alphabetically    - Flag NTI drugs
                 - Tag release type       - Compute per-unit price
```

The pipeline produces a ~65MB SQLite database that ships inside the app bundle.
No server is needed for lookups — all queries run locally.

### 2. Scan Flow (AI-powered, online)

```
Camera ──▶ Base64 ──▶ Worker ──▶ OpenRouter ──▶ Structured JSON
                       (proxy)    (Gemini)      {brand, salt, strength}
                                                       │
                                                       ▼
                                              Local DB lookup
                                              (by name or salt)
                                                       │
                                                       ▼
                                              Results screen
```

### 3. Search Flow (offline)

```
Text input ──▶ SQLite LIKE query ──▶ Results ──▶ Alternatives
                (by brand name)                   (by canonical key)
```

### 4. Matching Logic

Two medicines match if and only if they share the same **canonical key**.

A canonical key is built from:
1. Sorted salt names (alphabetical, normalized spelling)
2. Standardized strengths (all converted to mg)
3. Dosage form (tablet, capsule, syrup, etc.)
4. Release type (SR, XR, CR, etc.)

Example:
- "Augmentin 625" = `amoxicillin:500mg+clavulanic acid:125mg|tablet`
- "Moxikind CV 625" = `amoxicillin:500mg+clavulanic acid:125mg|tablet`
- Same key → shown as alternatives

Mismatches that are correctly rejected:
- Different strengths: Amlodipine 5mg ≠ Amlodipine 10mg
- Different release types: Metformin SR ≠ Metformin (regular)
- Different forms: Paracetamol tablet ≠ Paracetamol syrup

## State Management

| State | Storage | Scope |
|-------|---------|-------|
| Medicine DB | expo-sqlite (bundled asset) | Read-only, all users |
| Medicine cabinet | AsyncStorage | Per-device, all profiles |
| Family profiles | AsyncStorage | Per-device |
| Subscription status | RevenueCat SDK | Synced via RevenueCat |
| Refill reminders | expo-notifications | Per-device |
| Scan results | In-memory (React state) | Per-session |

## RevenueCat Integration

### Entitlement: `family`
- Unlocked by purchasing either the monthly or annual package
- Gates: multiple profiles, refill reminders, monthly savings summary

### Offerings: `default`
- `$rc_monthly` → ₹99/month
- `$rc_annual` → ₹799/year (7-day free trial)

### Paywall trigger
The paywall appears ONLY when:
1. User tries to add a second family profile, OR
2. User tries to set a refill reminder

It NEVER appears on app launch or during normal search/scan.

### Test Store
For hackathon demo, RevenueCat Test Store is used:
- No Apple/Google developer account needed
- Purchases simulated in the app
- Full SDK integration demonstrated

## NTI Drug Safety

Narrow Therapeutic Index drugs have a small margin between therapeutic and toxic doses.
Switching brands can cause clinically significant differences.

When an NTI drug is detected:
1. The results screen shows a red warning banner
2. No alternatives are displayed
3. The user is told to continue their prescribed brand
4. The user is told to consult their doctor

NTI drugs in the database: Warfarin, Acenocoumarol, Phenytoin, Fosphenytoin,
Lithium, Levothyroxine, Liothyronine, Cyclosporine, Digoxin, Carbamazepine,
Valproic Acid, Divalproex, Theophylline, Tacrolimus, Sirolimus, Everolimus,
Mycophenolate, Clonidine, Procainamide, Disopyramide, Quinidine.

Matching is done by substring against the normalized salt name (not exact-set
membership), because the source dataset spells the same active many
different ways — e.g. Levothyroxine appears in the CSV as "Thyroxine". See
`pipeline/normalize.py::is_nti`.

## Privacy

- No user accounts or authentication
- No server-side storage of any user data
- No analytics or tracking SDKs
- RevenueCat uses anonymous IDs (auto-generated on device)
- All medicine cabinet data is in AsyncStorage on the device
- The Cloudflare Worker only processes images in transit (no storage)
