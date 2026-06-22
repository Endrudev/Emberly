<!--
  DRAFT — pracovní podklad pro vyplnění IARC dotazníku (Content rating) v
  Google Play Console. NENÍ právní poradenství. Před odeslání zkontroluj
  proti aktuální verzi dotazníku v Console (otázky/kategorie se čas od času
  mění). Zdroj pravdy pro fakta o appce: Obsidian vault
  `dev/legal-compliance.md`.

  Otázky níže jsou uvedeny podle obvyklé struktury IARC dotazníku v Play
  Console. Přesné znění se může lišit dle verze formuláře — princip odpovědí
  (vše "No" mimo digital purchases) se ale neměnní.
-->

# Content rating (IARC) — podklad pro Play Console

## Kontext appky

Mission Tracker je nástroj na sledování návyků/aktivit. Neobsahuje žádný
herní, sociální ani generovaný obsah — žádné násilí, sex, vulgarismy, drogy,
hazard ani interakci mezi uživateli. Jediná netriviální položka je
**předplatné** (in-app/digital purchases).

Očekávaný výsledek: **Everyone / PEGI 3 / USK 0** (nejnižší věková
kategorie) ve všech regionálních systémech (ESRB, PEGI, USK, ACB, ...).

---

## Dotazník — kategorie a odpovědi

| Kategorie (IARC) | Otázka | Odpověď | Zdůvodnění |
|---|---|---|---|
| Violence | Obsahuje appka násilný obsah (realistické, fantasy, karikatury)? | **No** | Appka je habit tracker, žádný herní/násilný obsah. |
| Blood and gore | Obsahuje appka krev/zranění? | **No** | — |
| Sexuality / Nudity | Obsahuje appka sexuální obsah nebo nahotu? | **No** | — |
| Profanity / Crude humor | Obsahuje appka vulgarismy nebo hrubý humor? | **No** | Veškerý text appky (i18n cs/en) je neutrální, motivační (Ember maskot). |
| Controlled substances | Zobrazuje appka alkohol, tabák nebo drogy? | **No** | — |
| Gambling | Obsahuje appka hazard (skutečný nebo simulovaný)? | **No** | — |
| Scary / horror themes | Obsahuje appka děsivý/horor obsah? | **No** | — |
| User interaction — chat/communication | Umožňuje appka uživatelům komunikovat mezi sebou? | **No** | Appka nemá účet, multiplayer ani sociální vrstvu. |
| User-generated content shared with others | Sdílí appka obsah vytvořený uživatelem s ostatními uživateli? | **No** | Aktivity/návyky jsou privátní, lokální, nesdílené. |
| Shares location | Sdílí appka polohu uživatele s ostatními? | **No** | Appka nepracuje s polohou vůbec. |
| Shares personal info with other users | Sdílí appka osobní údaje uživatele s ostatními uživateli appky? | **No** | Žádná sociální/sdílecí funkce. |
| Digital purchases | Umožňuje appka nákupy digitálního obsahu (in-app purchases)? | **Yes** | Plánované předplatné přes Google Play Billing / RevenueCat (viz `legal-compliance.md` bod 5). Pokud v launch verzi předplatné ještě neběží, odpověz "No" a aktualizuj při zavedení monetizace. |
| Unrestricted internet access / user-generated web content | Poskytuje appka neomezený přístup k internetovému obsahu (např. vestavěný browser, sdílený feed)? | **No** | Appka má jen vlastní UI, žádný browser ani feed cizího obsahu. |

---

## Poznámka k "Digital purchases"

Tato odpověď se musí shodovat se skutečným stavem appky **v okamžiku
odeslání** do review:
- Pokud launch verze **ještě neobsahuje** funkční předplatné/nákupy →
  odpověz **No**, a až se monetizace zapne, vyplň dotazník znovu s **Yes**
  (vyžaduje novou content rating žádost).
- Pokud launch verze **už obsahuje** RevenueCat paywall → odpověz **Yes**.

## Konzistence s ostatními dokumenty

Tyto odpovědi musí sedět s `legal/data-safety-answers.md` (frekvence
zmiňující RevenueCat/nákupy) a `legal/privacy-policy.md` (popis
předplatného). Nic z obsahu appky tyto kategorie nerozporuje — všechny "No"
odpovědi vychází z toho, že appka je čistě lokální habit tracker bez
sociální/herní vrstvy.
