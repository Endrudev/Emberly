# Mission Tracker — Claude Code context

## Co je tento projekt
Mobilní appka pro sledování týdenních aktivit a budování návyků.
Primárně Android, cross-platform codebase (iOS path open, nevyžaduje eject).

## Jak spustit
```bash
npm install --legacy-peer-deps
npm start                    # LAN mode — DOPORUČENO (telefon i PC na stejné síti)
npm run start:usb            # USB kabel: spustí adb reverse + localhost Metro
npm run start:fresh          # LAN mode + --clear (použij po změně balíčků)
npm run start:tunnel         # NEPOUŽÍVAT — Expo tunnel infrastruktura je nespolehlivá
npm test                     # Jest unit testy (25 testů, suite streaks + week)
npm run typecheck            # tsc --noEmit
npm run lint                 # ESLint
npm run db:generate          # Drizzle — vygeneruje nové SQL migrace ze schématu
```

### Připojení telefonu (LAN mode) — ověřený postup
1. PC i Android musí být na **stejné síti** (PC na Ethernetu, telefon na WiFi — stačí stejný router)
2. Spusť `npm start` a **počkej** než terminál zobrazí `Android Bundled XXXXX ms`
3. Teprve po bundlingu scannuj QR kód v Expo Go
4. Port může být 8081 nebo 8082/8083 — to je normální, QR kód obsahuje správný port

### Windows Firewall — nutná jednorázová konfigurace
Po instalaci **Docker Desktop** (nebo jiného software s Hyper-V) se Windows Firewall resetuje
a smaže výjimky pro Node.js. Bez výjimky telefon nemůže stáhnout bundle.

**Oprava (jednou, jako Admin):**
```powershell
# PowerShell jako správce (Win+X → Terminal Admin):
New-NetFirewallRule -DisplayName "Expo Metro - Node.js" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8081-8083 -Program "C:\Program Files\nodejs\node.exe" -Profile Private,Domain,Public
```

Ověření:
```powershell
Get-NetFirewallRule -DisplayName "Expo Metro - Node.js" | Get-NetFirewallPortFilter
```

### Proč ne --tunnel
Expo SDK 54 používá vlastní `@expo/ws-tunnel` (nahradil ngrok). Tato infrastruktura je
nespolehlivá — hází `TypeError: Cannot read properties of undefined (reading 'body')`.
Error message zmiňuje ngrok historicky, příčina je na straně Expo serverů.

### Proč ne --clear v defaultním startu
`--clear` maže Metro cache → první bundle compile trvá 26+ sekund → Expo Go vyprší timeout
před stažením → `Failed to download remote update`. Použí `npm run start:fresh` jen po
změně balíčků nebo babel/metro configu.

## Tech stack
- **Expo SDK 54** (managed workflow, new architecture enabled)
- **Expo Router v6** (file-based), React Native 0.81.5, React 19
- **TypeScript strict** + `noUncheckedIndexedAccess`
- **react-native-paper** (Material 3, light/dark)
- **drizzle-orm** nad **expo-sqlite v16** — typovaná data vrstva
- **Zustand** pro globální stav (plochý store, odvozená data v selektorech)
- **expo-notifications** — persistent ongoing notifikace (náhrada widgetu pro v1)
- **react-native-reanimated v4** + **react-native-worklets@0.5.1** (peer dep reanimated v4)
- **react-native-web@^0.21.0** — peer dep expo-router v6 (nutný i pro Android vývoj)
- **date-fns**, expo-haptics, expo-file-system, expo-sharing, expo-document-picker
- **Jest / jest-expo** — unit testy doménové logiky

