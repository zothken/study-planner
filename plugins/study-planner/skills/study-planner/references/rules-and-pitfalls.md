# House rules, pitfalls, publishing and verification

These rules come from a semester of real use of the original planner (M.Sc. Cognitive Science,
Osnabrück, September 2026). Each one exists because its absence annoyed the student. The template
already implements the layout rules; the content rules are on you.

## Contents
1. Content rules (why they exist)
2. Layout rules the engine enforces — do not undo them
3. Technical pitfalls
4. Publishing and updating the artifact
5. Verification

## 1. Content rules

1. **Change logs go into the patch notes, nowhere else.** One entry per update session at the top
   (`data.patchNotes`, newest first, only the newest open). Never put "Nachtrag"/"Update" boxes at the
   start of a section, and never start a card note with "Neu seit …"/"Fehlte bisher …". New courses get
   `"neu":"<ISO date>"` (dashed chip). *Why:* the student opens the planner to plan, not to read history;
   notes at the top of every section pushed the actual content down.
2. **Retire what is done.** Expired deadlines, "secure your place" warnings after enrolment, hints about a
   choice already made — remove them in the same update that learns about it. Give time-bound notices and
   todo items an `until`, so they disappear on their own. Resolved questions stay as ticked "Geklärt:"
   items. *Why:* a planner that keeps warning about finished things is not trusted.
3. **Read before you write.** Always start from the currently published planner (extract it) and the
   current saved state. Never rebuild from an older copy in the conversation or from memory — the student
   (or another session) may have changed it since.
4. **The student's decisions win.** If they booked a course, it is booked: no nagging about the
   alternative. If they decided not to import a whole catalogue ("brauche nicht alle Kurse aus dem
   Bachelor"), import single courses only.
5. **Say where facts come from.** Frequency: lecturers' statement beats counted history (`rhx` over `rh`),
   and the original sentence is shown. Footer lists sources with dates. Ratings are estimates; the
   regulations decide.
6. **Summarise updates in the chat in 3–6 bullets** of what changed for the student; the patch note says the
   same in fewer words.

## 2. Layout rules in the engine (keep them)

- Timetable: booked courses in their track/area colour with a thick left bar (like Stud.IP). **Red only for
  a candidate that sits on something booked.** A booked course never turns red; the clash is written on
  its card. *Why:* "wenn etwas final ausgewählt ist, soll es nicht mehr so markiert sein".
- Track bars count "taking" (planned) as well as "passed"; the elective-area bar and the track bars show the
  same credits twice on purpose (the regulation has both rules).
- Meter labels never wrap into the numbers; long one-word labels push the numbers to the next line instead.
- One filter for track *and* module: a flat list, tracks selectable, their modules indented below, each with
  its match count; empty entries hidden except the selected one. Module chips on cards toggle that filter.
- The area filter has a capped width so long module names cannot break the toolbar; on phones the filter
  row and the section nav scroll sideways.
- All card types share one chip builder (`chips()`), so a new field (like `ext`) shows up everywhere.
- Catalogue counts in the heading are computed, not typed.

Change the engine only when the student asks for a behaviour the config cannot express; then change the
template in `assets/` too if the change is generally useful, and bump the version in the
`<meta name="planner-template">` line.

## 3. Technical pitfalls

- **Keys** — see `data-model.md` §4. Duplicate keys make two courses share one status
  ("Kombinatorische Optimierung" / "… ++"). `planner.py check` catches it; fix with an explicit `key`.
- **German quotes in JSON/JS strings** — use „…“; a straight `"` inside a string breaks the JSON. Let
  `json.dump` write the files; never hand-type JSON into the HTML.
- **Invisible characters** (non-breaking space, zero-width) — write them as escapes, never literally.
- **HTML in notes** is trusted inline HTML: escape `<`/`&` from scraped text before putting it into a note.
- **Frozen database snapshots** — the engine clones before editing; if you touch state code, keep updates
  immutable (`ST.courses = {...ST.courses, [k]: next}`).
- **Tests that find cards by `textContent.includes(title)`** hit the wrong card once another card mentions
  that title in a clash message — select by the `h3` text or `data-key`.

## 4. Publishing and updating

**First publish**
1. Build: `python3 scripts/planner.py build --config config.json --data data.json -o planner.html`
   (writes nothing if `check` finds errors).
2. Verify (section 5).
3. Publish with the Artifact tool: `file_path` = planner.html, `capabilities: {"db": {}, "downloads": {}}`,
   an `icon` like "calendar", a one-sentence description. Pin it only if the student asks.
4. Tell the student the page name and what to do first (set statuses; the "Daten" section explains backup).

**Every update**
1. `Artifact` `action:"read"` on the planner URL (find it with `action:"list"` if needed). Read the saved
   file completely (the tool requires every line to be read before a republish).
2. `python3 scripts/planner.py extract <saved file> -o work/` → `config.json`, `data.json`, `page.html`.
3. Edit the JSON (with Python/`json`, or careful edits), add the patch-notes entry, then build with
   `--template work/page.html` (keeps any engine customisations of this student's page). To move the
   student to a newer engine, build with the stock template instead and say so in the patch note.
4. Verify, then publish to the **same URL** (omit `capabilities` to keep the stored declaration).
5. If the publish is rejected because a newer version exists (another session or the page itself), read the
   newer version, extract again, re-apply your changes to *its* JSON, and publish again. Use `force` only if
   the student explicitly says to discard that version.

The saved state (statuses, grades) lives in the artifact database and survives every republish because keys
are stable.

## 5. Verification

```bash
npm i playwright            # once per environment (skip if already importable)
node scripts/verify.mjs planner.html --out verify/ [--state state.json] [--click]
```

It renders light/desktop and dark/phone with a database stub that delivers frozen snapshots, and reports:
page errors, duplicate keys, horizontal overflow, booked courses shown red (must be 0), visible sections,
meters, stats, and writes screenshots. `--state` feeds a realistic saved state (e.g. the student's current
one from ArtifactData `get`), `--click` sets a few statuses through the UI.

Look at the screenshots (top, progress, timetable, catalogue) before publishing. The only acceptable console
noise is a failed Google Fonts request. After the first publish, do one ArtifactData `list` of `plan` to
confirm the page wrote its state.
