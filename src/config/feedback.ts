/**
 * Kontakty pro beta feedback / bug reporty (viz vault dev/beta-feedback-workflow.md).
 * Primární kanál je Discord; e-mail je fallback, dokud/pokud by Discord odkaz
 * nebyl nastavený. Stejný princip jako `src/config/legal.ts` a
 * `src/config/revenuecat.ts` — placeholder detekovatelný přes `hasRealDiscordUrl()`.
 */
export const FEEDBACK_EMAIL = 'endevcomp@gmail.com';

export const FEEDBACK_DISCORD_URL = 'https://discord.gg/hZVmhKAD3';

/** Je nastavený reálný Discord odkaz (ne placeholder)? */
export function hasRealDiscordUrl(): boolean {
  return !FEEDBACK_DISCORD_URL.includes('PLACEHOLDER');
}
