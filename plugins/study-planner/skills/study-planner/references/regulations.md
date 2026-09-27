# Regulations, the student, and the content of each card

The planner is only as good as two things: the programme rules in `config.json` and the notes on each
card. Both come from documents plus a short interview.

## Contents
1. Documents to collect
2. From the examination regulations to config.json
3. Admission conditions ("Auflagen")
4. Prior achievements
5. The interview
6. Rating a course (Ampel)
7. Writing the card note
8. "Zu klären" — open questions

## 1. Documents

| Document | Gives | Where to look |
|---|---|---|
| Examination regulations (Prüfungsordnung, PO) — the programme-specific part | areas, credit requirements, track rules, thesis admission, grade formula | connected uni folder (`Orga/`), project files, university website ("Prüfungsordnung <programme>") |
| Module handbook (Modulhandbuch / Modulbeschreibungen) | module codes, which track each module belongs to, what the free elective area accepts | same; often a PDF — `pdftotext -layout` keeps tables readable |
| Admission letter (Zulassungsbescheid) | conditions, credits, deadline | the student |
| Transcript of records / exam office overview | passed courses, grades | the student (screenshot or PDF) |

Check the regulation **version** (PO 2019 vs PO 2024 often differ). Cite paragraph numbers in `gradeNote`,
`thesisGate.label` and `bestOf.label`, and put document names with dates into `config.sources`.

## 2. Regulations → config

Read the programme-specific part and fill:

- **areas** — one per credit bucket: compulsory (Pflicht), elective with tracks (Wahlpflicht), free electives
  (profilbildender/freier Wahlbereich), project, thesis (`noCourses:true`). Sum of `required` should equal
  `totalCredits`; if not, re-read — you missed or double-counted something.
- **tracks + trackRule** — specialisations and their min/max ("mind. 20 LP aus einem Schwerpunkt, höchstens
  32 LP aus jedem"). The same credits count for the elective area *and* its track bar — that is intended.
- **modules** — every module code with label, track (for track modules) and area. Short codes via
  `modulePrefix`. Module variants (A–H) collapse to one code.
- **thesisGate** — "Zulassung zur Masterarbeit, wenn mindestens N LP …" and which areas count.
- **gradeNote / bestOf** — how the final grade is formed; if the student may choose which surplus modules
  count, configure `bestOf` so the page shows the best achievable average.
- **graded:false** for areas where ungraded ("bestanden") results are allowed.

Anything ambiguous (does module X count in area Y? do conditions count toward the total?) → ask the student
once, record the answer as a resolved "Zu klären" item, and set the config accordingly. Do not present an
interpretation of the regulations as fact; the footer disclaimer says the regulations decide.

## 3. Admission conditions

From the letter: which courses, credits, "choose two of five" groups, deadline. Model:
- `config.conditions` with `required`, `deadline`, `countsToTotal` (usually **false** — conditions are on
  top of the degree; the page then shows them beside, not inside, the degree bars);
- condition courses offered this term → `data.conditions`;
- ones already passed → `data.prior` with `cond:true` and a fixed key;
- options not offered this term → `data.future` with `area` = the conditions id, so they can be wished.
When the student is enrolled in all required ones, update notes ("du bist eingeschrieben") and retire
"secure a place" hints — stale warnings are the most annoying thing a planner can show.

## 4. Prior achievements

Everything already passed that counts for this programme (conditions from last term, recognised courses):
`data.prior` with a fixed `key` (`prior-<short-name>`), `lp`, `sem`, optional `g`, `cond:true` if a condition.
They are seeded into the saved state as "passed" once; the student can still edit grade and area.

## 5. The interview

Ask only what documents cannot tell (one AskUserQuestion round, max 4 questions; skip what you already know
from memory or files):
- previous degree and the courses from it that matter (programming, maths, statistics, domain basics);
- interests / which tracks they lean towards;
- constraints: fixed times (job, commute, caring) → `config.blocked` so the timetable shows them and cards
  that fall into them say so; max credits this term; language preferences;
- whether they plan to start a project/thesis early.
Use the answers in ratings and notes; don't store them in the page beyond what the notes say.

## 6. Rating (Ampel)

| st | When |
|---|---|
| `go` — passt | Stated prerequisites are covered by the student's background, or there are none. |
| `cau` — machbar | Prerequisites partly missing but catchable in parallel (maths refresh, a language, a tool), or known to be heavy. Say what exactly costs effort. |
| `stop` — gesperrt | A hard prerequisite is missing ("non-negotiable requirement …"), it is Part II/III of a running course, it is for another regulation version, or registration is closed. Say what would unlock it and when. |
| `must` | Admission condition (set automatically for `data.conditions`). |

Quote the prerequisite sentence from the description in the note (in `<b>„…“</b>`). If there is no
description, say so and suggest asking the lecturer — don't invent content.

## 7. Writing the card note

2–5 sentences of inline HTML, in the planner's language, addressed to the student ("du" in German):
1. What the course is (topics, format, assessment) — one sentence.
2. Prerequisites, quoted when strict.
3. Fit to this student (which of their courses prepare it, what it opens up — "Türöffner für …").
4. Practicalities: clashes with other likely picks, limited places / first-session attendance, block dates,
   language, "bestanden/nicht bestanden".
Bold at most one or two phrases. Never begin with change-log words ("Neu seit …", "Nachtrag", "Fehlte
bisher") — the `neu` chip and the patch notes carry that. Where the course was found (other faculty,
module directory only) can be a short factual clause *inside* the note.

## 8. "Zu klären"

Open questions that block a decision: module assignment unclear, recognition of a foreign course,
places not yet secured, which project to apply for. Each item: bold lead + one or two sentences.
When resolved, keep it with `done:true` and a "Geklärt:" lead summarising the answer; remove it a term later.
Time-bound items get `until`.
