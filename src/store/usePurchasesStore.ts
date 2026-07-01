import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Entitlement stav odvozený z RevenueCatu. `isPremium`/`isReady` jsou runtime
 * (neperzistují se — pravdu drží RC). `devPremiumOverride` je dev-only nástroj
 * pro testování gates v Expo Go bez reálného nákupu; perzistuje se, aby přežil
 * reload. V produkci (`!__DEV__`) se override ignoruje.
 *
 * `reviewerUnlock` je **skrytý** odemykací přepínač, který platí i v produkci —
 * aktivuje se tajným kódem v Nastavení (7× klepnutí na verzi). Slouží výhradně
 * k tomu, aby Google Play recenzenti mohli plně otestovat placené funkce bez
 * reálného nákupu (povinnost „App access" pro appky s paywallem bez loginu).
 * Klientský, jako celý gating — konzistentní s tím, že gating je lokálně
 * obejitelný (viz `src/purchases/gating.ts`).
 */
interface PurchasesState {
  /** Reálný premium stav z RC (CustomerInfo entitlement). */
  isPremium: boolean;
  /** Doběhla první synchronizace s RC? */
  isReady: boolean;
  /** Dev override: null = neaktivní, true/false = vynutit stav. */
  devPremiumOverride: boolean | null;
  /** Skrytý reviewer unlock — premium bez nákupu i v produkci (App access review). */
  reviewerUnlock: boolean;

  setPremium: (v: boolean) => void;
  setReady: (v: boolean) => void;
  setDevOverride: (v: boolean | null) => void;
  setReviewerUnlock: (v: boolean) => void;
}

export const usePurchasesStore = create<PurchasesState>()(
  persist(
    (set) => ({
      isPremium: false,
      isReady: false,
      devPremiumOverride: null,
      reviewerUnlock: false,

      setPremium: (v) => set({ isPremium: v }),
      setReady: (v) => set({ isReady: v }),
      setDevOverride: (v) => set({ devPremiumOverride: v }),
      setReviewerUnlock: (v) => set({ reviewerUnlock: v }),
    }),
    {
      name: 'emberly-purchases',
      storage: createJSONStorage(() => AsyncStorage),
      // Perzistuj dev override + reviewer unlock — reálný premium stav se vždy
      // čerstvě načte z RC.
      partialize: (state) => ({
        devPremiumOverride: state.devPremiumOverride,
        reviewerUnlock: state.reviewerUnlock,
      }),
    },
  ),
);

/**
 * Efektivní premium stav (jediný selektor, který má UI používat pro gating):
 *  1. `reviewerUnlock` (skrytý, i v produkci) — pro Google recenzenty,
 *  2. `devPremiumOverride` (jen v __DEV__) — pro lokální testování gates,
 *  3. jinak reálný RC stav.
 */
export function selectIsPremium(state: PurchasesState): boolean {
  if (state.reviewerUnlock) return true;
  if (__DEV__ && state.devPremiumOverride !== null) return state.devPremiumOverride;
  return state.isPremium;
}

/** Hook helper — vrací efektivní premium stav. */
export function useIsPremium(): boolean {
  return usePurchasesStore(selectIsPremium);
}
