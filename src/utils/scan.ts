/**
 * Medicine strip scanning via Cloudflare Worker → OpenRouter vision API.
 */
import { Config } from '../constants/config';

export interface ScanResult {
  brand_name: string | null;
  salt_composition: string | null;
  strength: string | null;
  dosage_form: string | null;
  pack_size: string | null;
  manufacturer: string | null;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1200;
// Errors worth retrying: rate limit, gateway/upstream hiccups, timeouts.
// NOT retried: 401 (bad secret), 400/413 (bad request) — retrying those
// just wastes time and OpenRouter spend for a guaranteed repeat failure.
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send a base64-encoded image to the scan worker and get structured medicine
 * data. Retries transient failures (rate limits, upstream 5xx, network
 * errors) with a short backoff so a single flaky request doesn't kill the
 * whole scan flow — this matters most live/on-demo, where OpenRouter or the
 * worker's rate limiter can hiccup under back-to-back requests.
 */
export async function scanMedicineStrip(
  base64Image: string
): Promise<ScanResult> {
  let lastError: Error = new Error('Scan failed');

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${Config.SCAN_WORKER_URL}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Secret': Config.SCAN_WORKER_SECRET,
        },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const message =
          (err as any)?.error || `Scan failed with status ${response.status}`;

        if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_RETRIES) {
          lastError = new Error(message);
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        throw new Error(message);
      }

      const result = await response.json();

      if (!(result as any).success) {
        throw new Error((result as any)?.error || 'Scan returned no data');
      }

      return (result as any).data as ScanResult;
    } catch (err) {
      // Network-level failure (no response at all) — also worth a retry.
      if (err instanceof TypeError && attempt < MAX_RETRIES) {
        lastError = err;
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}
