import { Platform } from 'react-native';
import type { WidgetPinNativeModule } from 'widget-pin';

export type WidgetVariant = 'MissionWidget' | 'MissionWidget4x2';

// Musí přesně sedět s `<receiver android:name=".widget.MissionWidget...">`
// v android/app/src/main/AndroidManifest.xml (generuje react-native-android-widget).
const PROVIDER_CLASS_NAME: Record<WidgetVariant, string> = {
  MissionWidget: 'com.endru.missiontracker.widget.MissionWidget',
  MissionWidget4x2: 'com.endru.missiontracker.widget.MissionWidget4x2',
};

/**
 * Lazy require — v Expo Go nativní modul neexistuje. Statický import by
 * shodil require('widget-pin') hned při evaluaci tohoto souboru, což
 * Expo Router dělá eagerně pro všechny route soubory při startu appky
 * (i bez návštěvy /settings/widget). Voláním až zde se chyba odloží do
 * okamžiku skutečného použití, kde už je odchytávaná.
 */
function getWidgetPin(): WidgetPinNativeModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('widget-pin').default as WidgetPinNativeModule;
  } catch {
    return null;
  }
}

/**
 * Vyvolá systémový "přidat widget na plochu" dialog (Android 8+; ne každý
 * launcher to podporuje). Vrací `true`, pokud se dialog podařilo vyvolat —
 * `false` znamená, že volající má zobrazit fallback návod (ruční přidání).
 */
export function pinWidget(variant: WidgetVariant): boolean {
  if (Platform.OS !== 'android') return false;
  const WidgetPin = getWidgetPin();
  if (!WidgetPin) return false;
  try {
    if (!WidgetPin.isSupported()) return false;
    return WidgetPin.requestPin(PROVIDER_CLASS_NAME[variant]);
  } catch {
    return false;
  }
}
