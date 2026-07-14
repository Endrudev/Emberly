# Emberly — Claude Code context

## Co je tento projekt
Mobilní appka pro sledování týdenních aktivit a budování návyků.
Primárně Android, cross-platform codebase (iOS path open, nevyžaduje eject).

## Obsidian vault — dokumentace projektu
Kompletní dokumentace projektu (produkt, architektura, design, provoz, myšlení) žije v Obsidian vaultu:
**`C:\Users\ondra\Desktop\_obsidianProjects\Emberly\`**

Hub note (rozcestník pro vše): `00-index.md`

**Zálohování vaultu:** vault je zrcadlený jako samostatný git repozitář **Emberly-docs**,
pravidelně commitovaný a pushovaný do **soukromého** GitHub repa
(`github.com/Endrudev/Emberly-docs`) — nezávisle na tomto kódovém repozitáři. Na jiných
zařízeních (jiný Windows profil) může být zrcadlo naklonované na jiné cestě
(např. `C:\Users\Ondřej\Desktop\_localRepos\Emberly-docs\Emberly\`) — pokud vault na
očekávané cestě `ondra\...` neexistuje, zkontroluj, jestli zařízení místo toho nemá
naklonované tohle git zrcadlo.

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

### Postup — jak se k vaultu dostat a pracovat s ním na libovolném zařízení

1. **Najdi vault.** Zkus primární cestu `C:\Users\ondra\Desktop\_obsidianProjects\Emberly\`.
   Pokud na tomhle stroji neexistuje (jiný Windows profil), hledej git zrcadlo — typicky
   `...\_localRepos\Emberly-docs\Emberly\`. Pokud není naklonované ani to, naklonuj ho:
   ```bash
   git clone https://github.com/Endrudev/Emberly-docs.git
   ```
   (soukromé repo — potřebuje oprávněný GitHub účet/token).
2. **Čti od rozcestníku.** Otevři `00-index.md` (nebo `marketing/00-marketing-index.md` pro
   marketing sekci) a odtud sleduj `[[wikilinky]]` — název odkazu = název souboru bez přípony
   `.md`, hledej ho v odpovídající podsložce (Glob/Grep, pokud přesná cesta není jasná).
3. **Uprav nebo přidej poznámku.** Piš přes `Write` tool na absolutní cestu (ne MCP obsidian
   server — viz bug výše). Zachovej konvence: frontmatter (`tags`, `last_updated`), sekce
   oddělené `---`, `## Viz také` s wikilinky na konci souboru. Aktualizuj `last_updated`.
4. **Před zálohou zkontroluj drift.** Než uděláš commit+push (v appce i ve vaultu), projdi,
   jestli mezi vaultem a skutečným stavem appky/kódu/Play Console nevznikl rozpor — checklist
   položka označená jako nehotová, ale reálně už hotová (nebo naopak), zastaralá URL/hodnota,
   nové rozhodnutí, které vault ještě nezná. Pokud ano, oprav to **v téže dávce**, ne jako
   samostatný úkol později — commit/push je přirozený checkpoint na sync dokumentace se
   realitou, nevynechávej ho jen proto, že o drift nikdo výslovně nepožádal.
5. **Zazálohuj (commit + push).** Po netriviální dávce úprav (ne po každém řádku):
   ```bash
   cd <cesta ke git zrcadlu Emberly-docs>
   git add Emberly/
   git commit -m "docs: <stručný popis změny>"
   git push origin main
   ```
   Push je vždy potřeba potvrdit s uživatelem předem (zásah do sdíleného vzdáleného repa),
   pokud to explicitně nepovolil pro celou konverzaci.

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

### Preview build — instalovatelné APK pro testery (mimo Expo Go)
Pro sdílení appky s beta testery (Reddit nábor, kamarádi) bez Expo Go a bez Google Play —
`eas.json` už má profil `preview` (internal distribution, `buildType: apk`).

```bash
npx eas-cli build --profile preview --platform android
```

⚠️ **Použij `npx eas-cli`, ne holé `eas`** — global `eas` CLI není na tomhle stroji
nainstalované/na PATH, takže samotné `eas build ...` spadne na "not recognized". `npx eas-cli`
funguje bez globální instalace (stáhne/spustí balíček přes npx).

