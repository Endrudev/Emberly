<!--
  DRAFT — pracovní podklad pro vyplnění formuláře "Data safety" v Google Play
  Console. NENÍ právní poradenství. Před odeslání zkontroluj proti aktuální
  verzi formuláře v Console (Google pole/kategorie čas od čas mění).
  Musí sedět s `legal/privacy-policy.md` — při nesouladu hrozí zamítnutí.
  Zdroj pravdy pro fakta o appce: Obsidian vault `dev/legal-compliance.md`.

  Otázky níže jsou uvedeny anglickým názvem přesně tak, jak se jmenují pole/
  kategorie v Play Console (Data safety → "Data types"), protože to je
  terminologie, kterou v Console uvidíš bez ohledu na jazyk rozhraní.
  Vysvětlení a odpověď jsou v češtině.
-->

# Data Safety — podklad pro Play Console

## Důležitý princip Play Data Safety formuláře

Google v tomto formuláři myslí "collected" = **data, která appka přenáší
mimo zařízení** (na server vás jako vývojáře, nebo přes SDK třetí strany).
Data, která appka jen **ukládá lokálně na zařízení** a nikam neodesílá
(naše SQLite databáze návyků/completions, AsyncStorage nastavení), se
**NEpočítají jako "collected"** — i když technicky "existují" na disku.

Jediné, co z appky reálně opouští zařízení, je komunikace s **RevenueCat**
(správa předplatného) a **Google Play Billing**.

---

## 1. Data collection and security — úvodní otázky

| Otázka (Play Console) | Odpověď | Zdůvodnění |
|---|---|---|
| Does your app collect or share any of the required user data types? | **Yes** | RevenueCat zpracovává nákupní historii + identifikátor zařízení (viz sekce 2 níže). |
| Is all of the user data collected by your app encrypted in transit? | **Yes** | Komunikace s RevenueCat i Google Play Billing běží přes HTTPS/TLS. |
| Do you provide a way for users to request that their data be deleted? | **No** *(nebo "Not applicable", pokud Console tuto možnost nabízí)* | Appka nemá účet/přihlášení. Jediná data mimo zařízení (nákupní historie u RevenueCat) jsou vázána na nákup přes Google Play, ne na appkou vytvořený účet — výmaz těchto údajů by šel jen přes Google Play / RevenueCat support, ne in-app mechanismem. Pokud chceš nabídnout cestu, dej do appky/Privacy policy kontakt e-mail pro takové žádosti (až bude vyplněný — viz TODO v `privacy-policy.md`). |

---

## 2. Data types — co je "collected"

### Financial info → Purchase history
- **Collected:** Yes
- **Shared:** No *(RevenueCat je service provider/zpracovatel jednající ve vašem zájmu, ne nezávislá třetí strana, které data "sdílíte" pro její vlastní účely — proto se nezaškrtává jako "shared")*
- **Purpose:** App functionality (Account management / Fraud prevention, security, and compliance — vyber, co Console nabízí jako nejblíže "správa předplatného")
- **Is this data processed ephemerally?** No
- **Is this data required or optional?** Required *(pokud appka má placené funkce — bez toho nejde ověřit nárok na ně)*
- Zdůvodnění: RevenueCat potřebuje vědět, co a kdy bylo koupeno, aby mohl ověřit aktivní předplatné (entitlements).

### Device or other IDs
- **Collected:** Yes
- **Shared:** No *(stejná logika jako výše — RevenueCat jako zpracovatel)*
- **Purpose:** App functionality
- **Is this data processed ephemerally?** No
- **Is this data required or optional?** Required
- Zdůvodnění: RevenueCat generuje/používá identifikátor zařízení nebo anonymní app user ID k navázání nákupu na zařízení/uživatele.

### Vše ostatní (Personal info, Location, Health and fitness, Messages, Photos and videos, Audio files, Files and docs, Calendar, Contacts, App activity, Web browsing, App info and performance)
- **Collected:** **No** pro všechny tyto kategorie.
- Zdůvodnění: Appka neobsahuje analytiku, crash reporting, reklamy ani žádné SDK, které by tato data odesílalo mimo zařízení. Návyky/completions/nastavení zůstávají lokálně (viz princip výše) → nepočítá se jako "collected".

> ⚠️ Pozn. k "Health and fitness": appka sleduje návyky, což by někoho mohlo
> svádět zaškrtnout tuto kategorii. Nezaškrtávej ji — kategorie se týká dat,
> která appka **odesílá mimo zařízení**, a habit-tracking data zůstávají
> lokálně. Pokud by appka v budoucnu integrovala Health Connect / Google Fit
> apod., tento dokument se musí přepsat.

---

## 3. Souhrn pro "Data types" sekci

| Kategorie | Collected | Shared |
|---|---|---|
| Financial info — Purchase history | ✅ Yes | ❌ No |
| Device or other IDs | ✅ Yes | ❌ No |
| Personal info | ❌ No | — |
| Location | ❌ No | — |
| Health and fitness | ❌ No | — |
| Messages | ❌ No | — |
| Photos and videos | ❌ No | — |
| Audio files | ❌ No | — |
| Files and docs | ❌ No | — |
| Calendar | ❌ No | — |
| Contacts | ❌ No | — |
| App activity | ❌ No | — |
| Web browsing | ❌ No | — |
| App info and performance | ❌ No | — |

---

## 4. Konzistence s Privacy Policy

Tento list odpovídá `legal/privacy-policy.md` sekci 2.3 (RevenueCat —
nákupní historie + identifikátory) a sekci 2.5 (žádná analytika/reklamy).
Pokud do appky přibude cokoliv nové, co odesílá data mimo zařízení
(analytika, crash reporting, push notifikace přes FCM, cloud sync...), je
nutné **přepsat oba dokumenty současně** — nesoulad mezi Data Safety
formulářem a Privacy Policy je důvod k zamítnutí appky v review.
