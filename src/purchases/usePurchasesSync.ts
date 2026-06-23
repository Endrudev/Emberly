import { useEffect } from 'react';
import { AppState } from 'react-native';

import { usePurchasesStore } from '@/store/usePurchasesStore';
import { configurePurchases, getIsPremium, addCustomerInfoListener } from './purchases';

/**
 * Drží entitlement stav (`isPremium`) v souladu s RevenueCatem:
 *  - na mountu nakonfiguruje SDK a načte aktuální stav,
 *  - registruje listener na změny CustomerInfo (dokončený nákup kdekoliv),
 *  - obnoví stav při návratu appky do popředí (např. po koupi mimo appku
 *    nebo po obnově ze zálohy, kdy se entitlement re-syncne z Play).
 *
 * V Expo Go / bez reálného klíče je vše no-op a stav zůstává `isPremium=false`
 * (gating používá dev override v Nastavení pro testování bez buildu). Vzor:
 * `src/notifications/useReminderSync.ts`.
 */
export function usePurchasesSync(): void {
  const setPremium = usePurchasesStore((s) => s.setPremium);
  const setReady = usePurchasesStore((s) => s.setReady);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      await configurePurchases();
      const premium = await getIsPremium();
      if (mounted) {
        setPremium(premium);
        setReady(true);
      }
    })();

    const removeListener = addCustomerInfoListener((premium) => {
      if (mounted) setPremium(premium);
    });

    const refresh = () => {
      void getIsPremium().then((premium) => {
        if (mounted) setPremium(premium);
      });
    };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      mounted = false;
      removeListener();
      subscription.remove();
    };
  }, [setPremium, setReady]);
}
