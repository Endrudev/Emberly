#!/usr/bin/env python3
"""Založí úkol(y) jako kartičky přímo přes Trello REST API.

Žádný e-mail, žádný SMTP. Key + token se čtou z gitignorovaného
`scripts/trello.local.json`. Cílový board + list se hledají podle názvu.

Použití:
  python scripts/trello_api.py                      # batch z _trello_tasks.json
  python scripts/trello_api.py "Název" "Popis"      # jedna karta
  python scripts/trello_api.py --batch soubor.json  # vlastní batch
"""
import sys
import os
import json
import urllib.parse
import urllib.request
from urllib.error import HTTPError

CONFIG = os.path.join(os.path.dirname(__file__), "trello.local.json")
TASKS = os.path.join(os.path.dirname(__file__), "_trello_tasks.json")
BASE = "https://api.trello.com/1"


def cfg() -> dict:
    with open(CONFIG, encoding="utf-8") as f:
        return json.load(f)


def _call(method: str, path: str, key: str, token: str, **params):
    params.update(key=key, token=token)
    if method == "GET":
        url = f"{BASE}{path}?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, method="GET")
    else:
        data = urllib.parse.urlencode(params).encode()
        req = urllib.request.Request(f"{BASE}{path}", data=data, method="POST")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())


def find_id(items, name):
    low = name.lower()
    for it in items:  # přesná shoda
        if it["name"].lower() == low:
            return it["id"]
    for it in items:  # částečná shoda
        if low in it["name"].lower():
            return it["id"]
    return None


def load_tasks() -> list:
    args = sys.argv[1:]
    if args and args[0] == "--batch":
        path = args[1]
    elif len(args) >= 2:
        return [{"subject": args[0], "body": args[1]}]
    else:
        path = TASKS
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main() -> None:
    c = cfg()
    key, token = c["key"], c["token"]

    boards = _call("GET", "/members/me/boards", key, token, fields="name")
    board_id = find_id(boards, c.get("board", "Mission Tracker"))
    if not board_id:
        print("Board nenalezen. Dostupné:", [b["name"] for b in boards])
        sys.exit(1)

    lists = _call("GET", f"/boards/{board_id}/lists", key, token, fields="name")
    list_id = find_id(lists, c.get("list", "To-do"))
    if not list_id:
        print("List nenalezen. Dostupné:", [x["name"] for x in lists])
        sys.exit(1)

    print(f"Board: {c.get('board')} ({board_id})")
    print(f"List:  {c.get('list')} ({list_id})\n")

    tasks = load_tasks()
    ok = 0
    for t in tasks:
        subject = t["subject"]
        try:
            _call("POST", "/cards", key, token,
                  idList=list_id, name=subject, desc=t.get("body", ""))
            print(f"[OK]   {subject}")
            ok += 1
        except HTTPError as e:
            detail = e.read().decode(errors="replace")
            print(f"[FAIL] {subject} -> HTTP {e.code}: {detail}")
        except Exception as e:  # noqa: BLE001
            print(f"[FAIL] {subject} -> {e}")

    print(f"\nVytvořeno {ok}/{len(tasks)} karet v Trellu.")
    sys.exit(0 if ok == len(tasks) else 1)


if __name__ == "__main__":
    main()