Po dokončení buildu (cloud, pár minut) EAS vrátí odkaz na stažení `.apk` — pošli ho přímo
testerovi, nemusí mít Expo Go ani být na Play Store testing tracku. Vyžaduje `eas login`
(jednou na zařízení) a projekt už je přes `eas.json` napojený.

Pro **produkční signed AAB** (Play Store Closed testing, viz vault `dev/release-checklist.md`):
```bash
npx eas-cli build --profile production --platform android
```

⚠️ **Před vydáním tohohle příkazu vždy nejdřív posoudit a zvýšit verzi appky.** Kdykoli
uživatel řekne, že chce nový produkční build (nebo přímo požádá o tenhle command), projdi
změny od poslední verze (git log od posledního version bumpu, ne jen poslední zprávu v
konverzaci) a podle velikosti změn navrhni/proveď bump v **obou** místech:
- `app.json` → `expo.version`
- `android/app/build.gradle` → `versionName` (řádek `versionCode` NECHAT beze změny —
  to řeší EAS `autoIncrement` sám vzdáleně, viz `eas.json` `appVersionSource: remote`)

Velikost bumpu podle skutečné povahy změn (semver), ne automaticky vždy PATCH:
- Drobné opravy/kosmetika/malá vylepšení → **PATCH** (`0.1.0` → `0.1.1`)
- Nová funkce / netriviální změna chování (i bez breaking change) → **MINOR** (`0.1.1` → `0.2.0`)
- Zásadní/nekompatibilní změna → **MAJOR** (zatím nerelevantní, appka je pre-1.0)

Viz i vault `dev/beta-feedback-workflow.md` sekce "Verzování a buildy (EAS)".

### Nové zařízení / Windows profil — přihlas Expo CLI (jednorázově)
Na stroji, kde ještě nikdy neběžel `npx expo`, může být CLI nepřihlášené k Expo účtu.
`expo start` pak čeká na interaktivní přihlašovací prompt a v neinteraktivním terminálu
(spuštěno na pozadí/skriptem) spadne s `CommandError: Input is required, but 'npx expo' is
in non-interactive mode`. Navenek to vypadá úplně stejně jako síťový problém — Expo Go furt
hlásí stejnou `IOException: Failed to download remote update`, protože server se buď vůbec
nerozjel, nebo krátce po startu spadl.

**Fix (jednou na každém novém zařízení, před prvním `npm start`):**
```bash
npx expo login
```

### Připojení telefonu (LAN mode) — ověřený postup
1. PC i Android musí být na **stejné síti** (PC na Ethernetu, telefon na WiFi — stačí stejný router)
2. Spusť `npm start` a **počkej** než terminál zobrazí `Android Bundled XXXXX ms`
3. Teprve po bundlingu scannuj QR kód v Expo Go
4. Port může být 8081 nebo 8082/8083 — to je normální, QR kód obsahuje správný port
5. Pokud je na stroji Hyper-V/Docker Desktop/WSL (vlastní virtuální síťový adaptér vedle
   WiFi), Expo CLI může do manifestu vložit špatnou LAN IP — ověř `hostUri` na
   `http://localhost:8081/index.exp?platform=android&hostType=lan`, případně vynuť správnou
   IP přes `$env:REACT_NATIVE_PACKAGER_HOSTNAME = "<skutečná WiFi IP>"` před `npm start`.

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

### RevenueCat / monetizace
Předplatné přes **RevenueCat** (`react-native-purchases` + `react-native-purchases-ui`). Kód hotový,
chybí jen RC účet + Play produkty (placeholder hodnoty v `src/config/revenuecat.ts`). **Setup
tutorial krok-za-krokem ve vaultu `dev/revenuecat-setup.md`** (Play produkty → RC účet → paywall →
build → test); rychlý přehled v `screens/onboarding-funnel.md`.
- **Native modul = stejná past jako widget.** `react-native-purchases(-ui)` na new architecture
  crashují **při importu** v Expo Go, ne při použití. VŠECHEN přístup jde přes lazy `require()` v
  try/catch ve `src/purchases/purchases.ts` (`getPurchases`, `getRevenueCatUI`) — nikdy statický
  top-level import. V Expo Go / bez reálného klíče vše no-op → `isPremium=false`.
