import { usePurchasesStore } from '@/store/usePurchasesStore';
import { presentPaywallIfNeeded, restorePurchases } from './purchases';

/**
 * Otevře remote RevenueCat paywall (jen pokud uživatel nemá premium) a promítne
 * výsledný stav do store. Vrací `true`, pokud po zavření má uživatel premium.
 * Sdílené ze všech gate míst (FAB limit, stats lock, tier lock, Nastavení).
 *
 * V Expo Go / bez native modulu je `presentPaywallIfNeeded` no-op (vrací false)
 * — gating se v dev testuje přes premium override v Nastavení.
 */
export async function openPaywall(): Promise<boolean> {
  const premium = await presentPaywallIfNeeded();
  usePurchasesStore.getState().setPremium(premium);
  return premium;
}

/** Obnoví nákupy a promítne výsledek do store. Vrací výsledný premium stav. */
export async function restoreAndSync(): Promise<boolean> {
  const premium = await restorePurchases();
  usePurchasesStore.getState().setPremium(premium);
  return premium;
}
