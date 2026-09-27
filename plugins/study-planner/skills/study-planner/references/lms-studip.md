# Importing from Stud.IP

Stud.IP runs at many German universities (Osnabrück, Göttingen, Oldenburg, Bremen, Braunschweig, Hannover,
Passau, Trier …). There is no API key to set up: Claude works **inside the student's own logged-in browser
tab** and reads what the student could read, through the page's own JSON:API and HTML pages.

## Contents
1. Ground rules
2. One-time discovery (fills `config.import`)
3. Term import, step by step
4. Single course from another catalogue
5. Enrolled courses → "taking"
6. Offering history (Turnus)
7. Mapping a course to the data model
8. Known quirks

## 1. Ground rules

- **The student logs in, never Claude.** Open the instance URL in the browser tool. If `document.title`
  contains "Login"/"Anmelden" or a password field is visible, send one short message asking the student to
  sign in in the browser pane (SSO, 2FA and all), then poll `document.title` every few seconds (up to ~2 min)
  and continue on your own. Never type, request or store a password. Sessions expire fast — re-check the
  title before each batch of calls.
- Read only. Do not enrol, register, post, or change anything in Stud.IP.
- Work in small batches (≤10 detail pages per call) and keep results in `SP.last` / `window` variables so a
  truncated tool answer can be re-read in slices.
- Load the browser skill that matches the browser you use before the first step (built-in browser or
  Claude in Chrome), and use its JavaScript runner for everything below.

Paste `scripts/lms/studip/studip-helpers.js` once per tab; it defines `window.SP`:

| Helper | Returns |
|---|---|
| `SP.probe()` | login state, student id, last 14 semesters `{id,title}`, available JSON:API routes |
| `SP.findNodes(/Cognitive Science/i)` | tree nodes (course directory) whose name matches, with their path |
| `SP.children(id)` | children of a tree node (`"root"` for the top) |
| `SP.courses(node, semesterId)` | courses under a node in one semester `{id,nr,title,type}` |
| `SP.details(courseId)` | fields, sections, frequency answer, weekly slots, module lines, ECTS, page text |
| `SP.moduleCourses(code, semesterId)` | courses linked to a module code (module directory) |
| `SP.myCourses(/2026\/27/)` | courses the student is enrolled in |
| `SP.history(nodes, semesters, titles)` | in which semesters each title appeared |
| `SP.legacyCourses(node, semIndex)` | the pre-2025 server-rendered directory (fallback) |
| `SP.raw(path)`, `SP.page(path)` | raw JSON:API answer / page text, to learn names before adapting |

## 2. One-time discovery

Do this on the first import and store every id in `config.import` — later sessions skip it.

1. `SP.probe()` → semester ids (store the current and next ones), and whether `tree-node/...` routes exist.
2. Find the programme's node: `SP.findNodes(/<programme name>/i)`. If several match (Bachelor/Master,
   old/new regulations), show the student the paths and ask which one. Store it as `import.treeNodes.master`.
   If the tree route does not exist on this instance, open the course directory
   (`dispatch.php/search/courses`) in the browser, click through to the programme, and read the node id from
   the URL or the network requests.
3. List the module codes from the module handbook (the elective modules, the free elective module, the project
   module) and store them as `import.moduleSearch`.

## 3. Term import

1. `SP.courses(master, sem)` → the tree list. Skip pure registration shells ("Anmeldung zu …", "Tutorium"
   duplicates) only after checking them.
2. **Module directory cross-check — never skip.** For every code in `import.moduleSearch`:
   `SP.moduleCourses(code, sem)`. Courses that other faculties own (computer science, psychology, law,
   biology) are linked there but missing from the programme tree. In Osnabrück this found 3 courses on
   07.09.2026 and 3 more on 24.09.2026 that the tree did not show. Merge by course id; note for each course
   where it was found.
3. `SP.details(id)` for every new or changed course (in batches). Extract: number, ECTS, SWS, language,
   lecturers, weekly slots (or block dates), module assignments, description, prerequisites, access
   restrictions, and the frequency answer.
4. Map each course to the data model (section 7). Write the note for *this* student (see
   `references/regulations.md`, "Writing the card note").
