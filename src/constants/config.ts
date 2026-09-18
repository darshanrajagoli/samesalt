/**
 * App-wide configuration.
 * Replace placeholder values before building.
 */
export const Config = {
  // Cloudflare Worker URL for medicine strip scanning
  // Deploy the worker in /worker and paste the URL here
  SCAN_WORKER_URL: 'https://samesalt-scan.YOUR_SUBDOMAIN.workers.dev',

  // RevenueCat API key (public — safe to ship in app)
  // Get this from app.revenuecat.com → Project → API Keys
  REVENUECAT_API_KEY_APPLE: 'appl_YOUR_KEY_HERE',
  REVENUECAT_API_KEY_GOOGLE: 'goog_YOUR_KEY_HERE',

  // RevenueCat entitlement and offering IDs
  ENTITLEMENT_FAMILY: 'family',
  OFFERING_DEFAULT: 'default',
  PACKAGE_MONTHLY: '$rc_monthly',
  PACKAGE_ANNUAL: '$rc_annual',

  // Database
  DB_NAME: 'samesalt.db',
  DB_ASSET_PATH: require('../../assets/samesalt.db'),
  DATASET_DATE: 'November 2022',

  // Family plan limits
  MAX_FAMILY_PROFILES: 6,

  // Default monthly consumption estimate (tablets per month)
  DEFAULT_MONTHLY_TABLETS: 30,
} as const;
