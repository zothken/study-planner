# Data model: config.json, data.json, saved state

The planner page is `assets/planner-template.html` (engine + styles) with two JSON blocks filled in by
`scripts/planner.py build`. Everything programme-specific lives in **config.json**; everything that changes
each term lives in **data.json**; what the student clicks lives in the **artifact database** (never in the page).

A complete, working example of both files is in `assets/example/` — copy its shape.

## Contents
1. config.json — programme rules, tracks, modules, colours, import recipe
2. data.json — courses, patch notes, notices, open questions
3. Course object
4. Keys (the one thing you must not break)
5. Saved state (artifact database)
6. Colours
7. Language

---

## 1. config.json

| Field | Type | Meaning |
|---|---|---|
| `lang` | `"de"` \| `"en"` \| `"auto"` | UI language of the page chrome. Write all content (notes, labels) in the same language. |
| `program` | string | Full programme name, used for the export filename. |
| `title`, `titleEm` | string | H1: "Studienplaner *Cognitive Science*". |
| `pageTitle` | string | Browser/gallery title (2–4 words). |
| `eyebrow` | string | Small line above the H1: "M.Sc. X · Universität Y · 120 LP". |
| `lede` | html | Optional; replaces the default intro sentence. |
| `creditUnit` | string | `"LP"`, `"ECTS"`, `"CP"` … (default LP for de, ECTS for en). |
| `totalCredits` | number | Degree total, e.g. 120. |
| `semesterNow` / `semesterShort` | string | "WiSe 2026/27" / "WiSe 26/27" (en: "Winter 2026/27"). |
| `targets` | string[] | Target terms offered in the wishlist, current term first, last one "später"/"later". |
| `storageKey` | string | localStorage key — set once, never change (it is the browser fallback of the saved state). |
| `lms` | `{name, url}` | Campus system name for source lines and card links ("Stud.IP"). |
| `grades` | `{min,max,step,higherIsBetter}` | Grade input range. Default German scale 1–5, lower is better. |
| `blocked` | `[{d, s, e, label}]` | The student's fixed times (job, commute, caring): hatched in the timetable, flagged on every card that falls into them, and a candidate there turns red. |
| `defaultArea` | area id | Area for courses whose module/track gives no area (usually the free elective area). |
| `areas` | Area[] | Buckets of the regulations, see below. |
| `tracks` | Track[] | Specialisations ("Schwerpunkte") inside one area. Optional. |
| `trackRule` | `{area, minInOne, maxPerTrack}` | e.g. "≥20 LP from one track, ≤32 from each" inside area WP. Optional. |
| `conditions` | object | Admission conditions ("Auflagen"). Optional, see below. |
| `projects` | object | Mandatory project module shown as its own section. Optional. |
| `thesisGate` | `{credits, areas, label}` | "Admission to thesis after N credits from these areas". Optional. |
| `gradeNote` | html | One line on how the final grade is formed (cite the §). Optional. |
| `bestOf` | `{area, credits, respectTrackMax, alsoAreas, label}` | If the regulations let the student pick which surplus modules count, the page computes the best possible average. Optional. |
| `modules` | `{code: {label, track?, area?, short?}}` | Module catalogue from the module handbook. |
| `moduleOrder` | string[] | Order of modules in filters and grouping (handbook order). |
| `modulePrefix` | string | Lets data write `"mod":"CS24-MWP-AI · CL · NI"` — short parts inherit the prefix. |
| `extCatalogs` | `{key: {label, title}}` | Badges for courses imported one by one from other catalogues (`"bsc": {"label":"B.Sc.-Kurs"}`). |
| `turnus` | `{renumberedPrefix}` | If the institute renumbered its courses, `"first"` history on numbers with this prefix reads "new under this number". |
| `import` | object | **The import recipe** — system, base URL, tree node ids, semester ids, module codes to cross-check, date of last import, free notes. Update it after every import so the next session can repeat it without rediscovery. |
| `sources` | html | Footer: where the data came from (catalogue, handbook, regulations with date). |
| `customCss` | string | Escape hatch for one-off style wishes; prefer config over CSS. |

