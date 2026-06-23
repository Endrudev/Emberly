/**
 * Čistá gating logika — žádné native importy, plně testovatelné v Jest.
 * Rozhoduje, které funkce jsou pro free uživatele zamčené za premium.
 *
 * Co premium odemyká (value stack na paywallu):
 *  - Neomezené návyky (free limit níže)
 *  - Všechny streak tiery (free jen spodní)
 *  - Pokročilé statistiky (heatmapa + per-habit rozpad)
 *  - Ochrana série (streak freeze) — viz `STREAK_FREEZE_MONTHLY_QUOTA` níže
 */

/** Kolik aktivních návyků smí mít free uživatel. 4. návyk spustí paywall. */
export const FREE_HABIT_LIMIT = 3;

/**
 * Index posledního tieru, který je free (z `streakScreen.tiers`):
 *  0 = spark (1–6), 1 = flame (7–29) → free
 *  2+ = blaze / inferno / legendary → premium
 */
export const FREE_MAX_TIER_INDEX = 1;

/** Smí free/premium uživatel přidat další návyk při daném počtu aktivních? */
export function canAddHabit(activeCount: number, isPremium: boolean): boolean {
  if (isPremium) return true;
  return activeCount < FREE_HABIT_LIMIT;
}

/** Je tier na daném indexu zamčený za premium? */
export function isTierLocked(tierIndex: number, isPremium: boolean): boolean {
  if (isPremium) return false;
  return tierIndex > FREE_MAX_TIER_INDEX;
}

/** Kolik automatických ochran série smí premium uživatel vyčerpat za kalendářní měsíc. Neobnovuje se zpětně (use it or lose it). */
export const STREAK_FREEZE_MONTHLY_QUOTA = 2;

/** Smí uživatel používat ochranu série? Free uživatel ne — vede ho to na paywall. */
export function canUseStreakFreeze(isPremium: boolean): boolean {
  return isPremium;
}
