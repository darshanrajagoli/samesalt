import React, { useEffect } from 'react';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useRouter } from 'expo-router';
import { PaywallScreen } from '../src/screens/PaywallScreen';
import { useRevenueCat } from '../src/context/RevenueCatContext';

/**
 * Renders the hand-built PaywallScreen immediately (so there's always a
 * working paywall even if nothing is configured on the RevenueCat dashboard),
 * then attempts to present RevenueCat's native Paywalls SDK on top of it.
 * If a visual paywall template exists for the "default" offering, the user
 * sees that instead; if not (NOT_PRESENTED) or presentation fails, they just
 * see the screen underneath — there's no broken or blank state either way.
 */
export default function Paywall() {
  const router = useRouter();
  const { refresh } = useRevenueCat();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await RevenueCatUI.presentPaywall();
        if (cancelled) return;
        await refresh();
        if (
          result === PAYWALL_RESULT.PURCHASED ||
          result === PAYWALL_RESULT.RESTORED ||
          result === PAYWALL_RESULT.CANCELLED
        ) {
          router.back();
        }
        // NOT_PRESENTED: no visual paywall configured for this offering —
        // fall through silently, leaving PaywallScreen visible underneath.
      } catch {
        // SDK couldn't render (e.g. Test Store limitation) — PaywallScreen
        // underneath is the fallback, not an error state.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh, router]);

  return <PaywallScreen />;
}
