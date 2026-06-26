import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Entitlement stav odvozený z RevenueCatu. `isPremium`/`isReady` jsou runtime
 * (neperzistují se — pravdu drží RC). `devPremiumOverride` je dev-only nástroj
 * pro testování gates v Expo Go bez reálného nákupu; perzistuje se, aby přežil
 * reload. V produkci (`!__DEV__`) se override ignoruje.
 */
interface PurchasesState {
  /** Reálný premium stav z RC (CustomerInfo entitlement). */
  isPremium: boolean;
  /** Doběhla první synchronizace s RC? */
  isReady: boolean;
  /** Dev override: null = neaktivní, true/false = vynutit stav. */
  devPremiumOverride: boolean | null;

  setPremium: (v: boolean) => void;
  setReady: (v: boolean) => void;
  setDevOverride: (v: boolean | null) => void;
}

export const usePurchasesStore = create<PurchasesState>()(
  persist(
    (set) => ({
      isPremium: false,
      isReady: false,
      devPremiumOverride: null,

      setPremium: (v) => set({ isPremium: v }),
      setReady: (v) => set({ isReady: v }),
      setDevOverride: (v) => set({ devPremiumOverride: v }),
    }),
    {
      name: 'emberly-purchases',
      storage: createJSONStorage(() => AsyncStorage),
      // Perzistuj jen dev override — reálný premium stav se vždy čerstvě načte z RC.
      partialize: (state) => ({ devPremiumOverride: state.devPremiumOverride }),
    },
  ),
);

/**
 * Efektivní premium stav: dev override (jen v __DEV__) má přednost, jinak
 * reálný RC stav. Toto je jediný selektor, který má UI používat pro gating.
 */
export function selectIsPremium(state: PurchasesState): boolean {
  if (__DEV__ && state.devPremiumOverride !== null) return state.devPremiumOverride;
  return state.isPremium;
}

/** Hook helper — vrací efektivní premium stav. */
export function useIsPremium(): boolean {
  return usePurchasesStore(selectIsPremium);
}
