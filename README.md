# Emberly

Aplikace pro sledování pravidelných týdenních aktivit a budování návyků.
Postavena na **Expo / React Native + TypeScript**, primárně cílí na Android, ale je
napsaná tak, aby šla bez velkých zásahů sestavit i pro iOS.

<img width="1280" height="678" alt="image" src="https://github.com/user-attachments/assets/fa5b009b-2fa9-4386-b211-576c56ca05b7" />

## O projektu

Emberly je osobní projekt, který stavím sólo ve volném čase — včetně produktového rozhodování,
monetizace i provozu. Můj hlavní obor je web a React; mobil je pro mě prostor, kde na svém React
základu stavím a řídím vlastní React Native / Expo produkt od nuly. Pracuju AI-first workflow,
ale produktová, architektonická a UX rozhodnutí jsou moje. Snažím se to dělat pořádně: typovaná
datová vrstva (Drizzle nad SQLite), testovaná doménová logika, promyšlená architektura a čitelná
historie rozhodnutí — viz sekce [Klíčová rozhodnutí](#klíčová-rozhodnutí) a [CLAUDE.md](CLAUDE.md).

## Tech stack

- **Expo SDK 54** (managed workflow, new architecture) + **Expo Router v6** (file-based)
- **TypeScript** strict (`noUncheckedIndexedAccess`)
- **react-native-paper** (Material 3, light/dark) + **react-native-reanimated v4**
- **Zustand** pro globální stav
- **expo-sqlite v16** + **drizzle-orm** (typovaná data vrstva)
- **expo-notifications** — lokální připomínky + persistentní stavová notifikace
- **react-native-android-widget** — home screen widget (3 varianty)
- **RevenueCat** (`react-native-purchases[-ui]`) — předplatné / feature gating
- date-fns, expo-haptics, expo-file-system, expo-sharing, expo-document-picker
- Jest (`jest-expo`) pro unit testy doménové logiky

## Spuštění (dev)

```bash
npm install --legacy-peer-deps
npm start                    # Expo Dev Server (LAN mode)
npm test                     # Jest unit testy
npm run typecheck            # tsc --noEmit
npm run lint                 # ESLint
```

> **Trvalá notifikace s akčními tlačítky a widget** se musí testovat ve **dev buildu**, ne v
> Expo Go. Expo Go nepodporuje custom notification categories, action handlery ani vlastní
> nativní moduly v plné šíři.

### Dev build (doporučeno pro plné testování)

```bash
npx expo install --check
npx eas-cli build --profile development --platform android
# nebo lokálně:
npx expo run:android
```

## Skripty

- `npm start` — Expo Dev Server (LAN)
- `npm run start:fresh` — LAN mode + vyčištěná Metro cache (po změně balíčků)
- `npm run typecheck` — TypeScript bez emitu
- `npm run lint` — ESLint
- `npm run format` — Prettier
- `npm test` — Jest unit testy
- `npm run db:generate` — Drizzle migrace ze schématu

## Struktura

```
app/                          # Expo Router (file-based)
├── (tabs)/                   # bottom tab navigátor (Aktivity/Přehledy/Streak/Profil)
├── activity/                 # Přidat/upravit aktivitu (modal)
├── funnel/                   # personalizovaný onboarding funnel
└── _layout.tsx                # root layout (Paper theme, gesture handler)

src/
├── db/                        # Drizzle schema, client, repos, migrace
├── domain/                    # čistá logika — týdny, streaky, streak freeze, insights
├── store/                     # Zustand store
├── notifications/             # lokální připomínky, persistentní notifikace, quick-complete
├── purchases/                 # RevenueCat integrace, feature gating
├── widget/                    # Android home screen widget (headless JS task)
├── funnel/                    # onboarding funnel step-machine
├── ui/                        # theme + znovupoužitelné komponenty
├── i18n/                      # cs, en, de překlady
└── utils/
```

## Klíčová rozhodnutí

- **Datum splnění** se ukládá jako lokální ISO datum (`yyyy-MM-dd`), ne UTC timestamp —
  jinak by cestování přes timezony rozbilo streak.
- **Pondělí = 0** v `DayOfWeek` enumu (CZ konvence). První den v týdnu lze v nastavení
  přepnout na neděli pro zobrazení, datová vrstva pracuje vždy s pondělím jako kotvou.
- **Perzistence dat přes Android Auto Backup**, ne vlastní backend — appka nemá server,
  data zůstávají na zařízení uživatele (a v jeho Google účtu jako záloha).
- **iOS fallback** — appka je psaná cross-platform, ale primárně vyvíjená a testovaná na
  Androidu; iOS cesta zůstává otevřená, ne aktivně dolaďovaná.

Víc detailů o architektuře, rozhodnutích a historii projektu je v `CLAUDE.md` v rootu repa.

## Stav implementace

```
[x] Setup, DB vrstva, domain logika + testy
[x] Home / Přehledy / Streak / Profil obrazovky
[x] Add/Edit Activity, kategorie návyků, drag reorder
[x] Personalizovaný onboarding funnel
[x] Lokální připomínky + persistentní notifikace + quick-complete tlačítka
[x] Android home screen widget (3 varianty)
[x] Streak freeze (ochrana série)
[x] Lokalizace: čeština, angličtina, němčina
[~] RevenueCat — kód hotový, dolaďuje se produkční setup (Play produkty, ceny)
[ ] Export/Import JSON
[ ] Polish (animace, haptika, a11y)
```