**Area** `{id, label, short?, required, note?, graded? (default true), countsToTotal? (default true), color?, noCourses?}`
— one per bucket of the regulations with a credit requirement (compulsory, elective with tracks, free electives,
project, thesis). Give the thesis `noCourses:true` (no meter, no area choice). Give areas without tracks a
`color` so their courses get a timetable colour.

**Track** `{id, label, short?, area, color?}` — ids become CSS classes; keep them short (`AI`, `CNS`).

**conditions** `{enabled, id:"AUFL", label:"Auflage", labelPlural:"Auflagen", title, sub?, tocLabel?, required, deadline, countsToTotal:false, color:"green"}`
— admission conditions from the admission letter. `countsToTotal:false` is the normal case: they are extra
work on top of the degree (the page says so above the meters).

**projects** `{label, title, sub, area, creditsPerSem}` — for programmes with a study project spanning two terms.

## 2. data.json

| Field | Meaning |
|---|---|
| `updated` | ISO date of the last content change. |
| `patchNotes` | `[{date:"YYYY-MM-DD", title, items:[html…]}]`, **newest first**. One entry per update session. The page opens only the newest. This is the only place for change logs. |
| `notices` | `[{section, kind:"alert"\|"info"\|"good", title, html, until?}]` — facts that are true *now* (a deadline, how registration works). `section` ∈ progress, conditions, timetable, catalog, wishlist, projects, todo. With `until` they disappear automatically after that moment. Never use a notice for "Nachtrag"/"what's new". |
| `todo` | `[{html, done?, until?}]` — open questions. Resolved ones get `done:true` and a "Geklärt:/Resolved:" lead; they stay visible, ticked. |
| `prior` | Achievements from before this planner (conditions already passed, transfers). **Each needs a fixed `key`.** `cond:true` shows it in the conditions section. They are seeded into the saved state as "passed" once. |
| `conditions` | Condition courses offered this term (same course object). |
| `courses` | This term's catalogue. |
| `future` | Recurring courses not offered this term — shown as candidates for later terms. |
| `projects` | Project offers; `open:false` for running ones that cannot be joined (no status buttons). |
| `turnusNote` | Optional html appended to the frequency explainer (e.g. about renumbering). |

## 3. Course object

```json
{"t":"Introduction to Deep Learning", "k":"Vorlesung + Übung", "nr":"8.30811", "lp":8,
 "who":"Bruni", "mod":"CS24-MWP-AI · CL · NI", "st":"go",
 "rh":"first", "hs":"WS26", "rhx":"each-ws", "rhxq":"Yes, every winter term.",
 "slots":[{"d":2,"s":"12:00","e":"14:00"},{"d":3,"s":"10:00","e":"12:00"}],
 "block":"15.–19.03.2027", "note":"<b>…</b> why this matters for this student",
 "neu":"2026-09-24", "ext":"bsc", "url":"https://…/course/details/?sem_id=…", "lang":"EN"}
```

| Field | Meaning |
|---|---|
| `t` | Title exactly as in the catalogue (the key is built from it). |
| `k` | Format as the catalogue writes it; `kind` is derived (lecture/seminar/block/colloquium/other). |
| `nr` | Course number — second anchor, shown as chip. |
| `lp` | Credits, `null` if unknown (then say so in the note). |
| `who` | Lecturers, short. |
| `mod` / `mods` | Module codes (`"A · B"` string or array). `"keine …"`/`"none"` → no module. |
| `track`, `area` | Only when the module does not determine them (course without module, B.Sc. course → `area`). |
| `st` | Rating ("Ampel"): `go` fits the background, `cau` doable with catching up, `stop` missing prerequisite / part II / wrong regulation, `must` condition, `proj` project. |
| `rh` + `hs` | Frequency **counted** from the offering history (`hs` = terms seen, e.g. `"WS24,WS25,WS26"`). |
| `rhx` + `rhxq` | Frequency **stated by the lecturers** (code + their original sentence). Beats `rh`. |
| | Codes: `each-sem each-ws each-ss yearly repeat likely-ws likely-ss mostly-ws mostly-ss irregular unsure once first`. Free wording: `rhxLabel` / `rhLabel`. |
| `slots` | Weekly slots, `d` 1=Mon … 7=Sun, `"HH:MM"`. Empty for block courses. |
| `block` | Text for courses without a weekly slot ("08.–12.02.2027", "Termin offen"). |
| `note` | Inline HTML, 2–5 sentences: what it is, prerequisites (quote them), fit to *this* student, clashes, deadlines. Never start with "Neu seit …", "Nachtrag", "Fehlte bisher" — use `neu`. |
| `neu` | ISO date the course entered the planner after the first version → dashed chip "neu · 24.09.". |
| `ext` | Key into `config.extCatalogs` for single imports from other catalogues. |
| `key` | Explicit key — only for prior achievements and to resolve collisions. |
| `url`, `lang` | Optional link to the course page, teaching language chip. |
| `cond` | Set automatically for `conditions`; set by hand on `prior` entries that were conditions. |