## Struktura projektu
```
app/
├── (tabs)/
│   ├── _layout.tsx          # bottom tab navigátor (4 taby: Aktivity/Přehledy/Streak/Profil)
│   ├── index.tsx            # Aktivity — weekly tracker (hlavní obrazovka)
│   ├── stats.tsx            # Přehledy — statistiky + heatmapa
│   ├── streak.tsx           # Streak — denní streak + tier systém
│   └── settings.tsx         # Profil — nastavení + export/import
├── activity/
│   ├── new.tsx              # Přidat aktivitu (modal)
│   └── [id].tsx             # Upravit aktivitu (modal)
├── onboarding.tsx           # 3-krokový onboarding (první spuštění)
└── _layout.tsx              # root layout — PaperProvider, useDbInit, gesture handler

src/
├── db/
│   ├── schema.ts            # Drizzle schema (activities, completions)
│   ├── client.ts            # drizzle(openDatabaseSync(...))
│   ├── useDbInit.ts         # React hook: migrace + seed při prvním spuštění
│   └── migrations/
│       ├── migrations.js    # ⚠️ SQL INLINE jako string (ne import .sql souboru)
│       ├── 0000_curly_blob.sql
│       └── meta/_journal.json
├── data/
│   ├── activityRepo.ts      # getAll, insert, update, archive, remove
│   └── completionRepo.ts    # forWeek, toggle (insert/delete), forRange
├── domain/
│   ├── types.ts             # Activity, Completion, WeekProgress, Streak, DayOfWeek (0=Po)
│   ├── week.ts              # weekDates, mondayOf, todayIso, maskFromDays, daysFromMask
│   └── streaks.ts           # computeDailyStreak, computeWeeklyStreak, computeActivityStreak
│                            # + computeCurrentActivityStreak (per-aktivita streak)
├── store/
│   ├── useAppStore.ts       # Zustand — activities, completions, currentWeekStart, toggleCompletion
│   └── useSettingsStore.ts  # Zustand persist (AsyncStorage) — onboarding, theme, weekStart
├── ui/
│   ├── theme.ts             # lightTheme, darkTheme, activityPalette (accent+pastel páry)
│   │                        # + getPastelColor() helper
│   └── components/
│       ├── ActivityRow.tsx  # bílá karta aktivity — čtvercová ikona (solid color), Everyday tag, streak pod názvem
│       ├── DayCheckbox.tsx  # kruhový checkbox 34px (scheduled/bonus/completed/today)
│       ├── TabIcons.tsx     # vlastní SVG ikony pro floating pill (Home/Stats/Streak/Profile)
│       ├── CircularProgress.tsx  # SVG kruhový progress (react-native-svg)
│       ├── HabitHeatmap.tsx      # 15týdenní GitHub-style heatmapa
│       ├── StreakBadge.tsx        # streak badge komponenta
│       └── WeekHeader.tsx        # záhlaví týdne (starý, nahrazen inline v index.tsx)
├── i18n/
│   └── cs.ts                # veškeré UI texty + funkce pro plurály
└── utils/

__tests__/
├── streaks.test.ts          # 17 test cases pro streak logiku
└── week.test.ts             # 8 test cases pro week/day funkce
```

## Klíčová rozhodnutí — NEZDŮVODŇUJ ZNOVU

### Datum jako lokální ISO string
`date` v `completions` je `"yyyy-MM-dd"` v lokální timezone (ne UTC epoch).
Funkce `todayIso()` v `src/domain/week.ts` používá `format(new Date(), 'yyyy-MM-dd')` z date-fns.
Tímto se streaky nerozbijí při cestování přes timezony.

### DayOfWeek 0 = Pondělí
`DayOfWeek = 0|1|2|3|4|5|6` kde 0 = Po, 6 = Ne.
`scheduledDaysMask` bitmaska: bit 0 = Po, bit 6 = Ne.
Funkce `maskFromDays`, `daysFromMask` jsou v `src/domain/week.ts`.

### Drizzle migrace — inline SQL
`src/db/migrations/migrations.js` obsahuje SQL jako **inline string**, ne `import '*.sql'`.
Důvod: Metro v Expo SDK 54 importuje `.sql` jako asset (číslo/URI), ne string → Drizzle migrátor pak selže s "failed to parse migration".
**Když přidáš novou migraci:** zkopíruj SQL z `.sql` souboru jako string do `migrations.js`.

### react-native-web (peer dep expo-router v6)
`expo-router v6` vyžaduje `react-native-web` jako peer dependency — potřebuje ho pro generování
sitemap, 404 stránky a web bundlu i při vývoji pro Android. Bez něj Metro hází:
`Unable to resolve "react-native-web/dist/index" from expo-router/build/renderRootComponent.js`
Balíček je v `dependencies` jako `react-native-web@^0.21.0`.

### react-native-worklets (peer dep reanimated v4)
`react-native-reanimated v4` vyžaduje `react-native-worklets@0.5.1` jako peer dependency.
⚠️ Verze musí být `0.5.1` — novější (0.9.x) není kompatibilní s reanimated 4.1.7.
Babel plugin `react-native-reanimated/plugin` interně dělá `require('react-native-worklets/plugin')`.

### Expo Go vs dev build
- **Expo Go**: funguje pro UI, navigaci, DB, seed data, onboarding
- **Dev build** (`npx expo run:android`): potřeba pro notification action buttony a plné testování notifikací

### Onboarding flow
`app/onboarding.tsx` se zobrazí při prvním spuštění. Stav uložen v `useSettingsStore`
(Zustand persist → AsyncStorage). Výběr aktivit v onboardingu vytvoří seed aktivity v DB.

