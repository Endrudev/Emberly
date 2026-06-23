# Mission Tracker — Claude Code context

## Co je tento projekt
Mobilní appka pro sledování týdenních aktivit a budování návyků.
Primárně Android, cross-platform codebase (iOS path open, nevyžaduje eject).

## Obsidian vault — dokumentace projektu
Kompletní dokumentace projektu (produkt, architektura, design, provoz, myšlení) žije v Obsidian vaultu:
**`C:\Users\ondra\Desktop\_obsidianProjects\Mission-Tracker\`**

Hub note (rozcestník pro vše): `00-index.md`

Struktura vaultu:
- `product/` — vize, persony, business rules, glossary, user journeys
- `architecture/` — tech stack, state management, navigace
- `database/` — schema, migrace
- `domain/` — typy, konvence, streak logika
- `design/` — design systém, principy, design reference (screenshoty), component inventory
- `screens/` — home, onboarding, activity form, stats, streak screen
- `dev/` — dev setup, testing strategy, debugging playbook
- `widgets/` — Android widget plán
- `thinking/` — open questions, lessons learned, backlog (nápady)
- `marketing/` — produktová analýza, naming, ASO, kanály, taktiky, launch timeline (hub: `00-marketing-index.md`)

**Pravidla pro práci s vaultem:**
- Vault je expandovaná forma dokumentace — CLAUDE.md zůstává SSOT pro technická pravidla
- Při konfliktu mezi vaultem a CLAUDE.md vyhrává CLAUDE.md
- Nové poznámky piš přes `Write` tool na absolutní cestu (MCP obsidian server má bug při zápisu do podsložek — node se zasekne)
- Dodržuj konvence existujících poznámek: frontmatter `tags` + `last_updated`, sekce oddělené `---`, `## Viz také` s wikilinks na konci

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

### Animace — žádný spring/bounce na press feedback
`AnimatedToggle` i `AnimatedPressable` (sdílené napříč appkou) používají na press-out/release
**`withTiming` + `Easing.out`, ne `withSpring`**. Důvod: nedotlumený spring (`damping`/`stiffness`
poměr < 1) viditelně "kýval" při každém uvolnění tlačítka. Pokud přidáváš novou animovanou
komponentu s touch feedbackem, dodržuj stejné pravidlo — smooth ease, žádný overshoot.

### Expo Go vs dev build
- **Expo Go**: funguje pro UI, navigaci, DB, seed data, onboarding funnel
- **Dev build** (`npx expo run:android`): potřeba pro notification action buttony, plné testování notifikací a **widget** (`react-native-android-widget`, `widget-pin`)
- ⚠️ **Custom native moduly v Expo Go = crash při importu, ne při použití.** `react-native-android-widget` (na new architecture) a vlastní `widget-pin` modul dělají `TurboModuleRegistry.getEnforcing(...)`, což vyhodí synchronní chybu **hned při `require`**, ne až při zavolání funkce. Pokud je takový import na top-level nějakého souboru, který se eagerly importuje (typicky `app/_layout.tsx`), spadne **celý root layout při startu appky** — vypadá to jako "appka se nenačte", ne jako chyba konkrétní funkce.
  **Řešení:** `require()` (ne statický `import`) uvnitř `try/catch`, voláno lazy (až při skutečném použití, ne na modulu top-level). Viz `app/_layout.tsx` (registrace widget task handleru), `src/widget/pinWidget.ts`, `src/ui/components/WidgetShowcasePreview.tsx`.

### Onboarding funnel
Dlouhý personalizovaný funnel (`app/funnel/` + `src/funnel/`) nahradil starý 3-krokový
`app/onboarding.tsx`. Step-machine: `FUNNEL_STEPS` pole v `src/funnel/steps/index.ts` určuje
pořadí obrazovek, `FunnelEngine.tsx` drží aktuální index (persistovaný přes `useFunnelStore`,
resume po zabití appky), `FunnelScreen.tsx` je sdílená kostra (progress bar + CTA).
- **Dočasné odpovědi** žijí v `useFunnelStore` (zustand persist), aplikují se na appku
  (seed návyků, `reminderTime`) až na konci (`applyFunnelAnswers.ts`), pak se store resetuje.
  Store má vlastní `merge` funkci — při změně tvaru `FunnelAnswers` (nové pole) by jinak starý
  persistovaný záznam způsobil `undefined.length` crash; merge doplní chybějící klíče z defaultů.
- **Progress bar přežívá remount mezi kroky** přes modulovou `makeMutable` shared value
  (`src/funnel/funnelProgress.ts`) — `useSharedValue` uvnitř `FunnelScreen` by se jinak při
  každém přechodu (i zpět) inicializoval znovu na 0.
- **Dev-only reset**: Nastavení → "Restartovat onboarding (dev)" (`__DEV__` gated) nastaví
  `onboardingCompleted = false` a přesměruje na `/funnel` — bez něj je nutné mazat celé úložiště
  appky, aby šel funnel projít znovu (tlačítko "Resetovat všechna data" maže jen DB, ne tenhle flag).
