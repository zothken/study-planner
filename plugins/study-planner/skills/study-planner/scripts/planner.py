#!/usr/bin/env python3
"""Study planner build tool.

The planner page = engine template + two JSON blocks (#planner-config, #planner-data).
Never hand-edit the published HTML. Instead:

  extract  pull config.json + data.json (and the page itself) out of a published planner
  check    validate config + data (duplicate keys, bad slots, module/track mismatches, rule breaks)
  build    inject config + data into a template (the stock one, or the extracted page) -> page.html

Usage:
  python3 planner.py extract PAGE.html -o WORKDIR
  python3 planner.py check  --config WORKDIR/config.json --data WORKDIR/data.json
  python3 planner.py build  --config WORKDIR/config.json --data WORKDIR/data.json \
                            [--template WORKDIR/page.html] -o WORKDIR/planner.html

`build` runs `check` first and refuses to write on errors (use --force only if you know why).
"""
import argparse, datetime, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
STOCK_TEMPLATE = os.path.normpath(os.path.join(HERE, "..", "assets", "planner-template.html"))

ST_CODES = {"must", "go", "cau", "stop", "proj"}
RH_CODES = {"each-sem", "each-ws", "each-ss", "yearly", "repeat", "likely-ws", "likely-ss",
            "mostly-ws", "mostly-ss", "irregular", "unsure", "once", "first"}
BLOCK_RE = {
    "config": re.compile(r'(<script type="application/json" id="planner-config">)(.*?)(</script>)', re.S),
    "data": re.compile(r'(<script type="application/json" id="planner-data">)(.*?)(</script>)', re.S),
}
# Change-log phrasing that belongs in the patch notes, not at the start of a card or section
CHANGELOG_RE = re.compile(r'^\s*(<b>)?\s*(neu seit|nachtrag|fehlte bisher|neu im verzeichnis|new since|added on|update[: ]|was missing)', re.I)


