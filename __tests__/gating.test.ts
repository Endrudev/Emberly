import {
  canAddHabit,
  canUseStreakFreeze,
  isTierLocked,
  FREE_HABIT_LIMIT,
  FREE_MAX_TIER_INDEX,
} from '@/purchases/gating';

describe('canAddHabit', () => {
  it('premium může vždy přidat návyk', () => {
    expect(canAddHabit(0, true)).toBe(true);
    expect(canAddHabit(FREE_HABIT_LIMIT, true)).toBe(true);
    expect(canAddHabit(FREE_HABIT_LIMIT + 10, true)).toBe(true);
  });

  it('free může přidat pod limit', () => {
    expect(canAddHabit(0, false)).toBe(true);
    expect(canAddHabit(FREE_HABIT_LIMIT - 1, false)).toBe(true);
  });

  it('free nemůže přidat na/nad limit', () => {
    expect(canAddHabit(FREE_HABIT_LIMIT, false)).toBe(false);
    expect(canAddHabit(FREE_HABIT_LIMIT + 1, false)).toBe(false);
  });
});

describe('isTierLocked', () => {
  it('premium nemá zamčený žádný tier', () => {
    expect(isTierLocked(0, true)).toBe(false);
    expect(isTierLocked(4, true)).toBe(false);
  });

  it('free má odemčené tiery do FREE_MAX_TIER_INDEX včetně', () => {
    expect(isTierLocked(0, false)).toBe(false);
    expect(isTierLocked(FREE_MAX_TIER_INDEX, false)).toBe(false);
  });

  it('free má zamčené tiery nad FREE_MAX_TIER_INDEX', () => {
    expect(isTierLocked(FREE_MAX_TIER_INDEX + 1, false)).toBe(true);
    expect(isTierLocked(4, false)).toBe(true);
  });
});

describe('canUseStreakFreeze', () => {
  it('premium může používat ochranu série', () => {
    expect(canUseStreakFreeze(true)).toBe(true);
  });

  it('free nemůže používat ochranu série', () => {
    expect(canUseStreakFreeze(false)).toBe(false);
  });
});
