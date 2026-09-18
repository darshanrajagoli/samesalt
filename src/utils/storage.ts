/**
 * Local storage utilities using AsyncStorage.
 * All user data stays on device — no server, no accounts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ────────────────────────────────────────────────────────────

export interface SavedMedicine {
  id: number;
  name: string;
  salt_composition: string;
  canonical_key: string;
  per_unit_price: number | null;
  cheapest_price: number | null;
  added_at: string; // ISO date
  refill_reminder_days?: number; // days between refills
  last_refill?: string; // ISO date
}

export interface FamilyProfile {
  id: string;
  name: string;
  created_at: string;
  medicines: SavedMedicine[];
}

export interface AppData {
  profiles: FamilyProfile[];
  active_profile_id: string;
  total_savings: number;
  onboarding_complete: boolean;
}

// ── Keys ─────────────────────────────────────────────────────────────

const STORAGE_KEY = '@samesalt_data';

// ── Default ──────────────────────────────────────────────────────────

const DEFAULT_PROFILE: FamilyProfile = {
  id: 'default',
  name: 'Me',
  created_at: new Date().toISOString(),
  medicines: [],
};

const DEFAULT_DATA: AppData = {
  profiles: [DEFAULT_PROFILE],
  active_profile_id: 'default',
  total_savings: 0,
  onboarding_complete: false,
};

// ── Read / Write ─────────────────────────────────────────────────────

export async function loadAppData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DATA };
    const data = JSON.parse(raw) as AppData;
    // Migration: ensure profiles array exists
    if (!data.profiles || data.profiles.length === 0) {
      data.profiles = [DEFAULT_PROFILE];
      data.active_profile_id = 'default';
    }
    return data;
  } catch {
    return { ...DEFAULT_DATA };
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Profile helpers ──────────────────────────────────────────────────

export function getActiveProfile(data: AppData): FamilyProfile {
  return (
    data.profiles.find((p) => p.id === data.active_profile_id) ??
    data.profiles[0]
  );
}

export function addProfile(data: AppData, name: string): AppData {
  const newProfile: FamilyProfile = {
    id: `profile_${Date.now()}`,
    name,
    created_at: new Date().toISOString(),
    medicines: [],
  };
  return {
    ...data,
    profiles: [...data.profiles, newProfile],
  };
}

export function removeProfile(data: AppData, profileId: string): AppData {
  if (profileId === 'default') return data; // Can't remove default
  const profiles = data.profiles.filter((p) => p.id !== profileId);
  return {
    ...data,
    profiles,
    active_profile_id:
      data.active_profile_id === profileId
        ? 'default'
        : data.active_profile_id,
  };
}

// ── Medicine cabinet helpers ─────────────────────────────────────────

export function addMedicineToCabinet(
  data: AppData,
  profileId: string,
  medicine: SavedMedicine
): AppData {
  const profiles = data.profiles.map((p) => {
    if (p.id !== profileId) return p;
    // Don't add duplicates
    if (p.medicines.some((m) => m.id === medicine.id)) return p;
    return { ...p, medicines: [...p.medicines, medicine] };
  });
  return { ...data, profiles };
}

export function removeMedicineFromCabinet(
  data: AppData,
  profileId: string,
  medicineId: number
): AppData {
  const profiles = data.profiles.map((p) => {
    if (p.id !== profileId) return p;
    return {
      ...p,
      medicines: p.medicines.filter((m) => m.id !== medicineId),
    };
  });
  return { ...data, profiles };
}

export function updateMedicineRefill(
  data: AppData,
  profileId: string,
  medicineId: number,
  refillDays: number
): AppData {
  const profiles = data.profiles.map((p) => {
    if (p.id !== profileId) return p;
    return {
      ...p,
      medicines: p.medicines.map((m) => {
        if (m.id !== medicineId) return m;
        return {
          ...m,
          refill_reminder_days: refillDays,
          last_refill: new Date().toISOString(),
        };
      }),
    };
  });
  return { ...data, profiles };
}

/**
 * Compute cumulative savings across all profiles.
 * savings = sum of (scanned_price - cheapest_price) * 30 tablets/month
 * for each medicine where the user chose a cheaper alternative.
 */
export function computeTotalSavings(data: AppData): number {
  let total = 0;
  for (const profile of data.profiles) {
    for (const med of profile.medicines) {
      if (
        med.per_unit_price != null &&
        med.cheapest_price != null &&
        med.per_unit_price > med.cheapest_price
      ) {
        total += (med.per_unit_price - med.cheapest_price) * 30;
      }
    }
  }
  return total;
}
