# Studienplaner für Claude — Einrichtung Schritt für Schritt

*English version: [README.md](README.md)*

Dieser Skill lässt Claude einen **persönlichen Studienplaner** bauen und pflegen: eine einzige Seite mit dem
Kurskatalog deines Semesters, einem Stundenplan mit Überschneidungsprüfung, deiner Wunschliste und deinem
Leistungsstand gegen die Prüfungsordnung. Deine Häkchen, Noten und Wünsche werden gespeichert und bleiben
erhalten, wenn Claude jedes Semester die neuen Kurse einliest.

![Studienplaner, oberer Teil](../../../../docs/img/tour-top.png)

---

## Inhalt
1. [Was du brauchst](#1-was-du-brauchst)
2. [Installieren](#2-installieren)
3. [Unterlagen bereitlegen](#3-unterlagen-bereitlegen)
4. [Stud.IP (oder dein Campus-System) verbinden](#4-studip-oder-dein-campus-system-verbinden)
5. [Den ersten Planer erstellen lassen](#5-den-ersten-planer-erstellen-lassen)
6. [Rundgang: Was du beim ersten Öffnen siehst](#6-rundgang-was-du-beim-ersten-öffnen-siehst)
7. [Den Planer aktuell halten](#7-den-planer-aktuell-halten)
8. [Datenschutz und Grenzen](#8-datenschutz-und-grenzen)
9. [Häufige Fragen](#9-häufige-fragen)
10. [Für Entwickler:innen](#10-für-entwicklerinnen)

---

## 1. Was du brauchst

- Einen **Claude-Account mit bezahltem Tarif** (Pro, Max, Team oder Enterprise) — Plugins und veröffentlichte
  Seiten mit Speicher setzen das voraus. Unter *Settings → Capabilities* (Einstellungen → Funktionen) muss
  **„Code execution and file creation“** (Codeausführung und Dateierstellung) eingeschaltet sein.
- Die **Claude Desktop-App** (Windows oder macOS) — empfohlen, weil Claude dort einen eingebauten Browser hat,
  in dem du dich selbst bei Stud.IP anmeldest. Alternativ die Erweiterung **Claude in Chrome**.
- Zugang zu deinem **Campus-System** (Stud.IP, HISinOne, LSF, CAMPUSonline …) — oder zumindest den
  Kurskatalog als PDF.

## 2. Installieren

Wähle **einen** der Wege. Weg A ist der bequemste, weil du Updates automatisch bekommst.

### A — Als Plugin aus dem Marketplace (empfohlen)

1. Öffne Claude (Desktop-App oder claude.ai) und klicke in der Seitenleiste auf **Customize** (Anpassen) →
   **Plugins**.
2. Wähle **Add marketplace** (Marketplace hinzufügen) und gib ein:
   ```
   zothken/study-planner
   ```
3. Unter **Discover** erscheint **study-planner**. Klicke auf **Install**.
4. Optional: Beim Marketplace **Sync automatically** einschalten, dann kommen Verbesserungen von allein.

### B — Als Plugin-Datei

1. Lade [`dist/study-planner.plugin`](../../../../dist/study-planner.plugin) aus diesem Repository herunter.
2. **Customize → Plugins** → Upload-Option → Datei auswählen.

### C — Nur den Skill hochladen

1. Lade [`dist/study-planner-skill.zip`](../../../../dist/study-planner-skill.zip) herunter (nicht entpacken).
2. **Customize → Skills** → **„+“** → **„+ Create skill“** → **„Upload a skill“** → ZIP auswählen.
3. Den Skill in der Liste einschalten.

### D — Claude Code (Terminal)

```
/plugin marketplace add zothken/study-planner
/plugin install study-planner@zothken-plugins
```

> **Kurzer Test:** Schreib Claude „Wie richte ich den Studienplaner ein?“. Antwortet es mit Schritten aus dieser
> Anleitung, ist der Skill aktiv.

## 3. Unterlagen bereitlegen

Claude plant nur so gut wie die Regeln, die es kennt. Leg diese Dateien in einen Ordner (z. B. `Uni/Orga`),
den du in der Desktop-App mit der Unterhaltung verbindest, oder lade sie direkt in den Chat oder in ein Projekt:

| Unterlage | Wofür |
|---|---|
| **Prüfungsordnung** (fachspezifischer Teil, aktuelle Fassung) | Bereiche, Leistungspunkte, Schwerpunkt-Regeln, Zulassung zur Abschlussarbeit, Gesamtnote |
| **Modulhandbuch / Modulbeschreibungen** | Welche Kurse in welchem Modul und Schwerpunkt zählen |
| **Zulassungsbescheid** (falls mit Auflagen) | Auflagen, Punkte, Frist |
| **Leistungsübersicht / Transcript** (falls schon etwas bestanden ist) | Bereits erbrachte Leistungen mit Noten |
| optional: **Screenshot deines Stud.IP-Stundenplans** | Claude übernimmt die Farben pro Schwerpunkt |

## 4. Stud.IP (oder dein Campus-System) verbinden

Es gibt **nichts zu installieren und keinen API-Schlüssel**. Claude liest den Katalog über deine eigene,
angemeldete Browsersitzung — so, wie du ihn auch selbst sehen würdest.

**Stud.IP**
1. Sag Claude die Adresse deiner Stud.IP-Instanz (z. B. `https://studip.uni-osnabrueck.de`).
2. Claude öffnet die Seite im Browser-Fenster der Desktop-App. **Melde dich dort selbst an**
   (auch mit Uni-Login/2FA). Claude tippt nie ein Passwort ein und fragt auch nicht danach.
3. Claude liest dann das Vorlesungsverzeichnis deines Studiengangs, gleicht es mit dem **Modulverzeichnis** ab
   (dort stehen Kurse anderer Fakultäten, die im Baum fehlen), öffnet jede Kursseite und zählt, in welchen
   Semestern ein Kurs zuletzt lief.
4. Claude merkt sich die gefundenen IDs im Planer selbst — beim nächsten Import geht es schneller.

Stud.IP-Sitzungen laufen schnell ab. Wenn Claude meldet, dass du wieder auf der Login-Seite bist, meldest du
dich einfach erneut an; Claude macht danach von selbst weiter. Claude **ändert in Stud.IP nichts** — es meldet
dich nirgends an und schreibt nichts.

**Andere Systeme** (HISinOne, LSF/QIS, CAMPUSonline/TUMonline, CampusNet, …)
- Gib Claude den Link zum Vorlesungsverzeichnis. Viele Kataloge sind öffentlich, dann braucht es gar keinen Login.
- Sonst läuft es wie bei Stud.IP: Du meldest dich im Browser-Fenster an, Claude liest.
- Geht beides nicht, reicht auch ein **PDF des Katalogs**, ein **Kalender-Export (ICS)** oder eine eingefügte
  Kursliste.

## 5. Den ersten Planer erstellen lassen

Schreib Claude zum Beispiel:

> Erstelle mir einen Studienplaner für meinen M.Sc. Cognitive Science an der Uni Osnabrück, PO 2024,
> WiSe 2026/27. Stud.IP: https://studip.uni-osnabrueck.de. Prüfungsordnung und Modulhandbuch liegen in
> meinem Ordner Uni/Orga, meinen Zulassungsbescheid lade ich hoch.

Was dann passiert:
1. Claude liest deine Unterlagen und stellt dir **ein paar kurze Fragen**: Vorwissen aus dem bisherigen
   Studium, Interessen, feste Termine (Job, Pendeln), wie viele Punkte du dir dieses Semester vornimmst.
2. Claude zeigt dir eine **Zusammenfassung der Regeln**, die es aus der Prüfungsordnung gelesen hat
   (z. B. „44 LP Wahlpflicht, mind. 20 aus einem Schwerpunkt“). Korrigier hier, was nicht stimmt.
3. Claude öffnet Stud.IP — **du meldest dich an** — und liest alle Kurse ein.
4. Claude bewertet jeden Kurs für dich, schreibt eine kurze Einschätzung, prüft die Seite und veröffentlicht
   sie als **Artefakt** „Studienplaner …“. Du findest es danach in deiner Artefakt-Galerie auf claude.ai und
   kannst es anpinnen.

Rechne beim ersten Mal mit 20–40 Minuten, je nach Größe des Katalogs. Du musst nicht zuschauen.

## 6. Rundgang: Was du beim ersten Öffnen siehst

Oben läuft eine **Navigationsleiste** mit, darunter stehen die **Kennzahlen**: bestandene Punkte von der
Gesamtsumme, geplante Punkte in diesem Semester, offene Auflagen, Notenschnitt, Kandidaten, Wunschliste und
Überschneidungen (rot, sobald es welche gibt).

**Patch Notes** — Was sich bei den letzten Updates geändert hat, neueste zuerst. Nur der neueste Eintrag ist
aufgeklappt. Neue Kurse erkennst du im Katalog am gestrichelten Chip **„neu · Datum“**.

**Studienfortschritt** — Ein Balken pro Bereich der Prüfungsordnung. Dunkel = bestanden, hell = geplant
(„belege ich“). Darunter die Schwerpunkt-Balken mit Mindest- und Höchstgrenze und eine Zeile zur Zulassung zur
Abschlussarbeit. Auflagen stehen **neben** der Studienrechnung, wenn sie nicht auf die Gesamtpunkte zählen.

![Studienfortschritt](../../../../docs/img/tour-progress.png)

**Auflagen** — Nur wenn deine Zulassung Auflagen hat: bereits bestandene und die, die in diesem Semester laufen.

**Stundenplan** — Alles, was du auf **„belege ich“** gesetzt hast, in der Farbe seines Schwerpunkts.
**Gestrichelt** erscheinen Kurse, die du als **Wunsch für dieses Semester** vorgemerkt hast (Kandidaten).
**Rot** wird nur ein Kandidat, der auf etwas fest Belegtem liegt — fest belegte Kurse werden nie rot, die
Überschneidung steht dann auf ihrer Karte. Kurse ohne festen Wochentermin (Blockseminare) stehen darunter.

![Stundenplan](../../../../docs/img/tour-timetable.png)

**Kurskatalog** — Jede Karte zeigt:
- die **Ampel**: *passt* (dein Vorwissen reicht), *machbar* (kostet Einarbeitung), *gesperrt*
  (Voraussetzung fehlt oder Teil II), *Auflage*;
- Punkte, Kursnummer, **Turnus** (kräftig umrandet = Angabe der Lehrenden, blass = aus der Historie gezählt),
  Modul-Chips (Klick filtert nach dem Modul);
- Termine, Lehrende, eine **Einschätzung für dich** und — falls vorhanden — Überschneidungen;
- die **Status-Knöpfe**: *belege ich*, *Wunsch*, *bestanden*, *nicht bestanden*.

Mit den Filtern oben grenzt du nach Ampel, deinem Status, Schwerpunkt/Modul und Art ein, gruppierst nach
Schwerpunkt, Modul, Ampel oder Turnus und durchsuchst Titel, Lehrende und Nummern.

![Kurskatalog](../../../../docs/img/tour-catalog.png)

**Wunschliste & kommende Semester** — Alles auf „Wunsch“, getrennt nach „Kandidaten für jetzt“ und „für
spätere Semester“ (Ziel-Semester auf der Karte wählbar), dazu wiederkehrende Kurse, die dieses Semester nicht
laufen.

**Studienprojekt** (falls es eins gibt), **Zu klären** (offene Fragen; Geklärtes bleibt abgehakt stehen) und
**Deine Daten**: Speicherort, **„Als JSON sichern“** (Backup — leg es in deinen Uni-Ordner), „JSON einlesen“,
„Alles zurücksetzen“ (fragt zweimal).

**So benutzt du ihn**
- **belege ich** → zählt als geplant in den Balken und erscheint fest im Stundenplan.
- **Wunsch** → mit Ziel „aktuelles Semester“ ein gestrichelter Kandidat im Stundenplan; mit späterem Ziel ein
  Merkposten.
- **bestanden** → trag Note, Bereich und Semester ein; das rechnet in Balken und Schnitt.
- Deine Einträge sind in der **Artefakt-Datenbank** gespeichert und auf allen Geräten gleich, auf denen du bei
  Claude angemeldet bist.

## 7. Den Planer aktuell halten

Sag Claude einfach, was du brauchst — der Skill kümmert sich um den Rest und schreibt jede Änderung in die
Patch Notes:

| Du schreibst … | Claude … |
|---|---|
| „Schau in Stud.IP, ob neue Kurse dazugekommen sind.“ | liest neu ein, markiert Neues mit „neu“, behält deine Einträge |
| „Neues Semester: Plane das SoSe 2027.“ | wechselt das Semester, importiert den neuen Katalog, aktualisiert den Turnus |
| „Nimm den Bachelor-Kurs *Introduction to Neuroinformatics* mit auf.“ | holt genau diesen Kurs, mit Chip „B.Sc.-Kurs“ |
| „Ich bin in X, Y und Z eingeschrieben.“ | setzt sie auf „belege ich“, entfernt überholte Hinweise |
| „Die Frage zur Modulzuordnung ist geklärt: …“ | hakt den Punkt ab und passt die Karte an |
| „Übernimm die Farben aus meinem Stud.IP-Stundenplan.“ + Screenshot | passt die Farben pro Schwerpunkt an |

## 8. Datenschutz und Grenzen

- Der Planer ist ein **privates Artefakt** in deinem Claude-Account. Weil er eine Datenbank nutzt, kann er nicht
  öffentlich geteilt werden.
- Claude liest dein Campus-System nur in deiner eigenen Sitzung, **ändert dort nichts** und fragt nie nach
  Passwörtern.
- Ampel, Turnus und die Auslegung der Prüfungsordnung sind **Einschätzungen**. Verbindlich ist allein die
  Prüfungsordnung bzw. das Prüfungsamt — im Zweifel dort nachfragen (Claude legt dafür „Zu klären“-Punkte an).
- Das JSON-Backup ist die einzige Sicherung, die einen Verlust des Artefakts überlebt.

## 9. Häufige Fragen

**Es fehlen Kurse, die ich in Stud.IP sehe.** Oft hängen sie in einem anderen Fachbereich. Sag Claude den Titel;
der Abgleich über das Modulverzeichnis ist Teil jedes Imports, einzelne Kurse lassen sich jederzeit nachtragen.

**Zwei Kurse ändern immer gemeinsam ihren Status.** Dann haben sie denselben internen Schlüssel (sehr ähnliche
Titel). Sag Claude Bescheid — die Prüfung vor jedem Veröffentlichen fängt das ab, ältere Planer lassen sich damit
reparieren.

**Meine Einträge sind weg.** Öffne den Planer auf claude.ai, angemeldet mit demselben Account. Hilft das nicht:
„Deine Daten → JSON einlesen“ mit deinem letzten Backup.

**Geht das auch ohne Desktop-App?** Ja, wenn dein Katalog öffentlich ist oder du ihn als PDF/Liste gibst. Für
Kataloge hinter einem Login brauchst du den Browser der Desktop-App oder Claude in Chrome.

**Geht das auch auf Englisch?** Ja. Schreib Claude auf Englisch, dann ist der Planer englisch.

## 10. Für Entwickler:innen

- `assets/planner-template.html` ist die Engine (Design, Logik, DE/EN-Texte). Alles Individuelle steckt in zwei
  JSON-Blöcken: `#planner-config` (Prüfungsordnung, Schwerpunkte, Module, Farben, Import-Rezept) und
  `#planner-data` (Kurse, Patch Notes, Hinweise, offene Fragen).
- `scripts/planner.py extract|check|build` zieht die JSON-Blöcke aus einem veröffentlichten Planer, prüft sie
  (doppelte Schlüssel, falsche Zeitangaben, Modul/Schwerpunkt-Widersprüche, Patch-Notes-Regeln) und baut die Seite.
- `scripts/verify.mjs` rendert hell/dunkel und Handy/Desktop mit einer Datenbank-Attrappe und macht Screenshots.
- `scripts/lms/studip/studip-helpers.js` sind die Stud.IP-Importfunktionen für den Browser.
- Ausprobieren: `python3 scripts/planner.py build --config assets/example/config.json --data assets/example/data.json -o beispiel.html`.

Fehler oder Wünsche: Issues im Repository [zothken/study-planner](https://github.com/zothken/study-planner).
