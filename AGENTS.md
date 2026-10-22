# Hinweise für Agenten und Mitwirkende

## Projekt

Sammlung von Mängeln an der Rad-, Fuß- und Verkehrsinfrastruktur in Merzig.
Jeder Mangel ist ein GitHub-Issue mit GeoJSON-Geometrie; `docs/index.html` zeigt alle Issues auf einer Karte (GitHub Pages, Branch `main`, Ordner `/docs`).
Keine Build-Schritte, keine Abhängigkeiten außer Leaflet per CDN.

## Sprache

Alles auf Deutsch: Dateien, Kommentare, Labels, Issues, Commit-Nachrichten, Antworten.
Ausnahme: Dateinamen und Code-Bezeichner ohne Umlaute; Labels dürfen Umlaute enthalten (`status: geprüft`).
Prosa in Markdown: ein Satz pro Zeile.
Das `README.md` richtet sich an Meldende und Mitwirkende; technische Einrichtung und Betrieb gehören in `EINRICHTUNG.md`.

## Datenmodell

- Geometrie steht im Issue-Body als ```` ```geojson ```` -Block, Koordinaten in Länge/Breite-Reihenfolge.
  Die Karte liest jede Form (nackte Geometrie, Feature, FeatureCollection, GeometryCollection), erzeugt selbst aber immer eine FeatureCollection aus einzelnen Features, weil GitHubs Vorschau im Issue nackte Geometrien nicht rendert.
  Mehrere Punkte als mehrere Point-Features, nicht als MultiPoint.
- Formularfelder werden von GitHub als `### Feldname\n\nWert` gerendert; `docs/index.html` liest sie mit `feld(body, label)`.
  Feldnamen im Formular nicht umbenennen, ohne den Parser anzupassen.
- Labels: genau eines aus `art: …` (Farbe auf der Karte), `schwere: …` und `status: …`; null bis mehrere aus `zuständigkeit: …` (Stadt, Landkreis, Land, Bund, privat, unklar; geteilte Zuständigkeit ist normal); dazu `duplikat`.
  Vollständige Liste und Bedeutung in `labels.json` und `README.md`.
- Geschlossen wird ein Issue nur mit `status: behoben` oder `status: abgelehnt`.

## Drei Orte, die zusammenpassen müssen

Eine neue Kategorie oder ein neuer Status muss an allen drei Stellen eingetragen werden:

1. `.github/ISSUE_TEMPLATE/mangel.yml` (Dropdown-Text)
2. `labels.json` (Label-Name und Farbe)
3. `docs/index.html`, Objekt `ARTEN` (Schlüssel = Label-Suffix, `form` = exakter Dropdown-Text, `farbe` = Hexfarbe wie in `labels.json`)

Repo-Name, Kartenmitte und Zoom stehen in `docs/index.html` unter `CONFIG`.

## Prüfen vor dem Abschluss

- YAML und JSON valide (`python3 -c 'import yaml,json; …'` oder `yq`/`jq`).
- JavaScript-Syntax: Script-Block aus `docs/index.html` extrahieren und `node --check` ausführen.
- Nach Änderungen am Parser: Beispiel-Body mit `feld()` und `geometrie()` durchlaufen lassen.

## Lizenz

Code MIT, Inhalte der Meldungen CC BY 4.0.
Die Lizenz-Checkboxen im Formular sind Pflicht und dürfen nicht entfernt werden.
