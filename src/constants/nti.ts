/**
 * Narrow Therapeutic Index (NTI) drugs.
 * For these drugs, switching brands can be medically dangerous.
 * The app must REFUSE to suggest alternatives and show a warning.
 */
export const NTI_SALTS: ReadonlySet<string> = new Set([
  'warfarin',
  'phenytoin',
  'lithium',
  'lithium carbonate',
  'lithium citrate',
  'levothyroxine',
  'levothyroxine sodium',
  'cyclosporine',
  'ciclosporin',
  'digoxin',
  'carbamazepine',
  'valproic acid',
  'sodium valproate',
  'theophylline',
  'aminophylline',
  'tacrolimus',
  'sirolimus',
  'everolimus',
  'mycophenolate',
  'mycophenolate mofetil',
  'clonidine',
]);

export const NTI_WARNING =
  'This medicine contains a Narrow Therapeutic Index (NTI) drug. ' +
  'Small differences between brands can have significant clinical effects. ' +
  'Do NOT switch brands without consulting your doctor.';