- **Paywall (krok 17 funnelu, `phase6.tsx`)**: produkce renderuje **remote** `RevenueCatUI.Paywall`
  (copy/ceny/A-B v RC dashboardu); Expo Go fallback = vestavěný custom layout (zachován). Obojí
  končí `applyFunnelAnswers` + `/(tabs)`.
- **Entitlement stav**: `src/store/usePurchasesStore.ts` (`isPremium`, dev override). Gating UI
  **vždy** přes selektor `useIsPremium()` / `selectIsPremium` (dev override má v `__DEV__` přednost).
  Sync s RC v `src/purchases/usePurchasesSync.ts` (mount + CustomerInfo listener + foreground refresh),
  mountnuto v `app/_layout.tsx`.
- **Feature gates** (čistá logika `src/purchases/gating.ts`, testy `__tests__/gating.test.ts`):
  free limit **3 návyky** (FAB na home), vyšší streak tiery (blaze+, index > 1) a pokročilé
  statistiky zamčené přes `PremiumLockCard` → `openPaywall()`. Seed návyků z funnelu limitem
  **neprochází**.
- **Přehled = dashboard** (`app/(tabs)/stats.tsx`): hero dlaždice (denní série, úspěšnost, splnění,
  aktivní dny) + přepínač období (`SegmentedPill`: týden/měsíc/vše, rolling okna 7/30/all). **Free**
  vidí dlaždice + období; **premium** odemyká trend graf (8 týdnů, % uprostřed barů, 100% bar zlatý
  jako „perfect" na home), heatmapu (konzistence), žebříček návyků (řazeno dle úspěšnosti, + per-návyk
  série) a rozpad dnů v týdnu (Po–Ne, nejlepší den zlatě + caption). Čisté agregace v
  `src/domain/insights.ts` (`computeRangeStats`, `computeWeeklyTrend`, `computeWeekdayBreakdown`,
  `computeBestWeekday`), testy `__tests__/insights.test.ts`. Přepínač období řídí dlaždice + žebříček
  (rolling okna); trend/heatmapa jsou vícetýdenní z podstaty.
- **„Streak protection" (ochrana série) je implementovaná** — viz sekce "Streak freeze (Ochrana
  série)" níže. Value stack na paywallu teď odpovídá realitě.
- **Reinstalace**: viz rozhodnutí níže (Android Auto Backup) — `onboardingCompleted` se obnoví →
  přeskočí funnel/paywall; entitlement řeší RC (re-sync z Play / restore), ne onboarding flag.

### Streak freeze (Ochrana série)
Premium uživatel má automatickou ochranu denního streaku (headline stat na Streak obrazovce) —
žádné manuální "použít ochranu" tlačítko.
- **Auto-consume, jen včerejšek.** `src/purchases/useStreakFreezeSync.ts` (mountnuto v
  `app/_layout.tsx` vedle `usePurchasesSync`/`useReminderSync`) při každém spuštění/foregroundu
  zkontroluje pouze **včerejší** den — pokud byl zmeškaný a kvóta dovolí, tiše ho zmrazí
  (`addFreeze` v `useAppStore`). Vědomě nedohledává starší zmeškané dny po delší pauze (žádné
  zpětné "dohánění" historie) — viz čistá rozhodovací funkce `decideAutoFreeze` v
  `src/domain/streakFreeze.ts`.
- **Kvóta: 2/kalendářní měsíc, bez přenosu (`STREAK_FREEZE_MONTHLY_QUOTA` v
  `src/purchases/gating.ts`).** Zbývající počet se vždy počítá z existujících záznamů
  (`freezesRemainingInMonth`), žádný mutable counter, který by mohl rozjet ze synchronizace.
