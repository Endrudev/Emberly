import { useAppStore } from '@/store/useAppStore';
import { useFunnelStore } from '@/store/useFunnelStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { FUNNEL_CATEGORIES, type FunnelCategoryKey } from './categories';

/**
 * Po paywallu (krok 17) — promítne dočasné odpovědi z funnelu do appky:
 * seedne vybrané návyky (krok 3, mapování kategorie→emoji/barva z
 * `FUNNEL_CATEGORIES`) a dokončí onboarding.
 *
 * `reminderTime`/`remindersEnabled` se nastavují už v kroku 15 (notifikace)
 * přímo do `useSettingsStore` — tady se jen aplikují kategorie a uklidí
 * dočasné úložiště funnelu.
 *
 * `categoryLabels` se passuje zvenku (`t.funnel.categories`) místo celého
 * `Translation` objektu — `useTranslation()` vrací union `typeof cs | typeof
 * en` s literálovými typy, který by se jako celek nedal přiřadit k jednomu
 * konkrétnímu jazyku; tahle užší shoda (`Record<FunnelCategoryKey, string>`)
 * sedí na oba jazyky bez castování.
 */
export async function applyFunnelAnswers(
  categoryLabels: Record<FunnelCategoryKey, string>,
): Promise<void> {
  const { answers, reset } = useFunnelStore.getState();
  const { createActivity } = useAppStore.getState();

  for (const categoryKey of answers.categories) {
    const def = FUNNEL_CATEGORIES.find((c) => c.key === categoryKey);
    if (!def) continue;
    await createActivity({
      name: categoryLabels[def.key],
      emoji: def.emoji,
      color: def.color,
      scheduledDays: [0, 1, 2, 3, 4, 5, 6],
    });
  }

  useSettingsStore.getState().completeOnboarding();
  reset();
}
