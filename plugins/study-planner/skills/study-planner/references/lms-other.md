# Importing from other campus systems

Every university has *some* course catalogue, a module handbook and examination regulations. The planner
does not care where the data comes from — only that it ends up in `data.json` in the shape of
`references/data-model.md`. Work down this list and stop at the first source that gives complete,
current data.

## Contents
1. Decide the source
2. Common systems and what to look for
3. Browser recipe for any system
4. Files the student can hand over
5. Manual fallback
6. What to store in `config.import`

## 1. Decide the source

Ask the student for (a) the URL of their course catalogue / campus portal and (b) the name of the programme
and regulation version as it appears there. Then:

1. **Public catalogue?** Many portals show the course catalogue without login (HISinOne, LSF/QIS,
   CAMPUSonline). Try `WebFetch` first; if the page is script-rendered or blocked, use the browser.
2. **Login needed?** Open it in the browser tool; the student signs in themselves. Never type credentials.
3. **Structured data behind the page?** Look at the network requests while navigating the catalogue
   (the browser tools can read them). JSON endpoints are far more reliable than scraping text.
4. **Nothing reachable** → files (section 4) → manual (section 5).

## 2. Common systems

| System | Where it is used (examples) | Catalogue | Tips |
|---|---|---|---|
| **Stud.IP** | Osnabrück, Göttingen, Oldenburg, Bremen, Braunschweig, Hannover, Passau, Trier | Veranstaltungsverzeichnis + Modulverzeichnis | See `lms-studip.md` (dedicated helpers). |
| **HISinOne** | Freiburg, Köln (KLIPS 2.0), Potsdam (PULS), HU Berlin (Agnes), Osnabrück for exam admin | "Veranstaltungen → Vorlesungsverzeichnis", "Studienangebot → Modulhandbuch" | Often public. The tree lists modules with their courses; each course page has "Termine" (weekly slots) and "Module / Studiengänge". URLs contain `state=verpublish` or `…/pages/cm/exa/...`; ids in the URL are stable within a term. |
| **HIS LSF / QIS** | older installations | "Vorlesungsverzeichnis" tree | Public, server-rendered, easy to read with WebFetch; slots in a table per course. |
| **CAMPUSonline / TUMonline** | TU München, Stuttgart (C@MPUS), Graz, Wien | "Lehrveranstaltungen", "Studienplan / Curriculum" | The curriculum view maps modules → courses; course pages list "Termine". Some instances expose a REST/JSON backend visible in network requests. |
| **CampusNet (Datenlotsen)** | TU Darmstadt (TUCaN), Hamburg (STiNE), Leipzig (AlmaWeb) | "Vorlesungsverzeichnis" | Login usually needed; long session URLs with `ARGUMENTS=` — navigate, don't construct. |
| **Moodle / ILIAS** | almost everywhere | *not* a catalogue | Course pages have materials, not the offer. Use them only for details (times, prerequisites) of courses already known. |
| **PDF catalogue** | small programmes, many international universities | "Course list", "Lehrangebot" | Read with the pdf skill; check the date on the PDF. |

Wherever the catalogue lives, the **module handbook** (Modulhandbuch) decides which course counts where.
Get module codes and track assignments from it, not from course pages.

## 3. Browser recipe for any system

1. Navigate to the programme's catalogue for the current term. Confirm the term on screen.
2. Read the list: prefer the page text (`get_page_text`) or a small JavaScript that collects
   `{title, number, link}` from the list rows. Keep the result in a `window` variable.
3. For each course, open the detail page (fetch + DOMParser inside the tab if same-origin, otherwise
   navigate) and collect: credits, type, lecturers, weekly times, dates for block courses, language,
   modules/programmes it belongs to, description, prerequisites.
4. Cross-check with the module handbook: every elective module listed there should have its courses in the
   list; courses from other faculties that count for the programme are the usual gap.
5. For history, repeat step 2 for the last 3–6 terms if the system lets you switch terms; otherwise count
   what you can and mark the rest as unknown (`rh` omitted).

## 4. Files the student can hand over

If nothing is reachable, ask for whatever exists — any one of these is enough to start:
- the catalogue as PDF or saved web page;
- an **ICS/iCal export** of their timetable (gives exact weekly slots of booked courses);
- a CSV/Excel export of the course list;
- screenshots of the catalogue pages (read them carefully; confirm numbers you are unsure of).

Look in connected folders first (e.g. a `Uni/Orga` folder), then ask for an upload.

## 5. Manual fallback

Build the catalogue from a pasted list: title, number, credits, day/time, module. Ask only for the
fields that matter (title, credits, module, time) and leave the rest empty — the card still works. Mark
the source in the footer ("Kursliste vom Studierenden, Stand …").

## 6. `config.import`

Store what the next session needs to repeat the import without rediscovery:

```json
"import": {"system":"HISinOne", "base":"https://campus.uni-x.de", "catalogueUrl":"https://…/verpublish/…",
           "programme":"M.Sc. Data Science (PO 2024)", "termIds":{"WiSe 2026/27":"…"},
           "moduleSearch":["DS-WP-ML1","…"], "lastImport":"2026-09-24",
           "notes":"Public catalogue; module handbook PDF in Uni/Orga; login only for enrolled courses."}
```
