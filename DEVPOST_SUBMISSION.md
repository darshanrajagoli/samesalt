# SameSalt — Devpost Submission Text

Copy-paste these directly into the Devpost submission form at https://revenuecat-shipaton-2026.devpost.com/

---

## Elevator pitch (one line)

Scan any medicine strip → find every chemically identical alternative, sorted cheapest first.

---

## What it does

SameSalt is a React Native app built for India, where the same drug is sold under
dozens of brand names at wildly different prices — and most people have no way to
know which brands are actually interchangeable. Point the camera at any medicine
strip (or type the brand name) and SameSalt instantly shows every other brand with
the *exact same salt composition, strength, and dosage form*, sorted cheapest
first by real per-unit price. The app also has logic to surface government
Jan Aushadhi generics first when present — the current dataset doesn't
contain verified Jan Aushadhi listings, so this activates once that data is added.

It runs entirely offline for lookups, using a local database of 246,000+
medicines built from a public Indian drug pricing dataset. For narrow therapeutic
index drugs (Warfarin, Digoxin, Lithium, etc.) — where switching brands can be
medically dangerous — SameSalt refuses to suggest alternatives at all and tells
the user to consult their doctor.

The free tier is unlimited for a single person. SameSalt Family (₹99/month or
₹799/year with a 7-day trial), powered end-to-end by RevenueCat, unlocks up to
6 family profiles, refill reminders, and a monthly savings summary — the
paywall only appears when you actually try to add a second person, never on
launch.

## How we built it

- **React Native + Expo** (development build, not Expo Go — RevenueCat requires
  native modules) with file-based routing via Expo Router.
- **Data pipeline**: a Python script (`pipeline/build_db.py`) processes the
  Kaggle "A-Z Medicine Dataset of India" (250K+ rows) into a SQLite database
  bundled with the app. It normalizes salt name spelling variants
  (Amoxycillin → Amoxicillin), standardizes strength units (0.5g → 500mg),
  builds a canonical sorted-salt key so two brands only match if they share
  the *identical* formula, strength, dosage form, and release type (so a
  sustained-release tablet never matches a regular one), and flags narrow
  therapeutic index drugs for the safety warning.
- **Scan feature**: a photo is sent to a Cloudflare Worker, which proxies the
  request to a vision-language model via OpenRouter (Google Gemini Flash).
  This keeps the API key server-side — it never ships inside the app bundle.
- **RevenueCat**: entitlements, offerings, packages, purchase flow, restore,
  and paywall gating — using anonymous device IDs, so there's no login or
  account system anywhere in the app. The paywall itself is a hand-built
  screen (so it can show a dynamic "you've already saved ₹X/month" callout
  and the actual family features) that calls RevenueCat's core purchase
  APIs directly for the transaction and entitlement check.
- **expo-sqlite** for all local medicine lookups (fully offline, no server
  round-trip for search), **AsyncStorage** for the personal medicine cabinet
  and family profiles, and **expo-notifications** for refill reminders.

## Challenges we ran into

- The Kaggle dataset's actual column schema (`short_composition1` /
  `short_composition2` split across two fields) didn't match what a generic
  loader assumed — had to rebuild the composition-merging logic to correctly
  reconstruct full salt strings like "Amoxicillin (500mg) + Clavulanic Acid
  (125mg)" from two separate columns.
- Getting a from-scratch Android toolchain (SDK, JDK, emulator) working
  headlessly surfaced a chain of version-compatibility issues: Gradle
  rejecting a too-new JDK, then a Kotlin/Compose-Compiler version mismatch
  baked into Expo's native module resolution — each needed pinning to an
  exact compatible version rather than "latest."
- Deciding where the line is for salt "sameness": two medicines with the same
  salts but different strengths, dosage forms, or release types are *not*
  substitutable, so the canonical key had to encode all four dimensions, not
  just the salt names — otherwise the app would recommend genuinely unsafe
  substitutions.

## What's next for SameSalt

- Pull in more recent pricing data (current dataset is from November 2022 and
  the app is transparent about this on every result screen).
- Expand NTI (narrow therapeutic index) drug coverage with pharmacist review.
- Support prescription-photo bulk lookup instead of one strip at a time.

---

## Built With (tags)

react-native, expo, typescript, python, sqlite, pandas, cloudflare-workers,
revenuecat, openrouter, expo-router, expo-camera, expo-sqlite

## Try it out links

- GitHub repo: https://github.com/darshanrajagoli/samesalt
