# 💊 SameSalt

**Scan any medicine strip → find every chemically identical alternative, sorted cheapest first.**

SameSalt is a React Native (Expo) app built for India. It uses a local database of 250K+ medicines from the [Kaggle A-Z Medicine Dataset of India](https://www.kaggle.com/datasets/shudhanshusingh/az-medicine-dataset-of-india) to match medicines by their exact salt composition and show you how much you could save — instantly, offline, no account required.

## 🎬 Demo

> 2-minute demo video: *(link coming soon)*

## How It Works

1. **Scan or Search** — Point your camera at a medicine strip, or type the brand name
2. **Match** — The app extracts the salt composition and finds every brand with the same formula
3. **Save** — See Jan Aushadhi generics first, then the cheapest brands, with savings per tablet and per month

### The Database Pipeline

A Python pipeline (`pipeline/build_db.py`) processes the raw Kaggle CSV into a SQLite database:
- Normalizes salt names (Amoxycillin → Amoxicillin, 0.5g → 500mg)
- Creates canonical keys by sorting salts alphabetically
- Computes per-unit price from pack size
- Flags Narrow Therapeutic Index (NTI) drugs (Warfarin, Phenytoin, etc.) where switching brands is medically risky
- Tags dosage form and release type so sustained-release only matches sustained-release

### The Scan Feature

A photo goes to a vision model (via OpenRouter) through a Cloudflare Worker proxy so no API key ships in the app. The model returns structured JSON: brand name, salt composition, strength, dosage form.

### Privacy

- No user accounts — RevenueCat anonymous IDs handle subscription identity
- All medicine data stays on device in SQLite
- No analytics, no tracking, no server-side storage of health data

## Features

### Free (unlimited)
- 📷 Camera scan (AI-powered OCR)
- 🔍 Manual text search
- 💊 Salt-equivalent matching
- 🏥 Jan Aushadhi generic highlighting
- 📊 Savings per tablet & per month
- 📱 Pharmacist card (full-screen salt + strength for the chemist)
- 🗄️ Personal medicine cabinet with cumulative savings

### SameSalt Family (paid)
- 👨‍👩‍👧‍👦 Up to 6 family profiles
- ⏰ Refill reminders via local notifications
- 📈 Monthly savings summary
- **₹99/month** or **₹799/year** (7-day free trial on annual, annual pre-selected)

The paywall appears only when you try to add a second person — never on app launch.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| App | React Native + Expo (development build) |
| Navigation | Expo Router (file-based) |
| Local DB | expo-sqlite |
| Camera | expo-camera |
| Payments | react-native-purchases (RevenueCat) |
| Notifications | expo-notifications |
| State | React Context |
| Scan Proxy | Cloudflare Worker |
| Vision AI | OpenRouter (google/gemini-flash-1.5) |
| Pipeline | Python 3.10+ |

## Project Structure

```
samesalt/
├── pipeline/           # Python: CSV → SQLite database
│   ├── build_db.py     # Main pipeline
│   ├── normalize.py    # Salt normalization logic
│   └── tests/          # Pipeline unit tests
├── worker/             # Cloudflare Worker proxy for OpenRouter
│   └── src/index.js
├── app/                # Expo Router app root
│   ├── (tabs)/         # Tab navigator screens
│   └── ...             # Modal/stack screens
├── src/                # App source code
│   ├── constants/      # Colors, config, NTI list
│   ├── context/        # React contexts
│   ├── hooks/          # Custom hooks
│   ├── screens/        # Screen components (used by router)
│   ├── components/     # Shared UI components
│   └── utils/          # Database, scan, formatting helpers
├── assets/             # Icons, splash, bundled DB
└── docs/               # Architecture documentation
```

## Quick Start

### 1. Build the database

```bash
cd pipeline
pip install -r requirements.txt
# Download the Kaggle dataset CSV to pipeline/data/
python build_db.py
# Output: ../assets/samesalt.db
```

### 2. Deploy the Cloudflare Worker

```bash
cd worker
npm install
# Set your OpenRouter API key:
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler deploy
# Note the worker URL for the next step
```

### 3. Run the app

```bash
# From the project root (samesalt/)
npm install
# Set the worker URL in src/constants/config.ts
npx expo prebuild
npx expo run:android  # or run:ios
```

> **Note:** This app requires a development build (`npx expo prebuild`), not Expo Go, because RevenueCat uses native modules.

### 4. Configure RevenueCat

1. Create a project at [app.revenuecat.com](https://app.revenuecat.com)
2. Create a single entitlement: `family`
3. Create two packages in a "default" offering: `monthly` (₹99) and `annual` (₹799, 7-day trial)
4. Add your RevenueCat API key to `src/constants/config.ts`
5. For demo purposes, use RevenueCat **Test Store** (no Apple/Google developer account needed)

## Dataset

Prices are from the [A-Z Medicine Dataset of India](https://www.kaggle.com/datasets/shudhanshusingh/az-medicine-dataset-of-india) (November 2022). Every result screen shows this date. This is a reference tool — always consult your doctor or pharmacist.

## ⚠️ Medical Disclaimer

SameSalt is an **informational tool only**. It is not medical advice. For Narrow Therapeutic Index (NTI) drugs — Warfarin, Phenytoin, Lithium, Levothyroxine, Cyclosporine, Digoxin — the app refuses to suggest alternatives and shows a warning. Always consult your doctor before switching brands.

## License

MIT — see [LICENSE](LICENSE).

## Hackathon

Built for [RevenueCat Shipaton 2026](https://revenuecat.devpost.com/) — targeting the **Next Gen Award** (student-only).
