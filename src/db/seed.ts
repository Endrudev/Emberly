import { activityRepo } from '@/data/activityRepo';
import type { DayOfWeek } from '@/domain/types';

/**
 * Seed dev dat. Spouští se jen pokud je DB prázdná.
 */
export async function seedIfEmpty(): Promise<void> {
  const existing = await activityRepo.listAll();
  if (existing.length > 0) return;

  const MON: DayOfWeek = 0;
  const TUE: DayOfWeek = 1;
  const WED: DayOfWeek = 2;
  const THU: DayOfWeek = 3;
  const FRI: DayOfWeek = 4;
  const SAT: DayOfWeek = 5;
  const SUN: DayOfWeek = 6;

  await activityRepo.create({
    name: 'Chůze',
    emoji: '🚶',
    color: '#4AABF5',
    scheduledDays: [MON, TUE, WED, THU, FRI, SAT, SUN], // every day
  });
  await activityRepo.create({
    name: 'Cvičení',
    emoji: '💪',
    color: '#FF8C42',
    scheduledDays: [MON, WED, FRI, SAT],
  });
  await activityRepo.create({
    name: 'Meditace',
    emoji: '🧘',
    color: '#FF6B9D',
    scheduledDays: [MON, TUE, WED, THU, FRI, SAT, SUN], // every day
  });
}
