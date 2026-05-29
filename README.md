# Mission Tracker

Aplikace pro sledování pravidelných týdenních aktivit a budování návyků.
Postavena na **Expo / React Native + TypeScript**, primárně cílí na Android, ale je
napsaná tak, aby šla bez velkých zásahů sestavit i pro iOS.

## Tech stack

- **Expo** (managed workflow, SDK 52) + **Expo Router** (file-based)
- **TypeScript** strict
- **react-native-paper** (Material 3) + react-native-reanimated
- **Zustand** pro globální stav
- **expo-sqlite** + **drizzle-orm** (typovaná data vrstva)
- **expo-notifications** (trvalá notifikace jako náhrada widgetu pro v1)
- date-fns, expo-haptics, expo-file-system, expo-sharing, expo-document-picker
- Jest (`jest-expo`) pro unit testy doménové logiky

## Spuštění (dev)

```bash
npm install
npm start                # otevře Expo Dev Tools
npm run android          # Android emulátor / fyzické zařízení
```

> **Trvalá notifikace s akčními tlačítky** se musí testovat ve **dev buildu**, ne v Expo Go.
> Expo Go nepodporuje custom notification categories a action handlery v plné šíři.

### Dev build (doporučeno pro plné testování)

```bash
npx expo install --check
npx eas build --profile development --platform android
# nebo lokálně:
npx expo run:android
```

## Skripty

- `npm start` — Expo Dev Server
- `npm run android` / `npm run ios` / `npm run web`
- `npm run typecheck` — TypeScript bez emitu
- `npm run lint` — ESLint
- `npm run format` — Prettier
- `npm test` — Jest unit testy
- `npm run db:generate` — Drizzle migrace ze schématu

## Struktura

```
app/                          # Expo Router (file-based)
├── (tabs)/                   # bottom tab navigátor
│   ├── _layout.tsx
│   ├── index.tsx             # Tento týden
│   ├── stats.tsx             # Statistiky
│   └── settings.tsx          # Nastavení
├── activity/
│   ├── new.tsx               # Přidat aktivitu (modal)
│   └── [id].tsx              # Upravit aktivitu (modal)
└── _layout.tsx               # root layout (Paper theme, gesture handler)

src/
├── db/                       # Drizzle schema, client, repos, migrace
├── domain/                   # čistá logika — týdny, streaky, typy
├── store/                    # Zustand store
├── notifications/            # persistentní notifikace, daily refresh, actions
├── ui/                       # theme + znovupoužitelné komponenty
├── i18n/                     # cs.ts (čeština), struktura na pozdější en
└── utils/
```

## Klíčová rozhodnutí

- **Datum splnění** se ukládá jako lokální ISO datum (`yyyy-MM-dd`), ne UTC timestamp —
  jinak by cestování přes timezony rozbilo streak.
- **Pondělí = 0** v `DayOfWeek` enumu (CZ konvence). První den v týdnu lze v nastavení
  přepnout na neděli pro zobrazení, datová vrstva pracuje vždy s pondělím jako kotvou.
- **Persistentní notifikace místo widgetu** — skutečný home screen widget vyžaduje
  nativní kód (Glance / WidgetKit) + `expo prebuild`, což by zavřelo cestu k Expo Go
  preview. Necháno jako budoucí rozšíření (`react-native-android-widget` config plugin).
- **iOS fallback** — sticky/ongoing notifikace na iOS neexistuje. Tam degradeujeme na
  běžnou notifikaci, nebo ji úplně vynecháme s platform-aware feature detekcí.

## Stav implementace

Viz checklist v zadání projektu — postupuje se po krocích 1 → 11.
```
[x] 1. Setup
[ ] 2. DB vrstva (Drizzle + expo-sqlite)
[ ] 3. Domain logika + unit testy
[ ] 4. Theme + komponenty
[ ] 5. Home obrazovka
[ ] 6. Add/Edit Activity
[ ] 7. Statistiky + heatmapa
[ ] 8. Nastavení
[ ] 9. Persistentní notifikace
[ ] 10. Export/Import JSON
[ ] 11. Polish
```
