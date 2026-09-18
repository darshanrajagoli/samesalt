import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Config } from '../constants/config';

interface RevenueCatContextType {
  isReady: boolean;
  isPro: boolean; // Has "family" entitlement
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  packages: PurchasesPackage[];

  purchasePackage: (pkg: PurchasesPackage) => Promise<'success' | 'cancelled' | 'error'>;
  restorePurchases: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

const RevenueCatContext = createContext<RevenueCatContextType>(null!);

export function RevenueCatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isReady, setIsReady] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] =
    useState<PurchasesOffering | null>(null);

  useEffect(() => {
    async function init() {
      try {
        Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);

        const apiKey =
          Platform.OS === 'ios'
            ? Config.REVENUECAT_API_KEY_APPLE
            : Config.REVENUECAT_API_KEY_GOOGLE;

        await Purchases.configure({ apiKey });

        // Get initial customer info
        const info = await Purchases.getCustomerInfo();
        updateFromCustomerInfo(info);

        // Get offerings
        const offerings = await Purchases.getOfferings();
        if (offerings.current) {
          setCurrentOffering(offerings.current);
        }

        // Listen for changes
        Purchases.addCustomerInfoUpdateListener((info) => {
          updateFromCustomerInfo(info);
        });

        setIsReady(true);
      } catch (err) {
        console.error('RevenueCat init error:', err);
        // Still mark ready — app works without subscriptions
        setIsReady(true);
      }
    }

    init();
  }, []);

  function updateFromCustomerInfo(info: CustomerInfo) {
    setCustomerInfo(info);
    const hasFamily =
      info.entitlements.active[Config.ENTITLEMENT_FAMILY] !== undefined;
    setIsPro(hasFamily);
  }

  const purchasePackage = useCallback(
    async (pkg: PurchasesPackage): Promise<'success' | 'cancelled' | 'error'> => {
      try {
        const { customerInfo: newInfo } = await Purchases.purchasePackage(pkg);
        updateFromCustomerInfo(newInfo);
        return newInfo.entitlements.active[Config.ENTITLEMENT_FAMILY] !==
          undefined
          ? 'success'
          : 'error';
      } catch (err: any) {
        if (err.userCancelled) {
          return 'cancelled';
        }
        console.error('Purchase error:', err);
        return 'error';
      }
    },
    []
  );

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      const info = await Purchases.restorePurchases();
      updateFromCustomerInfo(info);
      return info.entitlements.active[Config.ENTITLEMENT_FAMILY] !== undefined;
    } catch (err) {
      console.error('Restore error:', err);
      return false;
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      updateFromCustomerInfo(info);
    } catch {}
  }, []);

  const packages = currentOffering?.availablePackages ?? [];

  return (
    <RevenueCatContext.Provider
      value={{
        isReady,
        isPro,
        customerInfo,
        currentOffering,
        packages,
        purchasePackage,
        restorePurchases,
        refresh,
      }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const ctx = useContext(RevenueCatContext);
  if (!ctx)
    throw new Error('useRevenueCat must be used within RevenueCatProvider');
  return ctx;
}