## 4. Keys

The saved status of a course is stored under its key. The key is `slug(title)` — lower-case, umlauts
transliterated, "(Part II)"/"(Teil II)" removed, non-alphanumerics → `-`, **cut at 64 characters** —
unless the entry has an explicit `key`.

Why titles: campus systems create a new internal id every term, and institutes renumber courses
(Osnabrück's IKW moved to 8.30xxx in WiSe 2025/26). Titles are the most stable handle; the number is only
the second anchor.

Rules:
- Never change the slug function or `storageKey`.
- Prior achievements always get a fixed key (`prior-ethics-of-ai`) — never recompute it from the title.
- `planner.py check` fails on duplicate keys. Two titles can collide ("Kombinatorische Optimierung" and
  "Kombinatorische Optimierung ++" both become `kombinatorische-optimierung`; long titles collide at 64
  characters). Resolve it by giving the entry **without** saved state an explicit `key`
  (`kombinatorische-optimierung-plus`). Read the state first (ArtifactData `get plan/state`) to know which.
- If a course is renamed between terms and the student had a status on it, keep the old key explicitly.

## 5. Saved state

Artifact database document `plan/state`:

```json
{"courses": {"<key>": {"s":"plan|wish|done|fail", "t":"Course title", "g":1.7, "lp":8, "area":"WP", "sem":"WiSe 26/27", "tgt":"SoSe 2027"}},
 "seeded": ["prior-…"], "updatedAt": 1790000000000}
```

- `t` (the title) is stored with every status (engine ≥ 1.1). When a course leaves the data — e.g. last term's
  catalogue at a term change — its status keeps counting and the page lists it ("Bereits erbracht" for passed,
  "Nicht mehr im Katalog" in the wishlist for taking/wish), so nothing silently disappears. States from older
  engines have no `t`; those entries show a title rebuilt from the key.
- The page is the only writer during normal use. localStorage (`config.storageKey`) is the fallback; the
  JSON export in the "Daten" section is the student's backup.
- Claude may read it with ArtifactData `get` (collection path `plan`, doc id `state`) to write notes that
  know the student's plan (clashes, what is already booked).
- Claude may write it only when the student asks (e.g. "mark the courses I'm enrolled in"): `get` first,
  change only the affected keys, `set` the merged document. Never write it from an older copy.
- Snapshots delivered by the database are deep-frozen: the engine clones before editing; keep it that way.

## 6. Colours

Tracks, areas and conditions get a timetable colour: a palette name (`teal orange yellow green pink purple
blue slate brown cyan olive rose`) or an object `{"bg":"#…","line":"#…","bgDark":"#…","lineDark":"#…"}`.
Red is reserved for "candidate clashes with a booked course" and is not in the palette.

When the student shares a screenshot of their campus timetable (Stud.IP lets them colour courses), match
those colours per track with custom hex values, pick a dark-mode pair of the same hue, and keep the thick
left bar. Tracks that don't appear in the screenshot keep palette colours that don't collide.

## 7. Language

`lang` switches every built-in string (sections, filters, buttons, status labels, meters, stats). Content
(notes, labels, patch notes, notices, todo) is written by Claude in the same language. Use `"de"` when the
student writes German, `"en"` otherwise. Course titles stay as the catalogue has them.