- **Scope: jen denní streak.** `evaluateDay`/`computeCurrentDailyStreak`/`computeBestDailyStreak`
  v `src/domain/streaks.ts` přijímají `frozenDates: ReadonlySet<string>` (default prázdná množina
  → beze změny chování). Týdenní streak a per-aktivita streak (`computeCurrentWeeklyStreak`,
  `computeCurrentActivityStreak`) se zmrazením vědomě NEpočítají — nikde v UI nejsou headline
  metrikou, slib na paywallu se týká konkrétně Streak obrazovky.
- **Perzistence: nová tabulka `streak_freezes`** (`src/db/schema.ts`, migrace `0001`), ne
  Zustand persist — jde o append-only historická fakta 1:1 vázaná na datum, stejný tvar jako
  `completions`; jede zdarma na existující Android Auto Backup (stejný `.db` soubor).
  Repo `src/data/streakFreezeRepo.ts`, store pole `frozenDates` v `useAppStore.ts`.
- **Gating**: `canUseStreakFreeze(isPremium)` v `src/purchases/gating.ts`. UI na Streak obrazovce
  (`app/(tabs)/streak.tsx`) — vlastní freeze karta s assetem ledového plamínku (`Frozen_flame`);
  pro free uživatele má lock stav + CTA → `openPaywall()` (ne `PremiumLockCard`, ten drží jen
  zamčené statistiky ve Stats screen).
- **Streak screen redesign**: hero = velký aktuální tier badge (`TIER_BADGES` v `src/ui/streakAssets.ts`,
  sdílené s funnelem) + číslo + lineární progress k dalšímu tieru; pod tím „sbírka" všech 5 odznaků
  (earned ✓ / premium-locked 🔒 / nedosažené ztlumené); freeze karta s ledovým plamínkem. Tier badge
  assety jsou RGBA (pozadí odstraněno flood-fillem od okrajů, viz Emberly assety výše).

### Kategorie návyků a Manage Habits Mode
Kategorie jsou **čistě vizuální seskupení** (Habits view) — žádná vlastní logika/pravidla,
funkčně identické s nezařazenými návyky. Vzniklo v backlogu jako "Kategorie návyků" +
"Manage Habits Mode", teď obojí hotové a propojené.
- **Schéma**: nová tabulka `categories` (`src/db/schema.ts`, migrace `0002`) + `activities.categoryId`
  (nullable FK). `ON DELETE SET NULL` se ale **nespoléhá na SQLite FK enforcement** (appka nikde
  nezapíná `PRAGMA foreign_keys`) — `categoryRepo.delete()` explicitně nejdřív odkategorizuje
  aktivity (`UPDATE ... SET category_id = NULL`), pak teprve smaže řádek kategorie.
- **`sortOrder` (migrace `0003`)** na `activities` i `categories` — unikátní jen **v rámci
  skupiny** (kategorie, nebo "bez kategorie"), ne globálně. Řazení uvnitř skupiny přes
  `activityRepo.reorder(orderedIds)` / `categoryRepo.reorder(orderedIds)`.
  ⚠️ **Gotcha, na kterou narazit příště:** jakákoli store akce, co mění `categoryId`/`sortOrder`
  u aktivity (`setActivityCategory`, `updateActivity`), musí po patchi **znovu seřadit** lokální
  pole `activities` podle `sortOrder` (`patched.sort((a,b) => a.sortOrder - b.sortOrder)`) —
  jinak zůstane přesunutá aktivita na svém starém místě v poli, i když má nové `sortOrder`, a
  konzumenti co seskupují podle kategorie přes `.filter()` (spoléhající na pořadí pole) ji ukážou
  na špatném místě (vizuálně "nahradí" jinou položku ve stejné skupině).