- **Emberly assety** (`assets/emberly/*.png`) měly vpečený checkerboard vzor jako opaque pixely
  (žádný alfa kanál, `mode: RGB`) — vypadalo to jako "průhlednost" v náhledu, ale na zařízení to
  byl viditelný box. Opraveno flood-fillem od okrajů obrázku (ne barevným prahováním, aby
  nezmizely izolované bílé highlighty v očích apod.). Při dalším re-exportu z Figmy/AI nástroje
  zkontrolovat, že frame/artboard nemá fill, a po exportu ověřit `mode` (musí být `RGBA`).

### Android Auto Backup (perzistence dat přes reinstalaci)
`allowBackup` je explicitně `true` v `app.json` (`android.allowBackup`) — Auto Backup zálohuje
výchozí fileset (SQLite DB + AsyncStorage) na Google Drive uživatele, ~1×/24h při nabíjení+Wi-Fi.
Žádný backend, žádná změna Data Safety/Privacy deklarací (zálohuje se na účet uživatele, ne k nám).
- **WAL checkpoint na pozadí** (`src/db/useWalCheckpoint.ts`) — `expo-sqlite` běží ve WAL módu,
  takže čerstvé zápisy mohou žít jen v `-wal`/`-shm`, které se nezálohují. Při `AppState` přechodu
  do `'background'` se synchronně (`execSync`, ne async — proces může být uspán dřív, než by
  promise doběhla) zavolá `PRAGMA wal_checkpoint(TRUNCATE)`, ať je hlavní `.db` self-contained.
- **Rozhodnutí: obnova `onboardingCompleted=true` se NEPŘEPISUJE.** Po reinstalaci s obnovenými
  daty uživatel přeskočí funnel i paywall — to je záměr (seamless návrat k vlastním datům;
  paywall/entitlement stejně řeší RevenueCat, ne onboarding flag). Re-show paywallu po reinstalaci
  jako vědomá monetizační páka je možné řešení do budoucna, ale vědomě NEimplementováno.
- Připomínky se re-armují samy při startu appky (`useReminderSync`) — OS notifikace se nezálohují,
  ale `remindersEnabled`/`reminderTime` ano, takže se naplánují znovu z obnoveného nastavení.
- **Explicitní backup rules** (`plugins/withAndroidBackupRules.js`, config plugin přes
  `withAndroidManifest` + `withDangerousMod`, zapisuje `res/xml/backup_rules.xml` +
  `res/xml/data_extraction_rules.xml`) — výchozí fileset zálohuje CELÉ `files/`, což se na
  reálném zařízení potvrdilo jako problém: dev build měl ve `files/` `BridgelessReactNativeDevBundle.js`
  (~15 MB, RN bridgeless JS bundle cache), který se zálohoval celý zbytečně. Explicitní include-only
  pravidla (jen `files/SQLite/`, `databases/`, `shared_prefs/`) zmenšila reálnou zálohu na ~62 KB.
  V produkci tenhle konkrétní soubor nevznikne, ale stejné riziko hrozí jakémukoli budoucímu
  velkému souboru omylem uloženému do `files/` místo `cache/` — proto include-only, ne default.
- **POST_NOTIFICATIONS se NIKDY nezálohuje** (runtime oprávnění OS nikdy nerestoruje, bezpečnostní
  hranice) — na reálném zařízení ověřeno: po obnově `remindersEnabled=true` z AsyncStorage, ale
  `dumpsys package` ukázal `granted=false`. `useReminderSync.ts` proto před každým plánováním
  ověří skutečný stav oprávnění (`getNotificationPermissionStatus`) — pokud appka myslí, že
  připomínky jsou zapnuté, ale oprávnění chybí, tiše se zkusí znovu vyžádat; pokud se nepovede,
  `remindersEnabled` se vrátí na `false`, ať appka nikdy neukazuje neprávdu (přepínač ON bez
  reálně fungujících notifikací).

### Typografie — DM Sans (R3)
Font: **DM Sans** (`@expo-google-fonts/dm-sans`), načítán v `app/_layout.tsx` přes `useFonts`.
`FONTS` export v `src/ui/theme.ts`:
```typescript
export const FONTS = {
  semiBold:  'DMSans_600SemiBold',   // weight 600
  bold:      'DMSans_700Bold',       // weight 700
  extraBold: 'DMSans_800ExtraBold',  // weight 800
} as const;
```
Paper theme používá `configureFonts({ config: { fontFamily: FONTS.semiBold } as any })` jako základ.

**Typografická tabulka (home screen):**
| Prvek | Family | Size | LetterSpacing |
|---|---|---|---|
| Page title | extraBold | 28 | -0.56 |
| Hero label (TENTO TÝDEN) | bold | 11 | +0.88 (uppercase) |
| Hero číslo 24/28 | extraBold | 23 | -0.46 |
| Hero % v kroužku | extraBold | 15 | -0.30 |
| Section label (VAŠE NÁVYKY) | extraBold | 12 | +0.96 (uppercase) |
| Název návyku | bold | 16.5 | -0.165 |
| Streak text | semiBold | 12.5 | — |
| Freq pill | semiBold | 11.5 | — |
| Aktivní tab | bold | 14 | — |
| Neaktivní tab | semiBold | 14 | — |
| Den v týdnu | semiBold/bold | 10.5 | — |

