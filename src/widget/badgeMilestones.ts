export const BADGE_MILESTONES = [7, 14, 30, 50, 100, 200, 365] as const;

export function getNextBadge(currentStreak: number): {
  target: number;
  daysLeft: number;
  progress: number;
} {
  const next = BADGE_MILESTONES.find((m) => m > currentStreak);

  if (next === undefined) {
    const target = Math.ceil((currentStreak + 1) / 100) * 100;
    return { target, daysLeft: target - currentStreak, progress: currentStreak / target };
  }

  const milestones = [...BADGE_MILESTONES];
  const prevIdx = milestones.findLastIndex((m) => m <= currentStreak);
  const prev = prevIdx >= 0 ? milestones[prevIdx]! : 0;

  return {
    target: next,
    daysLeft: next - currentStreak,
    progress: (currentStreak - prev) / (next - prev),
  };
}