- **Manage mode** (`src/ui/components/ManageHabitsView.tsx`) nahrazuje virtualizovaný FlatList,
  když je zapnutý `editMode` — drag & drop řazení je **vlastní implementace** nad
  `react-native-gesture-handler` + `reanimated` (`ReorderableGroup.tsx`), žádná knihovna navíc.
  NeVirtualizovaný záměrně (pár položek, jednodušší drag logika víc než výkon).
  ⚠️ **Gotcha #1 (drag matematika)**: offset tažení se musí počítat od **zafixované počáteční
  pozice** (zachycené jednou v `onStart`), ne přepočítávat živě z `positions.value[originalIndex]`
  při každém update — ta hodnota se sama mění, jak se posouvají ostatní řádky, takže "pohyblivá
  základna + kumulativní offset" se exponenciálně rozjíždí a tažená položka skončí vždy na konci
  seznamu bez ohledu na to, kam ji pustíš.
  ⚠️ **Gotcha #2 (NaN pozice)**: `positions` shared value se resetuje až v `useEffect` PO renderu,
  kdy se skupina zvětší (nová položka v kategorii) — na prvním renderu nové položky je
  `positions.value[originalIndex]` mimo rozsah (`undefined` → `NaN` → `withSpring` z `NaN` zůstane
  `NaN` navždy, dokud gesto hodnotu napřímo nepřepíše). Řešení: `positions.value[i] ?? i` — fallback
  na `originalIndex` je navíc přesně ta správná hodnota (identity mapping), ne jen záchranná síť.
  ⚠️ **Gotcha #3 (mezery mezi řádky)**: `ReorderableGroup` pozicuje řádky přes `top = slot *
  itemHeight` — `marginBottom` na samotném řádku je neviditelný (další řádek začíná přesně na
  `itemHeight`, ne na `výška + margin`). Mezeru je nutné zapéct přímo do `itemHeight` (`rowHeight +
  gap`), ne řešit marginem.
- **Kategorie se dají měnit i z Manage mode** (ikona 🏷️ v řádku) — otevře stejný
  `CategoryPickerSheet` jako Today/Weekly view. Není to drag mezi sekcemi (`ReorderableGroup` řadí
  jen v rámci JEDNÉ pevně-vysoké skupiny), ale tap-based přeřazení, pak se řádek přesune do nové
  sekce po zavření sheetu.

### Quick-complete tlačítka v notifikaci (L2)
Zapojeno do L2 (streak-at-risk večerní notifikace, `src/notifications/scheduler.ts`), NE jako
samostatná třetí notifikace — L1 zůstává záměrně evergreen/nezávislý na živém stavu (nativní
recurring trigger nejde bezpečně pozastavit "jen na dnešek" bez rizika zapomenutí, viz
`useReminderSync.ts`).
- Když chybí 1–2 dnešní návyky, notifikace dostane tlačítka pojmenovaná podle konkrétních návyků
  (`registerQuickCompleteCategory` — dynamicky přeregistrovaná `setNotificationCategoryAsync`
  kategorie, jde volat znovu s jiným obsahem kdykoli). Nad 2 chybějícími zůstává obecný text beze
  tlačítek (appka nemá vybírat "nejdůležitější 2" arbitrárně).
- Tap označí návyk splněný bez otevření appky (`opensAppToForeground: false`,
  `completeHabitFromNotification` volané z modulového `addNotificationResponseReceivedListener`
  v `app/_layout.tsx`, ne z React komponenty — funguje i když appku OS vzbudí jen na pozadí).
  - **1–2 zbývá** → notifikace se aktualizuje na místě (tlačítko jen pro to, co ještě zbývá).
  - **Dnešek dokončen** → notifikace zmizí, nahradí ji "🎉 Dnešek hotovo!" (náhrada za celebration
    animaci, kterou appka zavřená ukázat nemůže).
- ⚠️ **Kritické pořadí, ověřené opakovaným testováním na reálném zařízení (Samsung/Android): zápis
  do DB (`toggleCompletion`) musí DOBĚHNOUT dřív, než se zavolá cokoli z Notifications API**
  (dismiss/cancel/present). Notification API volané dřív, nebo i jen současně (`Promise.all`),
  spolehlivě "ukouslo" zápis bez jakékoli chyby v logu — proces na pozadí je zjevně reklamovaný
  Androidem, jakmile OS považuje interakci s notifikací za vyřízenou, bez ohledu na to, co appka
  v JS ještě čeká. Cena bezpečného pořadí: notifikace zmizí až ~1s po tapu (čeká na zápis), ne
  okamžitě — vědomě přijato, spolehlivost dat > ta chvilka zpoždění.
- ⚠️ **Funguje jen dokud appka běží** (na pozadí i v popředí). **Nefunguje, pokud je proces appky
  úplně killnutý** (swipe z multitaskingu) — `expo-notifications` nemá na Androidu headless
  mechanismus pro reakci na tap tlačítka bez běžící appky (na rozdíl od zobrazení notifikace
  samotné, to je čistě nativní). Oprava by vyžadovala vlastní `BroadcastReceiver` +
  `HeadlessJsTaskService` (nový nativní modul, podobný rozsah práce jako widget task handler) —
  **vědomě neimplementováno**, přijato jako omezení (pokrývá naprostou většinu reálného použití).
- Dev testovací tlačítko: Nastavení → Data → 🔔 „Otestovat quick-complete notifikaci (dev)" —
  pošle notifikaci nad živými daty appky okamžitě (`presentTestQuickCompleteNotification`),
  obchází čas 20:30 i podmínku živého streaku.

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
Home screen widget v `src/widget/` (EmberlyWidget.tsx layout, widgetData.ts DB agregátor, widgetTaskHandler.ts headless task). Běží jako **Headless JS** v app procesu → přímý SQLite přístup.
- **Velikost: app.json + `android/.../xml/widgetprovider_emberlywidget.xml` MUSÍ být v sync.** Prebuild generuje XML z app.json — úprava jen XML se po rebuildu vrátí. Aktuálně 4×3 (`targetCellWidth 4`, `targetCellHeight 3`).
- ⚠️ **`minWidth`/`minHeight` musí sedět na oficiální Android vzorec `n × 70 − 30` dp** (n = počet
  buněk), jinak launcher zaokrouhlí widget na víc buněk, než deklaruje `targetCellWidth`/
  `targetCellHeight` — ten atribut totiž platí **jen na Androidu 12+ a jen u launcherů, co ho
  respektují**; jinak (starší Android, nebo launcher co ho ignoruje) se velikost v pickeru počítá
  čistě z `minWidth`/`minHeight`. Pro 2 buňky je to **110dp**, ne o kus víc "pro jistotu" — cokoli
  nad touhle hodnotou riskuje přeskok na další buňku (reálně se to stalo: 140dp u `EmberlyWidgetRing`
  se zaokrouhlilo na 3 řádky místo 2, viz commit `e08af3a`).
- **Horizontální scroll nejde** (RemoteViews) → návyky stránkované šipkami (`clickAction WIDGET_PAGE`, stránka přes `clickActionData`, stateless).
- **Plynulé animace nejdou** (RemoteViews) — wow efekty patří do appky. Viz vault `widgets/widget-animations-research.md`.
- **Rychlé ladění layoutu:** dev obrazovka `app/widget-preview.tsx` (`WidgetPreview` = pixel-identický náhled) + `adb screencap`, bez rebuildů. Rebuild jen při změně velikosti.
- **Sekce potřebují `width: 'match_parent'`** — LinearLayout je jinak nechá wrap_content/vlevo.
- **Tři varianty:** `EmberlyWidget` (4×3, plná), `EmberlyWidget4x2` (kompakt), `EmberlyWidgetRing`
  (2×2, jen streak kruh, žádná interaktivita krom `OPEN_APP`). `updateEmberlyWidget()` pushuje
  live update po `toggleCompletion` na všechny tři paralelně (`Promise.all` +
  `requestWidgetUpdate` na widget, který zrovna není na ploše, tiše selže — zachyceno).
- Kompletní dokumentace: vault `widgets/android-widget-plan.md`.

### App icon + splash screen
`assets/icon.png` (512×512, plný čtvercový ikona — iOS/splash/store listing) vs.
`assets/icon-adaptive-foreground.png` (1024×1024, **transparentní pozadí**, postavička
zmenšená a vycentrovaná — jen pro Android launcher). `app.json`: `icon` → `icon.png`,
`android.adaptiveIcon.foregroundImage` → `icon-adaptive-foreground.png` (pozadí `#2DB54A`),
`expo-splash-screen` plugin (pozadí `#ECEDE8`, stejné jako appka).

