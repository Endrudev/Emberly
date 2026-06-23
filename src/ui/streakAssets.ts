import type { ImageSourcePropType } from 'react-native';

/**
 * Tier odznaky (Jiskra → Legendární) jako obrázkové assety — index odpovídá
 * pořadí v `streakScreen.tiers`. Sdílené mezi Streak obrazovkou a funnelem
 * (krok 9), aby přejmenování/výměna assetů byla na jednom místě.
 */
export const TIER_BADGES: ImageSourcePropType[] = [
  require('../../assets/emberly/Badge_lvl1.png'),
  require('../../assets/emberly/Badge_lvl2.png'),
  require('../../assets/emberly/Badge_lvl3.png'),
  require('../../assets/emberly/Badge_lvl4.png'),
  require('../../assets/emberly/Badge_lvl5.png'),
];

/** Maskot ochrany série (ledový plamínek) — Streak obrazovka, freeze karta. */
export const FROZEN_FLAME: ImageSourcePropType = require('../../assets/emberly/Frozen_flame.png');
