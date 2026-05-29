# Mission Tracker — Claude Code context

## Co je tento projekt
Mobilní appka pro sledování týdenních aktivit a budování návyků.
Primárně Android, cross-platform codebase (iOS path open, nevyžaduje eject).

## Jak spustit
```bash
npm install --legacy-peer-deps
npm start                    # LAN mode (telefon i PC na stejné WiFi) — DOPORUČENO
npm run start:usb            # USB kabel: adb reverse tcp:8081 tcp:8081 + localhost
npm run start:tunnel         # NEPOUŽÍVAT — Expo tunnel infrastruktura je nespolehlivá
npm test                     # Jest unit testy (25 testů, suite streaks + week)
npm run typecheck            # tsc --noEmit
npm run lint                 # ESLint
npm run db:generate          # Drizzle — vygeneruje nové SQL migrace ze schématu
```

### Připojení telefonu (LAN mode)
1. PC i Android musí být na **stejné WiFi**
2. `npm start` — v QR kódu bude `exp://192.168.x.x:8081`
3. Pokud Expo Go nevidí PC: otevři Windows Defender Firewall → povolit `node.exe` na privátních sítích
4. Alternativa: `npm run start:usb` s USB kabelem (adb reverse tcp:8081 tcp:8081)

### Proč ne --tunnel
Expo SDK 54 používá vlastní `@expo/ws-tunnel` (nahradil ngrok). Tato infrastruktura je nespolehlivá — hází `TypeError: Cannot read properties of undefined (reading 'body')`.
Error message zmiňuje ngrok historicky, ale příčina je na straně Expo serverů.

## Tech stack
- **Expo SDK 54** (managed workflow, new architecture enabled)
- **Expo Router v6** (file-based), React Native 0.81.5, React 19
- **TypeScript strict** + `noUncheckedIndexedAccess`
- **react-native-paper** (Material 3, light/dark)
- **drizzle-orm** nad **expo-sqlite v16** — typovaná data vrstva
- **Zustand** pro globální stav (plochý store, odvozená data v selektorech)
- **expo-notifications** — persistent ongoing notifikace (náhrada widgetu pro v1)
- **react-native-reanimated v4** + **react-native-worklets** (peer dep reanimated v4)
- **date-fns**, expo-haptics, expo-file-system, expo-sharing, expo-document-picker
- **Jest / jest-expo** — unit testy doménové logiky

## Struktura projektu
```
app/
├── (tabs)/
│   ├── _layout.tsx          # bottom tab navigátor
│   ├── index.tsx            # Tento týden (hlavní obrazovka)
│   ├── stats.tsx            # Statistiky
│   └── settings.tsx         # Nastavení
├── activity/
│   ├── new.tsx              # Přidat aktivitu (modal)
│   └── [id].tsx             # Upravit aktivitu (modal)
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
├── store/
│   └── useAppStore.ts       # Zustand — activities, completions, currentWeekStart, toggleCompletion
├── ui/
│   ├── theme.ts             # lightTheme, darkTheme, activityColors[]
│   └── components/
│       ├── ActivityRow.tsx  # řádek aktivity + 7 checkboxů
│       ├── DayCheckbox.tsx  # jednotlivý checkbox (scheduled/bonus/completed/today)
│       └── WeekHeader.tsx   # 7 sloupců dnů + šipky navigace
├── i18n/
│   └── cs.ts                # veškeré UI texty (struktura pro pozdější en)
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
`react-native-reanimated v4` vyžaduje `react-native-worklets` jako peer dependency.
Babel plugin `react-native-reanimated/plugin` interně dělá `require('react-native-worklets/plugin')`.
Oba balíčky jsou v `package.json` a instalují se s `--legacy-peer-deps`.

### Expo Go vs dev build
- **Expo Go**: funguje pro UI, navigaci, DB, seed data
- **Dev build** (`npx expo run:android`): potřeba pro notification action buttony a plné testování notifikací

## Stav implementace
```
[x] 1.  Setup (Expo SDK 54, TS strict, Router v6, ESLint/Prettier)
[x] 2.  DB vrstva (Drizzle schema, expo-sqlite v16, repositories, seed)
[x] 3.  Domain logika + unit testy (streaks, week — 25 testů)
[x] 4.  Theme + komponenty (ActivityRow, DayCheckbox, WeekHeader)
[x] 5.  Home obrazovka (weekly tracker, FAB, navigace týdnů)
[x] 6.  Add/Edit Activity (modal formulář, emoji/barva/dny, long-press menu)
[ ] 7.  Statistiky + heatmapa
[ ] 8.  Nastavení
[ ] 9.  Persistentní notifikace (Android)
[ ] 10. Export/Import JSON
[ ] 11. Polish (animace, haptika, a11y)
```

## Časté příkazy
```bash
# Reset DB (dev) — smazat app data v emulátoru nebo:
# V kódu: useDbInit.ts obsahuje DEV seed, smazání node_modules/.expo nestačí,
# musíš smazat app data na telefonu/emulátoru

# Nová Drizzle migrace po změně schema.ts:
npm run db:generate
# → zkopíruj nový SQL z src/db/migrations/<tag>.sql jako string do migrations.js

# Spustit jen streaks testy:
npx jest __tests__/streaks.test.ts --verbose
```
