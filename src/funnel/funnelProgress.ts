import { makeMutable, withTiming, type SharedValue } from 'react-native-reanimated';

/**
 * Modulová (ne komponentní) shared value pro progress bar funnelu.
 *
 * Každý krok renderuje vlastní `<FunnelScreen>` instanci, takže běžný
 * `useSharedValue` uvnitř FunnelScreen by se při každém přechodu (i zpět)
 * znovu inicializoval na 0 a bar by se pokaždé naplnil odznova místo
 * plynulého přechodu na novou hodnotu. `makeMutable` žije mimo React
 * lifecycle, takže přežije remount a animuje se vždy z aktuální hodnoty.
 */
export const funnelProgressValue: SharedValue<number> = makeMutable(0);

export function setFunnelProgress(target: number, animate: boolean): void {
  funnelProgressValue.value = animate ? withTiming(target, { duration: 280 }) : target;
}
