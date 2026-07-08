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
  /**
   * Doživotní premium pro beta testery — ručně rozdávaný kód po skončení
   * úspěšného testingu (`TESTER_LIFETIME_CODE`). Na rozdíl od
   * `BETA_PREMIUM_DEFAULT` (dočasný, mizí s betou) tenhle stav **přežívá**
   * odstranění beta přepínače — je to skutečná trvalá odměna, ne dočasný
   * beta bonus.
   */
  testerLifetimeUnlock: boolean;

  setPremium: (v: boolean) => void;
  setReady: (v: boolean) => void;
  setDevOverride: (v: boolean | null) => void;
  setReviewerUnlock: (v: boolean) => void;
  setTesterLifetimeUnlock: (v: boolean) => void;
}

export const usePurchasesStore = create<PurchasesState>()(
  persist(
    (set) => ({
      isPremium: false,
      isReady: false,
      devPremiumOverride: null,
      reviewerUnlock: false,
      testerLifetimeUnlock: false,

      setPremium: (v) => set({ isPremium: v }),
      setReady: (v) => set({ isReady: v }),
      setDevOverride: (v) => set({ devPremiumOverride: v }),
      setReviewerUnlock: (v) => set({ reviewerUnlock: v }),
      setTesterLifetimeUnlock: (v) => set({ testerLifetimeUnlock: v }),
    }),
    {
      name: 'emberly-purchases',
      storage: createJSONStorage(() => AsyncStorage),
      // Perzistuj dev override + reviewer unlock + tester lifetime unlock —
      // reálný premium stav se vždy čerstvě načte z RC.
      partialize: (state) => ({
        devPremiumOverride: state.devPremiumOverride,
        reviewerUnlock: state.reviewerUnlock,
        testerLifetimeUnlock: state.testerLifetimeUnlock,
      }),
    },
  ),
);

// TODO beta-only: appka jde testerům s premium zapnutým napřed, ať nemusí ručně zadávat
// reviewer kód. Smazat před produkčním launchem (spolu s tímhle řádkem zmizí i komentář).
// `testerLifetimeUnlock` NEMAZAT spolu s tímhle — ten má přežít i po odstranění bety.
const BETA_PREMIUM_DEFAULT = true;

/**
 * Efektivní premium stav (jediný selektor, který má UI používat pro gating):
 *  0. `BETA_PREMIUM_DEFAULT` (beta-only, viz TODO výše),
 *  1. `testerLifetimeUnlock` (trvalá odměna za testování, přežívá i produkci),
 *  2. `reviewerUnlock` (skrytý, i v produkci) — pro Google recenzenty,
 *  3. `devPremiumOverride` (jen v __DEV__) — pro lokální testování gates,
 *  4. jinak reálný RC stav.
 */
export function selectIsPremium(state: PurchasesState): boolean {
  if (BETA_PREMIUM_DEFAULT) return true;
  if (state.testerLifetimeUnlock) return true;
  if (state.reviewerUnlock) return true;
  if (__DEV__ && state.devPremiumOverride !== null) return state.devPremiumOverride;
  return state.isPremium;
}

/** Hook helper — vrací efektivní premium stav. */
export function useIsPremium(): boolean {
  return usePurchasesStore(selectIsPremium);
}
