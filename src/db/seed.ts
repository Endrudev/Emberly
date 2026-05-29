import { activityRepo } from '@/data/activityRepo';
import type { DayOfWeek } from '@/domain/types';

/**
 * Seed dev dat. Spouští se jen pokud je DB prázdná, aby nepřepisoval uživatelskou historii.
 */
export async function seedIfEmpty(): Promise<void> {
  const existing = await activityRepo.listAll();
  if (existing.length > 0) return;

  // pondělí = 0 .. neděle = 6
  const TUE: DayOfWeek = 1;
  const THU: DayOfWeek = 3;
  const SAT: DayOfWeek = 5;
  const MON: DayOfWeek = 0;
  const WED: DayOfWeek = 2;
  const FRI: DayOfWeek = 4;
  const SUN: DayOfWeek = 6;

  await activityRepo.create({
    name: 'Fitko',
    emoji: '💪',
    color: '#EF4444',
    scheduledDays: [TUE, THU, SAT],
  });
  await activityRepo.create({
    name: 'Běh',
    emoji: '🏃',
    color: '#10B981',
    scheduledDays: [MON, WED, FRI],
  });
  await activityRepo.create({
    name: 'Úklid',
    emoji: '🧹',
    color: '#3B82F6',
    scheduledDays: [SUN],
  });
}
