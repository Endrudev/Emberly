import type { ImageSourcePropType } from 'react-native';

/**
 * Sémantické stavy maskota Emberly použité napříč funnelem. Skutečné soubory
 * v `assets/emberly/` mají historicky jiná jména než doporučená konvence
 * (`assets/emberly/README.md`) — tahle mapa je to jediné místo, které je
 * propojuje, takže přejmenování/doplnění assetů znamená úpravu jen tady.
 *
 * Chybějící stav → fallback na `happy` (viz README, "Neblokuje to").
 */
export type EmberlyState = 'wave' | 'happy' | 'think' | 'celebrate' | 'cheer';

export const EMBERLY: Record<EmberlyState, ImageSourcePropType> = {
  wave: require('../../assets/emberly/Waving-flame.png'),
  happy: require('../../assets/emberly/Happy-flame.png'),
  think: require('../../assets/emberly/Thinking-flame.png'),
  celebrate: require('../../assets/emberly/Thumbs-up-flame.png'),
  cheer: require('../../assets/emberly/Intense-flame.png'),
};
