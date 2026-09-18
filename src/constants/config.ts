/**
 * App-wide configuration.
 * Replace placeholder values before building.
 */
export const Config = {
  // Cloudflare Worker URL for medicine strip scanning
  // Deploy the worker in /worker and paste the URL here
  SCAN_WORKER_URL: 'https://samesalt-scan.samesalt-worker.workers.dev',

  // Shared secret sent as X-App-Secret to the scan worker. This is baked
  // into the app bundle, so it is NOT a real secret — it is extractable from
  // the APK. It exists only to stop casual/drive-by scripted abuse of the
  // public endpoint, not a determined attacker. Must match the worker's
  // APP_SHARED_SECRET (set via `wrangler secret put APP_SHARED_SECRET`).
  SCAN_WORKER_SECRET: '9ff5481989e8f84a4b9f303386ad7f4faaac3368427dd4c8',

  // RevenueCat API key (public — safe to ship in app)
  // Get this from app.revenuecat.com → Project → API Keys
  // Using RevenueCat Test Store key for both platforms (demo mode — no
  // App Store/Play Store developer account required). Replace with real
  // appl_/goog_ keys before a production release.
  REVENUECAT_API_KEY_APPLE: 'test_HwLgSuwFareISTJMRnvZgUSnSJc',
  REVENUECAT_API_KEY_GOOGLE: 'test_HwLgSuwFareISTJMRnvZgUSnSJc',

  // RevenueCat entitlement ID that gates the Family plan.
  ENTITLEMENT_FAMILY: 'family',

  // Database
  DB_NAME: 'samesalt.db',
  DB_ASSET_PATH: require('../../assets/samesalt.db'),
  DATASET_DATE: 'November 2022',

  // Family plan limits
  MAX_FAMILY_PROFILES: 6,
} as const;
