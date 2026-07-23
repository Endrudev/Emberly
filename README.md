# Emberly

Aplikace pro sledování pravidelných týdenních aktivit a budování návyků.
Postavena na **Expo / React Native + TypeScript**, primárně cílí na Android, ale je
napsaná tak, aby šla bez velkých zásahů sestavit i pro iOS.

## Trochu upřímnosti na úvod

Tohle je **vibecoded hobby projekt** — dělám ho ve volném čase, protože mě baví. Programování
mobilních aplikací není moje profese ani obor, kterému se věnuji na plný úvazek; živí mě jiná
odvětví programování. Emberly je pro mě spíš hřiště, na kterém si zkouším budovat a řídit
vlastní produkt od nuly — produktové rozhodování, monetizaci, provoz, celý ten byznysový kus
řemesla — a velká část kódu vznikla ve spolupráci s AI nástroji, ne jako výsledek let zkušeností
s React Native.

Zároveň mi na tom záleží a nechci to flákat. I když je to koníček, snažím se to dělat pořádně —
testy, typovanou datovou vrstvu, promyšlenou architekturu, čitelnou historii rozhodnutí. A ano,
rád bych z toho jednou měl i něco komerčního. Jen chci být od začátku transparentní v tom, kdo
za tím stojí a s jakými zkušenostmi — ať si každý, kdo se na kód nebo na appku podívá, umí udělat
vlastní obrázek.

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
