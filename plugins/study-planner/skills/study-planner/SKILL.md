---
name: study-planner
description: Builds and maintains a personal, interactive study planner (Studienplaner) as a published Artifact — this term's course catalogue with ratings and clash-checked timetable, wishlist for later terms, and progress against the examination regulations, with statuses saved across devices. Use it whenever a student wants to plan courses or a semester, set up or update a study/course planner, import new courses from Stud.IP (or HISinOne, LSF, CAMPUSonline, a PDF catalogue), check which courses count toward their degree or admission conditions (Auflagen), add a single course from another catalogue, or change anything in an existing planner — also for German requests like "Studienplaner", "Kurswahl", "Stundenplan planen", "neue Kurse in Stud.IP", "Vorlesungsverzeichnis", even if the word planner is not used. Also answers how to install and set up this skill.
---

# Study planner

Builds a single-page planner that a student keeps all degree long:

- **Patch notes** at the top — what changed in the last updates, newest first.
- **Progress** — passed + planned credits per area of the examination regulations, track min/max rules,
  admission conditions beside the degree total, thesis admission, grade average (and the best achievable one).
- **Conditions** (Auflagen) — if the admission came with conditions.
- **Timetable** — booked courses in track colours, shortlisted candidates dashed, red only where a candidate
  hits something booked.
- **Catalogue** — every course of the term as a card: rating (fits / doable / blocked), credits, number,
  frequency, modules, times, a note written for *this* student, status buttons (taking / wish / passed / failed).
- **Wishlist** — candidates for now and for later terms, plus recurring courses not offered this term.
- **Projects**, **To clarify**, **Your data** (backup/restore).

The page is `assets/planner-template.html` (engine, design, DE/EN UI) plus two JSON blocks — programme
config and term data — injected by `scripts/planner.py`. Statuses live in the artifact database, keyed by a
slug of the course title, so they survive every re-import and republish.

## Files

| Path | Use |
|---|---|
| `assets/planner-template.html` | The engine. Don't hand-write planner HTML; build from this. |
| `assets/example/config.json`, `data.json` | Complete fictional example — copy its shape. |
| `scripts/planner.py` | `extract` a published planner → JSON; `check`; `build` → page. |
| `scripts/verify.mjs` | Headless render + checks + screenshots (needs `npm i playwright`). |
| `scripts/lms/studip/studip-helpers.js` | Paste into a logged-in Stud.IP tab → `window.SP` import helpers. |
| `references/data-model.md` | Every config/data field, keys, saved state, colours. Read before editing JSON. |
| `references/lms-studip.md` | Stud.IP discovery and term import. |
| `references/lms-other.md` | HISinOne, LSF, CAMPUSonline, CampusNet, PDFs, manual lists. |
| `references/regulations.md` | Regulations → config, conditions, interview, rating, writing card notes. |
| `references/rules-and-pitfalls.md` | House rules (with reasons), pitfalls, publishing, verification. |
| `README.md` / `README.de.md` | Human setup guide (install, connect the campus system, first-open tour). |

## Pick the mode

First check whether the student already has a planner: `Artifact` `action:"list"` (titles like
"Studienplaner …"/"Study planner …"), and project files or memory mentioning one.

| The student wants … | Mode |
|---|---|
| a planner and has none | **A — first setup** |
| new/changed courses for this or next term | **B — term import** |
| one course from another catalogue (e.g. Bachelor) | **C — single course** |
| a change: wording, colours, a rule, a notice, a resolved question | **D — change request** |
| their enrolled courses marked as "taking" | **E — sync enrolment** |
| to know how to install/set this up | **F — explain**: answer from `README.md`/`README.de.md` |

## A — first setup

1. **Collect** (read `references/regulations.md`): university, programme + regulation version, current term,
   campus system URL; examination regulations, module handbook, admission letter, transcript — look in
   connected folders and project files first, ask for the rest. One short interview round for background,
   interests, constraints.
2. **Config**: areas, tracks + rule, conditions, modules, thesis gate, grading, colours, language
   (`references/data-model.md`); fixed times from the interview (job, commute) go into `config.blocked`.
   If a rule is ambiguous, ask once and record the answer as a resolved
   "To clarify" item. Show the student a 4–6 line summary of the rules you configured before importing.