def slug(s):
    """Mirror of the engine's slug(): must stay byte-identical in behaviour."""
    s = (s or "").lower()
    s = s.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    s = re.sub(r"\(part\s*[ivx0-9]+\)", "", s)
    s = re.sub(r"\(teil\s*[ivx0-9]+\)", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s[:64]


def strip_skeleton(html):
    """Remove the wrapper the Artifact publisher adds (doctype/head/body), keep the page content."""
    m = re.match(r'\s*<!doctype html><html><head>.*?</head><body>\n?', html, re.S | re.I)
    if m:
        html = html[m.end():]
        html = re.sub(r'\s*</body></html>\s*$', "\n", html, flags=re.I)
    return html


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def dump_block(obj):
    """Readable JSON for the page: one course per line (multi-line if very long), HTML-safe."""
    def val(v, ind):
        if isinstance(v, list) and v and all(isinstance(x, dict) for x in v):
            parts = []
            for x in v:
                one = json.dumps(x, ensure_ascii=False)
                parts.append(one if len(one) <= 1800 else json.dumps(x, ensure_ascii=False, indent=1))
            return "[\n" + ",\n".join(ind + "  " + p.replace("\n", "\n" + ind + "  ") for p in parts) + "\n" + ind + "]"
        if isinstance(v, dict) and v and len(json.dumps(v, ensure_ascii=False)) > 1800:
            return "{\n" + ",\n".join(f'{ind}  {json.dumps(k, ensure_ascii=False)}: {val(x, ind + "  ")}' for k, x in v.items()) + "\n" + ind + "}"
        return json.dumps(v, ensure_ascii=False)
    body = "{\n" + ",\n".join(f'  {json.dumps(k, ensure_ascii=False)}: {val(v, "  ")}' for k, v in obj.items()) + "\n}"
    # keep the <script> element intact: no "</" or "<!--" inside the block
    return body.replace("</", "<\\/").replace("<!--", "<\\u0021--")


def iter_courses(data):
    """Same order as the engine assigns keys: prior, conditions, courses, future, open projects."""
    for src in ("prior", "conditions", "courses", "future"):
        for c in data.get(src, []) or []:
            yield src, c
    for p in data.get("projects", []) or []:
        if p.get("open") is not False:
            yield "projects", p


def parse_mods(c, cfg):
    mods_cfg = cfg.get("modules", {}) or {}
    prefix = cfg.get("modulePrefix", "") or ""
    if isinstance(c.get("mods"), list):
        return list(c["mods"])
    m = c.get("mod")
    if not m:
        return []
    if re.match(r"^\s*(keine|none|kein|—|-)\b", m, re.I) or m.strip() == "—":
        return ["—"]
    out = []
    for p in [x.strip() for x in re.split(r"\s*[·|]\s*", m) if x.strip()]:
        code = p
        if p not in mods_cfg and prefix and (prefix + p) in mods_cfg:
            code = prefix + p
        if code not in out:
            out.append(code)
    return out


def check(cfg, data, today=None):
    errors, warnings = [], []
    today = today or datetime.date.today().isoformat()
    E, W = errors.append, warnings.append

    # --- config ---
    for k in ("lang", "semesterNow", "areas"):
        if not cfg.get(k):
            E(f"config: '{k}' is missing")
    if cfg.get("lang") not in (None, "de", "en", "auto"):
        W(f"config.lang '{cfg.get('lang')}' is not de/en/auto — the UI falls back to English")
    area_ids = {a.get("id") for a in cfg.get("areas", []) if a.get("id")}
    cond = cfg.get("conditions") or {}
    if cond.get("enabled", True) and (cond.get("required") or data.get("conditions")):
        area_ids.add(cond.get("id", "AUFL"))
    track_ids = {t.get("id") for t in cfg.get("tracks", []) if t.get("id")}
    for t in cfg.get("tracks", []):
        if t.get("area") and t["area"] not in area_ids:
            E(f"config.tracks[{t.get('id')}]: area '{t['area']}' is not defined in config.areas")
    mods_cfg = cfg.get("modules", {}) or {}
    for code, m in mods_cfg.items():
        if m.get("track") and m["track"] not in track_ids:
            E(f"config.modules[{code}]: track '{m['track']}' is not defined in config.tracks")
        if m.get("area") and m["area"] not in area_ids:
            E(f"config.modules[{code}]: area '{m['area']}' is not defined in config.areas")
    for code in cfg.get("moduleOrder", []) or []:
        if code not in mods_cfg and code != "—":
            W(f"config.moduleOrder lists '{code}', which has no entry in config.modules")
    for bl in cfg.get("blocked", []) or []:
        if not (isinstance(bl, dict) and isinstance(bl.get("d"), int) and 1 <= bl["d"] <= 7
                and re.match(r"^\d{1,2}:\d{2}$", str(bl.get("s", ""))) and re.match(r"^\d{1,2}:\d{2}$", str(bl.get("e", "")))):
            E(f"config.blocked entry {bl} — use {{\"d\":1-7, \"s\":\"HH:MM\", \"e\":\"HH:MM\", \"label\":\"Job\"}}")
    tr = cfg.get("trackRule")
    if tr and tr.get("area") and tr["area"] not in area_ids:
        E(f"config.trackRule.area '{tr['area']}' is not defined in config.areas")

    # --- keys: explicit key or title slug; collisions must be resolved with an explicit key ---
    seen = {}
    for src, c in iter_courses(data):
        title = c.get("t")
        if not title:
            E(f"{src}: an entry has no title 't': {json.dumps(c, ensure_ascii=False)[:120]}")
            continue
        if src == "prior" and not c.get("key"):
            E(f"prior '{title}': prior achievements need a fixed 'key' (e.g. 'prior-ethics-of-ai') — never derive it from the title")
        k = c.get("key") or slug(title)
        if k in seen:
            E(f"duplicate key '{k}': '{seen[k]}' and '{title}' would share one saved status. "
              f"Give the one WITHOUT existing saved state an explicit \"key\" (e.g. '{k[:50]}-{slug(c.get('nr') or 'b')}').")
        seen[k] = title

        where = f"{src} '{title[:60]}'"
        if c.get("st") and c["st"] not in ST_CODES:
            E(f"{where}: st '{c['st']}' must be one of {sorted(ST_CODES)}")
        for f in ("rh", "rhx"):
            if c.get(f) and c[f] not in RH_CODES:
                E(f"{where}: {f} '{c[f]}' must be one of {sorted(RH_CODES)} (use rhLabel/rhxLabel for free text)")
        if c.get("track") and c["track"] not in track_ids:
            E(f"{where}: track '{c['track']}' is not defined in config.tracks")
        if c.get("area") and c["area"] not in area_ids:
            E(f"{where}: area '{c['area']}' is not defined in config.areas")
        for s in c.get("slots", []) or []:
            ok = isinstance(s, dict) and isinstance(s.get("d"), int) and 1 <= s["d"] <= 7 \
                and re.match(r"^\d{1,2}:\d{2}$", str(s.get("s", ""))) and re.match(r"^\d{1,2}:\d{2}$", str(s.get("e", "")))
            if not ok:
                E(f"{where}: bad slot {s} — use {{\"d\":1-7 (Mon=1), \"s\":\"HH:MM\", \"e\":\"HH:MM\"}}")
            else:
                a = [int(x) for x in s["s"].split(":")]
                b = [int(x) for x in s["e"].split(":")]
                if a[0] * 60 + a[1] >= b[0] * 60 + b[1]:
                    E(f"{where}: slot starts after it ends: {s}")
        mods = parse_mods(c, cfg)
        for m in mods:
            if m != "—" and m not in mods_cfg and mods_cfg:
                W(f"{where}: module '{m}' is not in config.modules — it will show as a raw code under 'Other'")
        mod_tracks = {mods_cfg[m].get("track") for m in mods if m in mods_cfg and mods_cfg[m].get("track")}
        if c.get("track") and mod_tracks and c["track"] not in mod_tracks:
            W(f"{where}: track '{c['track']}' differs from its module track(s) {sorted(mod_tracks)} — check which is right")
        if len(mod_tracks) > 1:
            W(f"{where}: modules span several tracks {sorted(mod_tracks)} — the first one is used for colours and bars; set 'track' explicitly if another is right")
        if src in ("courses", "conditions") and c.get("lp") in (None, "") and not c.get("lpNote"):
            W(f"{where}: no credits 'lp' — fine if unknown, but say so in the note")
        if c.get("ext") and c["ext"] not in (cfg.get("extCatalogs") or {}):
            E(f"{where}: ext '{c['ext']}' is not defined in config.extCatalogs")
        if CHANGELOG_RE.search(c.get("note") or ""):
            W(f"{where}: note starts like a change log ('Neu seit…/Nachtrag…'). Put that in the patch notes and use the 'neu' chip instead.")
        if c.get("neu") and not re.match(r"^\d{4}-\d{2}-\d{2}$", str(c["neu"])):
            W(f"{where}: 'neu' should be an ISO date YYYY-MM-DD, got '{c['neu']}'")

    # --- notices, todo, patch notes ---
    sections = {"progress", "conditions", "timetable", "catalog", "wishlist", "projects", "todo"}
    for n in data.get("notices", []) or []:
        if n.get("section") not in sections:
            E(f"notice '{n.get('title','')}': section must be one of {sorted(sections)}")
        if n.get("until") and str(n["until"])[:10] < today:
            W(f"notice '{n.get('title','')}' expired on {n['until']} — it is hidden automatically; remove it from the data")
        if re.search(r"nachtrag|patch|update vom|neu seit", (n.get("title") or "") + (n.get("html") or ""), re.I):
            W(f"notice '{n.get('title','')}' looks like a change log — change logs go into patchNotes, not into sections")
    for t in data.get("todo", []) or []:
        if t.get("until") and str(t["until"])[:10] < today:
            W(f"todo item expired on {t['until']} — remove it or mark it done")
    pn = data.get("patchNotes", []) or []
    dates = [p.get("date", "") for p in pn]
    if dates != sorted(dates, reverse=True):
        E("patchNotes must be ordered newest first")
    for p in pn:
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", str(p.get("date", ""))):
            E(f"patch note '{p.get('title','')}': date must be YYYY-MM-DD")
        if not p.get("items"):
            E(f"patch note '{p.get('title','')}': needs at least one item")
    if not pn:
        W("no patchNotes — add at least the first entry ('Erste Fassung' / 'First version')")
    return errors, warnings


def build(template_path, cfg, data, out_path):
    with open(template_path, encoding="utf-8") as f:
        html = strip_skeleton(f.read())
    for name, obj in (("config", cfg), ("data", data)):
        rx = BLOCK_RE[name]
        if not rx.search(html):
            sys.exit(f"template has no #planner-{name} block: {template_path}")
        block = dump_block(obj)
        html = rx.sub(lambda m: m.group(1) + "\n" + block + "\n" + m.group(3), html, count=1)
    title = cfg.get("pageTitle") or ((cfg.get("title") or "Study planner") + (" " + cfg["titleEm"] if cfg.get("titleEm") else ""))
    html = re.sub(r"<title>.*?</title>", lambda m: "<title>" + title.replace("<", "&lt;") + "</title>", html, count=1, flags=re.S)
    if not html.endswith("\n"):
        html += "\n"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    return out_path


def extract(page_path, out_dir):
    with open(page_path, encoding="utf-8") as f:
        html = f.read()
    os.makedirs(out_dir, exist_ok=True)
    found = {}
    for name in ("config", "data"):
        m = BLOCK_RE[name].search(html)
        if not m:
            sys.exit(f"no #planner-{name} block in {page_path} — is this a planner built from the study-planner template?")
        obj = json.loads(m.group(2))
        with open(os.path.join(out_dir, name + ".json"), "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=1)
        found[name] = obj
    with open(os.path.join(out_dir, "page.html"), "w", encoding="utf-8") as f:
        f.write(strip_skeleton(html))
    ver = re.search(r'<meta name="planner-template" content="([^"]+)"', html)
    return found, (ver.group(1) if ver else "unknown")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build"); b.add_argument("--config", required=True); b.add_argument("--data", required=True)
    b.add_argument("--template", default=STOCK_TEMPLATE); b.add_argument("-o", "--out", required=True)
    b.add_argument("--force", action="store_true")
    c = sub.add_parser("check"); c.add_argument("--config", required=True); c.add_argument("--data", required=True)
    e = sub.add_parser("extract"); e.add_argument("page"); e.add_argument("-o", "--out", required=True)
    a = ap.parse_args()

    if a.cmd == "extract":
        found, ver = extract(a.page, a.out)
        d = found["data"]
        print(f"template: {ver}")
        print(f"wrote {a.out}/config.json, data.json, page.html")
        print("counts: " + ", ".join(f"{k}={len(d.get(k) or [])}" for k in ("prior", "conditions", "courses", "future", "projects", "patchNotes", "notices", "todo")))
        return

    cfg, data = load_json(a.config), load_json(a.data)
    errors, warnings = check(cfg, data)
    for w in warnings:
        print("WARN  " + w)
    for e in errors:
        print("ERROR " + e)
    if a.cmd == "check":
        print(f"{len(errors)} error(s), {len(warnings)} warning(s)")
        sys.exit(1 if errors else 0)
    if errors and not a.force:
        sys.exit(f"{len(errors)} error(s) — nothing written. Fix them (or --force if you are sure).")
    out = build(a.template, cfg, data, a.out)
    n = sum(1 for _ in iter_courses(data))
    print(f"built {out} ({n} entries, {len(warnings)} warning(s))")


if __name__ == "__main__":
    main()