⚠️ **Android adaptive icon safe zone: obsah musí být max ~58–61 % šířky/výšky 108×108dp
plátna** (oficiální bezpečná zóna je 66/108 = 61,1 %, reálné OEM launchery ořezávají/zoomují
ještě agresivněji, proto cílit spíš ~58 %). `icon.png` samotný je navržený jako plný čtverec (postavička ~72 % výšky plátna) — to je OK
pro iOS/splash/store, ale použitý přímo jako `foregroundImage` způsobí, že launcher masking
postavičce useřízne špičku plamene i nohy (obecná vlastnost Android adaptive icons, ne bug
konkrétní appky/knihovny). Navíc `icon.png` má **opaque bílé pozadí** (ne transparentní) — jako
`foregroundImage` by úplně překrylo `backgroundColor: "#2DB54A"` a zelené pozadí by se nikdy
nezobrazilo.
**Řešení použité teď:** samostatný `icon-adaptive-foreground.png` — flood-fill od okrajů (bílé
pozadí → transparentní, izolované bílé highlighty uvnitř postavičky zůstanou), ořez na tight
bounding box, zmenšení na ~58 % delší strany, vycentrováno na 1024×1024 transparentní plátno.
Skript (Node + `sharp`, dev dependency) není v repu — při dalších změnách maskota přegenerovat
podle stejného postupu (crop → shrink to ≤60 % → center on transparent canvas).