### Design systém — Home screen (R2/R3)
Domovská obrazovka (`app/(tabs)/index.tsx`) — seznam návyků je **virtualizovaný `Reanimated.FlatList`**
(`renderItem` + `ListHeaderComponent` pro sekci + `ListEmptyComponent` pro prázdné stavy).
Pozn.: historicky byl ScrollView (kvůli grouped card), ale kvůli sekání scrollu ve Weekly
(stovky `DayCheckbox` view + transform vrstva přes celý obsah) jsme se vrátili k FlatListu.
Kolabující hlavička je **absolutní overlay** posouvaný `translateY` (čistě transform, žádná
per-frame layout animace `height`) — scroll-driven přes `useAnimatedScrollHandler` na UI threadu.

**Vizuální tokeny:**
- Pozadí obrazovky: `#ECEDE8` (teplá šedozelená)
- Tab filtry: Today / Weekly / Monthly / Overall
- Summary karta: **plná zelená** (`COLORS.primary`), bílý SVG kroužek (progress), veškerý text bílý
- Sekce header: "VAŠE NÁVYKY" vlevo + "X aktivní" vpravo

**Summary karta:**
- `borderRadius: 22`, `paddingVertical: 15`, `paddingHorizontal: 18`, `gap: 16`
- Kroužek `size: 56`, `strokeWidth: 6`

**ActivityRow (R3 — grouped card):**
- Aktivity jsou v **jedné bílé kartě** (`borderRadius: 22`, shadow `elevation: 2`)
- `ActivityRow` nemá vlastní card — je transparentní row uvnitř `groupCard`
- Odděleny hairline separátorem `rgba(0,0,0,0.06)` (tmavý: `rgba(255,255,255,0.06)`)
- Badge: **42×42**, `borderRadius: 13`, solid barva aktivity
- Row padding: `paddingVertical: 14`, `paddingHorizontal: 16`
- Prop `isLast?: boolean` — poslední řádek bez separátoru

**DayCheckbox:** kruhy **28px** (z 34px → 24px → 28px), label 10.5px, zatržítko 14px

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

### Android widget (react-native-android-widget)
Home screen widget v `src/widget/` (MissionWidget.tsx layout, widgetData.ts DB agregátor, widgetTaskHandler.ts headless task). Běží jako **Headless JS** v app procesu → přímý SQLite přístup.
- **Velikost: app.json + `android/.../xml/widgetprovider_missionwidget.xml` MUSÍ být v sync.** Prebuild generuje XML z app.json — úprava jen XML se po rebuildu vrátí. Aktuálně 4×3 (`targetCellWidth 4`, `targetCellHeight 3`).
- **Horizontální scroll nejde** (RemoteViews) → návyky stránkované šipkami (`clickAction WIDGET_PAGE`, stránka přes `clickActionData`, stateless).
- **Plynulé animace nejdou** (RemoteViews) — wow efekty patří do appky. Viz vault `widgets/widget-animations-research.md`.
- **Rychlé ladění layoutu:** dev obrazovka `app/widget-preview.tsx` (`WidgetPreview` = pixel-identický náhled) + `adb screencap`, bez rebuildů. Rebuild jen při změně velikosti.
- **Sekce potřebují `width: 'match_parent'`** — LinearLayout je jinak nechá wrap_content/vlevo.
- Kompletní dokumentace: vault `widgets/android-widget-plan.md`.

### Firewall po Docker/Hyper-V instalaci
Instalace Docker Desktop povoluje Hyper-V a resetuje Windows Firewall výjimky.
Bez pravidla pro `node.exe` na portech 8081-8083 telefon nemůže stáhnout bundle.
Pravidlo se přidává jednorázově jako admin (viz sekce "Jak spustit" výše).
**Rychlá náhrada bez admin práv:** USB tunel `adb reverse tcp:8081 tcp:8081` + spustit app přes
`missiontracker://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081`.

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
[x] R3. DM Sans font + typography tokens + grouped activity card + #ECEDE8 BG
[x] 9.  Persistentní notifikace (Android) — lokální L1/L2 připomínky (src/notifications/)
[x] 13. Onboarding funnel (17 obrazovek, 6 fází) — nahradil starý 3-krokový onboarding
[x] 14. Android home screen widget (4×3 + 4×2) + pin-to-home (widget-pin modul)
[ ] 10. Export/Import JSON
[ ] 11. Nastavení (funkční — theme, week start, streak goal)
[ ] 12. Polish (animace, haptika, a11y)
[ ] 15. RevenueCat — nahradit placeholder paywall (krok 17 funnelu), monetizace
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