### Design systém — Home screen (R2, "Habit Radar" mockup)
Domovská obrazovka (`app/(tabs)/index.tsx`) byla přepracována podle designového mockupu:

**Vizuální tokeny:**
- Pozadí obrazovky: `#FAF8F5` (teplá krémová, ne šedá `#F7F7F7`)
- Header: zelený hamburger (`COLORS.primary`) + "Habit **Radar**" (tmavá+zelená dual-color) + ☀️ v `#FFF3D4` kroužku
- Tab filtry: Today / Weekly / Monthly / Overall (anglicky v design tokenech)
- Summary karta: **plná zelená** (`COLORS.primary`), bílý SVG kroužek (progress), veškerý text bílý
- Sekce header: "VAŠE NÁVYKY" vlevo + "X aktivní" vpravo (malá šedá písmena, letterSpacing)

**ActivityRow:**
- Karta: bílá (`#FFFFFF`), `borderRadius: 16`, subtle shadow (`elevation: 2`)
- Ikona aktivity: **čtvercová** (`50×50`, `borderRadius: 14`), solid barva aktivity (ne pastel)
- Layout: `[ikona] | [název\n🔥 streak] | [Everyday pill]`
- Tag: `#F0F0F0` pozadí, `borderRadius: 20`, šedý text

**DayCheckbox:** kruhy zvětšeny z 30 → **34px**

**Tab bar (floating pill):**
- `TAB_PILL_HEIGHT = 80`, `TAB_BAR_SPACE = 100`
- Aktivní tab: `borderRadius: 44` (plně kulatý pill), zelené pozadí `COLORS.primaryLight`
- Neaktivní ikony: `#5A6270` (tmavě šedá, ne světlá `#BDBDBD`)
- **Ikony: vlastní SVG** ze souborů designu (`src/ui/components/TabIcons.tsx`)
  - `HomeTabIcon` — viewBox 45×45, single path
  - `StatsTabIcon` — viewBox 45×43, path fill-rule evenodd (3 sloupce)
  - `StreakTabIcon` — viewBox 45×45, path s fill + stroke (oboje driven by `color` prop)
  - `ProfileTabIcon` — viewBox 45×45, 2 paths (hlava + tělo)
  - Každá přijímá `{ color: string; size: number }` — barva se přepíná centrálně v `_layout.tsx`
  - `MaterialCommunityIcons` již není potřeba pro tab bar

### Firewall po Docker/Hyper-V instalaci
Instalace Docker Desktop povoluje Hyper-V a resetuje Windows Firewall výjimky.
Bez pravidla pro `node.exe` na portech 8081-8083 telefon nemůže stáhnout bundle.
Pravidlo se přidává jednorázově jako admin (viz sekce "Jak spustit" výše).

## Stav implementace
```
[x] 1.  Setup (Expo SDK 54, TS strict, Router v6, ESLint/Prettier)
[x] 2.  DB vrstva (Drizzle schema, expo-sqlite v16, repositories, seed)
[x] 3.  Domain logika + unit testy (streaks, week — 25 testů)
[x] 4.  Theme + komponenty (ActivityRow, DayCheckbox, CircularProgress, HabitHeatmap)
[x] 5.  Home obrazovka (weekly tracker, week navigation, summary card)
[x] 6.  Add/Edit Activity (modal formulář, emoji/barva/dny, long-press menu)
[x] 7.  Statistiky + heatmapa (Stats screen, 15-week heatmap, per-activity bars)
[x] 8.  Onboarding (3-krokový flow, výběr aktivit, AsyncStorage persistence)
[x] R.  Redesign UI (nový design systém, 4 taby, pastelové karty, streak tier systém)
[x] R2. Home screen redesign (Habit Radar mockup) — viz sekce "Design systém" níže
[ ] 9.  Persistentní notifikace (Android)
[ ] 10. Export/Import JSON
[ ] 11. Nastavení (funkční — theme, week start, streak goal)
[ ] 12. Polish (animace, haptika, a11y)
```

## Časté příkazy
```bash
# Reset DB (dev) — smazat app data na telefonu/emulátoru
# useDbInit.ts seeduje při prázdné DB automaticky

# Nová Drizzle migrace po změně schema.ts:
npm run db:generate
# → zkopíruj nový SQL z src/db/migrations/<tag>.sql jako string do migrations.js

# Spustit jen streaks testy:
npx jest __tests__/streaks.test.ts --verbose

# Zkontrolovat verze balíčků:
npx expo install --check

# Zabít staré Metro instance (pokud port obsazen):
# PowerShell: Stop-Process -Id (Get-NetTCPConnection -LocalPort 8081 -State Listen).OwningProcess -Force
```