3. **Import the term** — Stud.IP: `references/lms-studip.md`; anything else: `references/lms-other.md`.
   The student logs in themselves; you never handle passwords. Always run the module-directory
   cross-check. Store every id you discovered in `config.import`.
4. **Write the cards**: rating, frequency (lecturers' statement beats counted history), note for this
   student. Add prior achievements with fixed keys, conditions, future courses, projects, open questions,
   and the first patch note ("Erste Fassung" / "First version").
5. **Build → verify → publish** (`references/rules-and-pitfalls.md` §4–5):
   `python3 scripts/planner.py build --config config.json --data data.json -o planner.html`,
   `node scripts/verify.mjs planner.html --click`, look at the screenshots, then publish with
   `capabilities: {"db": {}, "downloads": {}}`.
6. Tell the student in a few lines what the page shows and what to do first (mark courses; back up via
   "Daten"). Offer to set their enrolled courses to "taking" (mode E).

## B — term import

1. Read the published planner and extract it (`planner.py extract`). Read `config.import` — it holds the
   ids and module codes from last time. Read the saved state (ArtifactData `get` `plan/state`) so notes can
   refer to what the student booked.
2. Import as in `references/lms-studip.md` §3 (or `lms-other.md`), including the module-directory
   cross-check. Diff against the current data: new courses get `"neu":"<today>"`; keep `ext` single imports
   and `prior` entries; don't drop a course the student has a status on without telling them.
3. At a term change: set `semesterNow`, `semesterShort`, `targets`; replace the catalogue with the new term's,
   update frequencies. Statuses on courses that leave the data keep counting and stay visible (the page lists
   them as passed / no longer in the catalogue) — nothing to migrate. Courses that return later find their
   status again through the title key.
4. One patch-notes entry summarising the changes; retire expired notices and settled questions.
5. `check` → `build --template work/page.html` → verify → publish to the same URL.

## C — single course from another catalogue

Import only that course (never the whole other catalogue), with `"ext":"<catalogue key>"` (badge, e.g.
"B.Sc.-Kurs"), the area where it can count, its module code added to `config.modules` and `moduleOrder`,
history counted on its own node, and a "To clarify" item if recognition is not confirmed. Patch note.

## D — change request

Extract, change the config/data (or the engine only if config can't express it), patch note, check, build,
verify, publish. Colours from a screenshot of the campus timetable: map per track with custom hex pairs
(`data-model.md` §6). Resolved questions become `done:true` with a "Geklärt:/Resolved:" lead; facts the
student reports (enrolled, passed, decided) update the notes and retire related warnings in the same pass.

## E — sync enrolment

Read the enrolled courses (Stud.IP: `SP.myCourses`; elsewhere the student's timetable or ICS). Show the
matches, and after the student agrees: `get` `plan/state`, set only those keys to `{"s":"plan"}` (keep
everything else), write the merged document back. Then update notes that assumed they were not enrolled.

## Non-negotiables

- **Start from the current published version** of the planner and the current saved state — never from an
  older copy, never regenerate the page from scratch for an update.
- **Change logs only in the patch notes**; `neu` chips instead of "Neu seit …" prefixes; no update boxes at
  section starts.
- **Remove what is done** (expired deadlines, resolved warnings) in the same update that learns about it.
- **Red only for candidates that clash**; booked courses keep their colour.
- **Stable keys**: never change the slug function or `storageKey`; fixed keys for prior achievements;
  fix collisions with an explicit `key` on the entry without saved state.
- **Never type or ask for passwords**; read-only in the campus system.
- Ratings and rule readings are estimates — say so where it matters; the footer disclaimer stays.

Why each rule exists, and the technical traps behind them, are in `references/rules-and-pitfalls.md`.

## If tools are missing

- No browser tool → ask for the catalogue as files (PDF, saved page, ICS, CSV) or a pasted list
  (`lms-other.md` §4–5).
- No Playwright/npm → at least run `planner.py check` and syntax-check the engine
  (`node --check` on the extracted `<script>`), and say that the visual check was skipped.
- No Artifact tool → deliver `planner.html` as a file; statuses then live only in that browser
  (localStorage) and the JSON backup.
