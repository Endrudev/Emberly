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

## Stav projektu

Emberly je aktuálně v uzavřeném testování jako MVP — základní smyčka funguje a běží u prvních
testerů, teď ladím chyby a dotahuju detaily. Něco proto ještě nemusí být dokonalé nebo se může
měnit; co je a není hotové, ukazuje sekce [Stav implementace](#stav-implementace).

## Odměnový systém a maskot

Emberly stojí na jedné krátké smyčce: **aktivita → splnění → odměna**. Nechci další složitý
tracker s projekty a subtasky, ale appku, která ti na konci náročného dne dá pocit, že se ti
povedlo. Proto je UI záměrně živé a barevné (každý návyk má svou barvu) a záměrně bez
„gamifikace pro gamifikaci" — žádné virtuální měny, levely ani žebříčky.

Odměna přichází ve čtyřech okamžicích:

- **Splnění návyku** — okamžitá odezva na tap (haptika, animace).
- **Splněný den** — při 100 % se spustí celebration s konfetami.
- **Streak tier** — denní série se překlápí přes pět úrovní (Jiskra 1–6 dní, Plamen 7–29,
  Výheň 30–59, Inferno 60–99, Legendární 100+), které na Streak obrazovce tvoří sbírku odznaků.
- **Statistiky** — heatmapa a trendy jako vizuální důkaz dlouhodobé práce.

K tomu patří **Ochrana série**: jeden zmeškaný den nemá smazat měsíce práce a otočit motivaci v
trest, takže premium uživatele automaticky chrání (2× za měsíc, jen včerejší den, bez zpětného
„dohánění" historie). Série tak zůstává smysluplná, ale ne tvrdá.

**Maskot Emberly** je plamínek — tvář appky i značky. Je v ní zatím jako statické PNG stavy
(onboarding funnel, streak odznaky, ikona), staticky přepínané podle stavu. Za vším je jedna
myšlenka: selhání habit trackeru je doslova vyhoření, a tenhle rozpor chci mít zabudovaný
přímo v maskotovi. Proto vzniklo i koncepční **alter ego Chilly** — ledový, klidný protipól
Emberly s identickou siluetou, který říká „odpočiň si, nemusíš takhle fungovat napořád". Není to
hrozba, ale druhá půlka téže bytosti (jin-jang). Chilly je zatím jen návrh a v appce ještě není;
stejně tak reaktivní animace maskota (např. přes Rive) jsou plán do budoucna, ne hotová věc.

## Co appka umí

- **Android widget ve třech velikostech** (4×3, 4×2 a 2×2 se streak kruhem). Návyky jde odškrtávat
  přímo z plochy, stránkují se šipkami (RemoteViews neumí horizontální scroll) a widget reaguje
  okamžitě: nejdřív se vykreslí z cache, pak doběhne skutečný zápis do DB. Běží jako headless JS
  task s přímým přístupem k SQLite a přidání na plochu řeší vlastní nativní modul.
- **Notifikace, které jdou splnit bez otevření appky.** Denní připomínka a večerní upozornění na
  ohroženou sérii, které při 1–2 chybějících návycích nabídne tlačítka pojmenovaná podle
  konkrétních návyků. Po dokončení dne je nahradí „Dnešek hotovo!". Zápis do DB musí doběhnout
  dřív než jakékoli volání Notifications API, jinak Android proces zabije — ověřeno na reálném
  zařízení. Funguje jen dokud proces appky žije, což je vědomě přijaté omezení.
- **Data přežijí reinstalaci bez backendu.** Android Auto Backup s explicitními include-only
  pravidly (záloha ~62 KB místo zbytečných ~15 MB), WAL checkpoint při odchodu appky na pozadí,
  aby byla záloha konzistentní, a ošetřené obnovení oprávnění k notifikacím, které OS nikdy
  nezálohuje.
- **Personalizovaný onboarding funnel** (17 obrazovek v 6 fázích) s obnovením po zabití appky,
  který na konci nasadí vybrané návyky a čas připomínky a zakončí se paywallem.
- **Přehledy jako dashboard:** dlaždice, přepínač období, a v premium 8týdenní trend, heatmapa,
  žebříček návyků a rozpad podle dnů v týdnu.
- **Kategorie a Manage mód** s drag & drop řazením, které je napsané vlastní nad
  `react-native-gesture-handler` a `reanimated`, bez další knihovny.
- **Předplatné přes RevenueCat:** vzdálený paywall, entitlementy a feature gating s čistou
  testovanou logikou (zdarma 3 návyky, zbytek za premium).
- **Tři jazyky** (čeština, angličtina, němčina) včetně widgetu a notifikací, které mají vlastní
  oddělený i18n, a světlý i tmavý režim.
- **Bez vlastního serveru.** Data žijí lokálně na zařízení uživatele (SQLite) a appka zatím nemá
  žádnou vlastní telemetrii ani analytiku.

Kvalita: TypeScript strict s `noUncheckedIndexedAccess` a 61 unit testů v 5 sadách (streaky, týdny,
statistiky, ochrana série, gating). Řada rozhodnutí vznikla na reálném zařízení, ne u stolu, a
všechna jsou zapsaná včetně důvodů v [CLAUDE.md](CLAUDE.md).

## Dokumentace projektu

Kód není jediné, co u Emberly udržuju. Celý projekt mám zdokumentovaný v **Obsidian vaultu** —
zhruba 50 propojených poznámek, které pokrývají produkt i to, jak se dostal k dnešní podobě:

- **Produkt:** vize, persony, business rules (co je úspěšný den, jak fungují streaky a tiery),
  glosář, user journeys.
- **Architektura a data:** tech stack, state management, navigace, DB schéma a migrace, doménové
  typy a konvence.
- **Design:** principy, design systém, inventář komponent, plán vizuálních assetů a maskota.
- **Obrazovky a widget:** popis jednotlivých obrazovek a plán Android widgetu včetně věcí, které
  na platformě nejdou.
- **Provoz:** dev setup, debugging playbook, release checklist, RevenueCat setup, právní
  náležitosti a workflow pro zpracování feedbacku od beta testerů.
- **Myšlení:** otevřené otázky, poučení z vývoje a backlog nápadů, které ještě nejsou v plánu.
- **Marketing:** analýza produktu, název, ASO, kanály a časová osa launche.

Poznámky na sebe odkazují přes `[[wikilinky]]` z jednoho rozcestníku (`00-index`). Technická
pravidla drží jako jediný zdroj pravdy [CLAUDE.md](CLAUDE.md) a vault je jeho rozšíření; při
konfliktu vyhrává CLAUDE.md. Před každou zálohou kontroluju, jestli dokumentace nezaostala za
kódem, a případný rozpor opravuju ve stejné dávce.

Vault je verzovaný jako samostatný **soukromý** git repozitář, takže má vlastní historii nezávislou
na kódu. Proto tu na něj není veřejný odkaz.

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
