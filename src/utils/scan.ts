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

/**
 * Send a base64-encoded image to the scan worker and get structured medicine data.
 */
export async function scanMedicineStrip(
  base64Image: string
): Promise<ScanResult> {
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
    throw new Error(
      (err as any)?.error || `Scan failed with status ${response.status}`
    );
  }

  const result = await response.json();

  if (!(result as any).success) {
    throw new Error((result as any)?.error || 'Scan returned no data');
  }

  return (result as any).data as ScanResult;
}