5. Diff against the current `data.courses`:
   - new → add with `"neu":"<today>"`;
   - gone → remove only if Stud.IP really no longer lists it this term; if the student had a status on it,
     keep it in `future` or tell them;
   - changed times/modules → update silently, mention notable ones in the patch note.
   Keep every `ext` single import (they are not in the tree) and every `prior` entry.
6. Update `config.import.lastImport`, add one patch-notes entry, build, verify, publish.

## 4. Single course from another catalogue

When the student wants one course from, e.g., the Bachelor programme: do **not** import that whole
catalogue. Set the semester, load the other node with `SP.courses(bachelorNode, sem)`, find the course by
title regex, `SP.details(id)`, count its history on that node, and add it with `"ext":"bsc"`, an `area`
where it can count (usually the free elective area — check the handbook wording), and its foreign module
code added to `config.modules`/`moduleOrder` (otherwise it lands under "Other"). Say in the note whether
recognition is confirmed or still open, and add a "Zu klären" item if open.

## 5. Enrolled courses

`SP.myCourses(/<term>/)` lists what the student is enrolled in. Offer to set those to "taking" — only
after they agree — by reading `plan/state` (ArtifactData `get`), adding/overwriting just those keys with
`{"s":"plan"}`, and writing the merged document back. Also use the list to retire stale hints
("secure your place" is done once they are enrolled).

## 6. Offering history (Turnus)

Two sources, strict order:
1. **Lecturers' own statement** — many courses answer a template question in the description
   ("Will this class be offered again/regularly?", "Wird dieser Kurs regelmäßig angeboten?"). The answer is
   on the **next line** (or after the "?"). Store the code in `rhx` and the original sentence in `rhxq`.
2. **Counted history** — `SP.history([master, bachelor], lastSevenSemesters, titles)`; store the terms seen
   in `hs` (`"WS24,WS25,WS26"`) and a code in `rh`: seen every winter → `each-ws`; most winters →
   `mostly-ws`; only now → `first`; scattered → `irregular`.

Institutes renumber courses (Osnabrück's IKW moved to 8.30xxx in WiSe 2025/26, e.g. neuroinformatics
8.3047x → 8.31005x), so match history by title, not number, and set `config.turnus.renumberedPrefix` if
"first" on those numbers would mislead.

## 7. Mapping

| Stud.IP | data model |
|---|---|
| title | `t` (exactly; it becomes the key) |
| Veranstaltungsnummer / course number | `nr` |
| ECTS-Punkte | `lp` |
| Veranstaltungstyp (Vorlesung, Seminar, Blockseminar …) | `k` |
| Lehrende | `who` (surnames, " / "-separated) |
| Räume und Zeiten, weekly | `slots` (1=Mon); irregular dates → `block` "08.–12.02.2027" |
| Modulzuordnungen / Studienbereiche | `mod` (codes, " · "-separated) |
| frequency answer | `rhx`, `rhxq` |
| course id | `url` = `<base>dispatch.php/course/details/?sem_id=<id>` (changes every term — never a key) |

## 8. Known quirks

- **The course directory became a Vue app in 2026.** The old `search/courses?start_item_id=` HTML then
  returns an empty page; use the JSON:API `tree-node/…/courses?filter[semester]=…` route. On older
  instances the reverse holds — use `SP.legacyCourses`.
- **Semester is session state in the old directory**: set it with `search/courses/index?search_sem_sem=N`
  first, then load the node; afterwards set it back. Semester indexes (Osnabrück): 47=WS25/26, 48=SS26,
  49=WS26/27, 50=SS27.
- The quick search (POST) returns no list via fetch — go through the tree or the module directory.
- Detail pages include a CSS block in `textContent`; the helper strips `style`/`script` first.
- A course can sit in several modules ("CS24-MWP-AI · CL · NI") — keep all; the page shows one chip each.
- Check after mapping: every course's track equals its modules' track
  (`planner.py check` warns — on 07.09.2026 two NeuroAI courses had been filed under the wrong track).
- A module search returns variants (A–H) of the same module — the helper checks up to ten and de-duplicates.
