/**
 * RevenueCat konfigurace. Placeholder hodnoty — přepiš, jakmile existuje RC
 * projekt + Play Console subscription produkty (viz setup checklist v plánu /
 * vault `screens/onboarding-funnel.md`). Stejný princip jako `src/config/legal.ts`:
 * záměrně nefunkční placeholdery, aby bylo na první pohled jasné, co chybí.
 *
 * `goog_…` = RevenueCat **public** Android SDK key (ne secret key). Bezpečný v
 * klientovi — slouží jen k autorizaci SDK proti RC, ne k administraci.
 */
export const REVENUECAT_ANDROID_API_KEY = 'goog_PLACEHOLDER_REVENUECAT_KEY';

/**
 * Identifikátor entitlementu v RC dashboardu, který odemyká premium funkce.
 * Aktivní entitlement s tímto klíčem v `CustomerInfo.entitlements.active` = premium.
 */
export const PREMIUM_ENTITLEMENT_ID = 'premium';

/** Výchozí offering (sada balíčků), který se prezentuje na paywallu. */
export const DEFAULT_OFFERING_ID = 'default';

/**
 * Product identifiers (Play Console). Placeholder — doplnit po vytvoření
 * subscription produktů. Drží se tu jen pro referenci / případné přímé
 * `purchaseProduct`; remote RevenueCat Paywall si balíčky tahá z offeringu sám.
 */
export const PRODUCT_IDS = {
  yearly: 'mission_tracker_premium_yearly',
  monthly: 'mission_tracker_premium_monthly',
} as const;

/** Je nastavený reálný API klíč (ne placeholder)? Řídí, zda vůbec konfigurovat SDK. */
export function hasRealRevenueCatKey(): boolean {
  return !REVENUECAT_ANDROID_API_KEY.includes('PLACEHOLDER');
}
