import { requireNativeModule } from 'expo-modules-core';

export interface WidgetPinNativeModule {
  /** Android 8+ a podporovaný launcher — jinak false. */
  isSupported(): boolean;
  /**
   * Vyvolá systémový "přidat widget" dialog pro daného providera.
   * Vrací, zda se dialog podařilo vyvolat (ne, zda uživatel potvrdil).
   */
  requestPin(providerClassName: string): boolean;
}

export default requireNativeModule<WidgetPinNativeModule>('WidgetPin');
