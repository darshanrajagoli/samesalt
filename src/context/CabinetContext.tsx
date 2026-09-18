import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  AppData,
  FamilyProfile,
  SavedMedicine,
  addMedicineToCabinet,
  addProfile,
  computeTotalSavings,
  getActiveProfile,
  loadAppData,
  removeProfile,
  removeMedicineFromCabinet,
  saveAppData,
  updateMedicineRefill,
} from '../utils/storage';
import { cancelRefillReminder, scheduleRefillReminder } from '../utils/notifications';

interface CabinetContextType {
  data: AppData;
  activeProfile: FamilyProfile;
  totalSavings: number;
  isLoaded: boolean;

  // Profile management
  setActiveProfile: (id: string) => void;
  createProfile: (name: string) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;

  // Medicine cabinet
  saveMedicine: (medicine: SavedMedicine) => Promise<void>;
  removeMedicine: (medicineId: number) => Promise<void>;
  setRefillReminder: (medicineId: number, days: number) => Promise<boolean>;

  // Onboarding
  completeOnboarding: () => Promise<void>;

  // Refresh
  reload: () => Promise<void>;
}

const CabinetContext = createContext<CabinetContextType>(null!);

export function CabinetProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>({
    profiles: [
      {
        id: 'default',
        name: 'Me',
        created_at: new Date().toISOString(),
        medicines: [],
      },
    ],
    active_profile_id: 'default',
    total_savings: 0,
    onboarding_complete: false,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  const persist = useCallback(async (newData: AppData) => {
    newData.total_savings = computeTotalSavings(newData);
    setData(newData);
    await saveAppData(newData);
  }, []);

  const reload = useCallback(async () => {
    const loaded = await loadAppData();
    loaded.total_savings = computeTotalSavings(loaded);
    setData(loaded);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const activeProfile = getActiveProfile(data);
  const totalSavings = data.total_savings;

  const setActiveProfile = useCallback(
    (id: string) => {
      persist({ ...data, active_profile_id: id });
    },
    [data, persist]
  );

  const createProfile = useCallback(
    async (name: string) => {
      await persist(addProfile(data, name));
    },
    [data, persist]
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      await persist(removeProfile(data, id));
    },
    [data, persist]
  );

  const saveMedicine = useCallback(
    async (medicine: SavedMedicine) => {
      await persist(
        addMedicineToCabinet(data, data.active_profile_id, medicine)
      );
    },
    [data, persist]
  );

  const removeMedicine = useCallback(
    async (medicineId: number) => {
      await cancelRefillReminder(medicineId);
      await persist(
        removeMedicineFromCabinet(data, data.active_profile_id, medicineId)
      );
    },
    [data, persist]
  );

  const setRefillReminder = useCallback(
    async (medicineId: number, days: number) => {
      const updated = updateMedicineRefill(
        data,
        data.active_profile_id,
        medicineId,
        days
      );
      await persist(updated);

      const profile = updated.profiles.find(
        (p) => p.id === data.active_profile_id
      );
      const medicine = profile?.medicines.find((m) => m.id === medicineId);
      if (medicine) {
        const scheduledId = await scheduleRefillReminder(medicine);
        if (!scheduledId) {
          // Permission denied or scheduling failed — roll back the persisted
          // days value so the UI doesn't show a reminder that will never fire.
          await persist(
            updateMedicineRefill(updated, data.active_profile_id, medicineId, null)
          );
          return false;
        }
      }
      return true;
    },
    [data, persist]
  );

  const completeOnboarding = useCallback(async () => {
    await persist({ ...data, onboarding_complete: true });
  }, [data, persist]);

  return (
    <CabinetContext.Provider
      value={{
        data,
        activeProfile,
        totalSavings,
        isLoaded,
        setActiveProfile,
        createProfile,
        deleteProfile,
        saveMedicine,
        removeMedicine,
        setRefillReminder,
        completeOnboarding,
        reload,
      }}
    >
      {children}
    </CabinetContext.Provider>
  );
}

export function useCabinet() {
  const ctx = useContext(CabinetContext);
  if (!ctx) throw new Error('useCabinet must be used within CabinetProvider');
  return ctx;
}
