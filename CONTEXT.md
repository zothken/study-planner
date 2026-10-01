# study-planner

A Claude plugin that builds and maintains a student's personal study planner from their university's course offering and examination regulations.

## Language

**Planner** (Planer, Studienplaner):
The published page a student keeps all degree long: this term's courses with a rating for them, timetable, wishlist and progress against the regulations.
_Avoid_: dashboard, tracker, app

**Course catalogue** (Kurskatalog):
What the university's campus system offers in one term — the courses with their numbers, credits, times, lecturers and module assignments.
_Avoid_: directory, Verzeichnis, Vorlesungsverzeichnis (when used alone), course list

**Module directory** (Modulverzeichnis):
The campus system's lookup of which courses count for which module; used during import to find courses the catalogue tree misses.
_Avoid_: module catalogue, module list

**Claude directory** (Claude-Verzeichnis):
Anthropic's directory of reviewed plugins, where students browse and install plugins inside Claude.
_Avoid_: marketplace (alone), store, plugin directory

**Import recipe** (Import-Rezept):
The identifiers needed to repeat a catalogue import without rediscovery — catalogue tree nodes, term ids, module codes.
_Avoid_: import config, settings

**Admission condition** (Auflage):
A course the admission letter requires on top of the degree.
_Avoid_: requirement, prerequisite
