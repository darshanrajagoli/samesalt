/**
 * Formatting helpers for prices, savings, and medicine display.
 */

/**
 * Format a number as Indian Rupees.
 */
export function formatPrice(amount: number | null | undefined): string {
  if (amount == null) return '—';
  if (amount < 1) return `₹${amount.toFixed(2)}`;
  if (amount < 10) return `₹${amount.toFixed(1)}`;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/**
 * Format per-unit price (price per tablet/ml/unit).
 */
export function formatPerUnit(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `₹${amount.toFixed(2)}/unit`;
}

/**
 * Format savings as a percentage.
 */
export function formatSavingsPercent(
  original: number | null | undefined,
  alternative: number | null | undefined
): string {
  if (original == null || alternative == null || original <= 0) return '';
  const pct = ((original - alternative) / original) * 100;
  if (pct <= 0) return '';
  return `${Math.round(pct)}% cheaper`;
}

/**
 * Calculate monthly savings.
 */
export function monthlyPrice(
  perUnit: number | null | undefined,
  unitsPerMonth = 30
): number | null {
  if (perUnit == null) return null;
  return perUnit * unitsPerMonth;
}

/**
 * Format the dosage form for display.
 */
export function formatDosageForm(form: string | null): string {
  if (!form) return '';
  return form.charAt(0).toUpperCase() + form.slice(1);
}

/**
 * Format the salt composition for display (truncate if very long).
 */
export function formatSaltComposition(
  salt: string | null,
  maxLength = 80
): string {
  if (!salt) return 'Unknown composition';
  if (salt.length <= maxLength) return salt;
  return salt.substring(0, maxLength - 1) + '…';
}

/**
 * Get a color for savings badge based on percentage saved.
 */
export function savingsColor(
  original: number | null,
  alternative: number | null
): 'green' | 'amber' | 'gray' {
  if (original == null || alternative == null || original <= 0) return 'gray';
  const pct = ((original - alternative) / original) * 100;
  if (pct >= 50) return 'green';
  if (pct >= 20) return 'amber';
  return 'gray';
}