⚠️ **De-fringe krok navíc (2026-07-07):** samotný flood-fill nechal podél celé siluety tenký
prstenec **poloprůhledných bílo-šedých pixelů** (antialiasing vůči původnímu bílému pozadí,
< 0,4 % pixelů) — na bílém pozadí neviditelné, ale na jakémkoli barevném/tmavém pozadí appky
(ikona, screenshoty) vytvářely viditelnou bílou "svatozář" kolem obrysu. Oprava: libovolný pixel
s `0 < alpha < 255` nastavit na `alpha = 0` (žádný pokus o rekonstrukci barvy — při tak nízké
alfě je to numericky nestabilní a přestřeluje do černé). Při dalším re-exportu maskota tenhle
krok zopakovat po flood-fillu, ideálně ho rovnou zahrnout do stejného skriptu.

⚠️ **`android/` je v tomhle repu commitnutá** (kvůli widget-pin modulu) — změna `app.json` sama
o sobě launcher ikonu/splash nepřegeneruje. Po každé změně spustit:
```bash
npx expo prebuild --platform android
```
Nepotřebuje Android SDK/Gradle, jen Node/Expo CLI — stejný princip jako sync XML u widgetu výše.

### Firewall po Docker/Hyper-V instalaci
Instalace Docker Desktop povoluje Hyper-V a resetuje Windows Firewall výjimky.
Bez pravidla pro `node.exe` na portech 8081-8083 telefon nemůže stáhnout bundle.
Pravidlo se přidává jednorázově jako admin (viz sekce "Jak spustit" výše).
**Rychlá náhrada bez admin práv:** USB tunel `adb reverse tcp:8081 tcp:8081` + spustit app přes
`emberly://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081`.

## Stav implementace
> **Pre-release checklist** (vše, co musí být hotové před prvním Google Play releasem) žije ve
> vaultu: `dev/release-checklist.md` (sjednocuje legal-compliance + revenuecat-setup + launch-timeline).
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
[x] 14. Android home screen widget (4×3 + 4×2 + 2×2 ring-only) + pin-to-home (widget-pin modul)
[x] 16. Kategorie návyků + Manage Habits Mode (drag reorder, delete, quick category picker)
[x] 17. Quick-complete tlačítka v L2 notifikaci (viz sekce níže)
[ ] 10. Export/Import JSON
[ ] 11. Nastavení (funkční — theme, week start, streak goal)
[ ] 12. Polish (animace, haptika, a11y)
[~] 15. RevenueCat — kód hotový (remote paywall + entitlement + feature gates); zbývá RC účet + Play produkty (viz sekce "RevenueCat / monetizace")
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
