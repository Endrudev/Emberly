import { Linking, Platform } from 'react-native';

import {
  REVENUECAT_ANDROID_API_KEY,
  PREMIUM_ENTITLEMENT_ID,
  hasRealRevenueCatKey,
} from '@/config/revenuecat';

/**
 * Service wrapper kolem `react-native-purchases` (+ `-ui`). Oba jsou custom
 * native moduly se stejnou pastí jako `react-native-android-widget`: v Expo Go
 * (new architecture) crashují **při importu**, ne při použití. Proto VŠECHNO
 * přes lazy `require()` v try/catch — nikdy statický top-level import.
 *
 * Když modul není k dispozici (Expo Go) nebo není reálný API klíč, všechny
 * funkce jsou no-op / vrací `false` (= žádný premium). Plné testování nákupů
 * vyžaduje dev build. Vzor: `src/widget/*`, `app/_layout.tsx`.
 */

const PLAY_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';

let purchasesModule: any | undefined;
let configured = false;

/** Lazy-load `react-native-purchases`; cache výsledek (undefined = nedostupný). */
function getPurchases(): any | null {
  if (purchasesModule !== undefined) return purchasesModule;
  try {
    // default export = Purchases
    purchasesModule =
      require('react-native-purchases').default ?? require('react-native-purchases');
  } catch {
    purchasesModule = null;
  }
  return purchasesModule;
}

/** Lazy-load `react-native-purchases-ui` (RevenueCatUI). Vrací modul nebo null. */
export function getRevenueCatUI(): any | null {
  try {
    return require('react-native-purchases-ui').default ?? require('react-native-purchases-ui');
  } catch {
    return null;
  }
}

/** Je purchases vrstva reálně k dispozici (native modul + reálný klíč)? */
export function isPurchasesAvailable(): boolean {
  return Platform.OS !== 'web' && hasRealRevenueCatKey() && getPurchases() != null;
}

/**
 * Inicializuje RC SDK. Idempotentní. No-op v Expo Go / bez reálného klíče.
 * Vrací `true` pokud se konfigurace povedla.
 */
export async function configurePurchases(): Promise<boolean> {
  if (configured) return true;
  if (!isPurchasesAvailable()) return false;
  const Purchases = getPurchases();
  try {
    await Purchases.configure({ apiKey: REVENUECAT_ANDROID_API_KEY });
    configured = true;
    return true;
  } catch {
    return false;
  }
}

/** Je v `CustomerInfo` aktivní premium entitlement? */
function customerInfoIsPremium(info: any): boolean {
  return Boolean(info?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID]);
}

/** Načte aktuální entitlement stav z RC. `false` pokud nedostupné. */
export async function getIsPremium(): Promise<boolean> {
  if (!(await configurePurchases())) return false;
  const Purchases = getPurchases();
  try {
    const info = await Purchases.getCustomerInfo();
    return customerInfoIsPremium(info);
  } catch {
    return false;
  }
}

/** Obnoví nákupy (restore). Vrací výsledný premium stav. */
export async function restorePurchases(): Promise<boolean> {
  if (!(await configurePurchases())) return false;
  const Purchases = getPurchases();
  try {
    const info = await Purchases.restorePurchases();
    return customerInfoIsPremium(info);
  } catch {
    return false;
  }
}

/**
 * Registruje listener na změny `CustomerInfo` (např. dokončený nákup v jiném
 * flow). Vrací cleanup funkci. No-op pokud nedostupné.
 */
export function addCustomerInfoListener(cb: (isPremium: boolean) => void): () => void {
  if (!isPurchasesAvailable()) return () => {};
  const Purchases = getPurchases();
  try {
    const listener = (info: any) => cb(customerInfoIsPremium(info));
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      try {
        Purchases.removeCustomerInfoUpdateListener(listener);
      } catch {
        /* noop */
      }
    };
  } catch {
    return () => {};
  }
}

/**
 * Prezentuje remote RevenueCat Paywall jen pokud uživatel nemá premium.
 * Vrací `true`, pokud po zavření paywallu uživatel premium MÁ (koupil/obnovil).
 * No-op (false) když UI modul není k dispozici (Expo Go).
 */
export async function presentPaywallIfNeeded(): Promise<boolean> {
  const RevenueCatUI = getRevenueCatUI();
  if (!RevenueCatUI || !(await configurePurchases())) return false;
  try {
    await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: PREMIUM_ENTITLEMENT_ID,
    });
  } catch {
    /* uživatel zavřel / chyba — stav doplníme z getIsPremium níže */
  }
  return getIsPremium();
}

/** Otevře správu předplatného v Google Play. */
export async function showManageSubscriptions(): Promise<void> {
  try {
    await Linking.openURL(PLAY_SUBSCRIPTIONS_URL);
  } catch {
    /* noop */
  }
}
