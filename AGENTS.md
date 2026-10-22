# Hinweise für Agenten und Mitwirkende

## Projekt

Sammlung von Mängeln an der Rad-, Fuß- und Verkehrsinfrastruktur in Merzig.
Jeder Mangel ist ein GitHub-Issue mit GeoJSON-Geometrie; die Seite in `karte/` zeigt alle Issues auf einer Karte.
Aufbau von `karte/`: `index.html` (nur Markup), `style.css`, `config.js` (Repo, Kartenmitte, Kategorien `ARTEN`, Kartenstile), `data.js` (Laden, Body-Parser, Geometrie-Erzeugung; kein DOM, kein Leaflet, mit `node` importierbar) und `app.js` (Karte, Liste, Filter, Zeichenmodus, Mobil-Panel); ES-Module ohne Build-Schritt.
Die Action `.github/workflows/pages.yml` erzeugt `karte/issues.json` aus den Issues und veröffentlicht `karte/` als GitHub Pages (Source „GitHub Actions“, keine Commits); die Seite fällt ohne `issues.json` auf die GitHub-API zurück.
Das Datenformat von `issues.json` (`{stand, labelFarben:{name:hex}, issues:[{number,title,state,url,labels,body,updated,kinder,eltern}]}`) muss mit `ladeIssuesVonApi()` in `data.js` übereinstimmen.
Keine Build-Schritte, keine Abhängigkeiten außer Leaflet per CDN.

## Betrieb

- Nach Änderungen an `labels.json`: `scripts/labels-anlegen.sh` ausführen (braucht `gh` und `jq`); es legt an und überschreibt, löscht aber nie.
  Umbenennen zuerst auf GitHub (nimmt die Issues mit), dann `labels.json` nachziehen.
- Die Pages-Action läuft bei Issue-Ereignissen, bei Push nach `karte/` und stündlich.
  Sub-Issue-Verknüpfungen lösen kein Ereignis aus; sofort sichtbar werden sie über *Actions → Pages → Run workflow*.
- Die Action `labels-aus-formular.yml` setzt `art:` und `schwere:` aus den Dropdowns beim Anlegen; beim Bearbeiten ergänzt sie nur fehlende Gruppen.
- Die Action `labels-exklusiv.yml` hält `status:`, `art:` und `schwere:` exklusiv: das zuletzt gesetzte Label einer Gruppe verdrängt die anderen.
- Lokal ansehen: `python -m http.server -d karte 8000`; ohne `issues.json` liest die Seite direkt von der GitHub-API (60 Anfragen/Stunde, ETag-Abgleich, eine Anfrage je Eltern-Issue).
  `file://` geht nicht, der OSM-Kachelserver verlangt einen Referer.
- Beim Melden fragt die Seite die Straße per Nominatim ab und befüllt nur Titel und Geometrie vor.

## Sprache

Alles auf Deutsch: Dateien, Kommentare, Labels, Issues, Commit-Nachrichten, Antworten.
Ausnahmen: Dateinamen auf Englisch (`config.js`, `style.css`); Code-Bezeichner ohne Umlaute; Labels dürfen Umlaute enthalten (`status: geprüft`).
Prosa in Markdown: nach jedem Satzende ein Zeilenumbruch, ein Satz pro Zeile, keine Leerzeile zwischen den Sätzen eines Absatzes, kein Umbruch innerhalb eines Satzes.
Gilt für alle Markdown-Dateien, Issue-Texte und Kommentare; nicht für Code, Tabellen, Überschriften und kurze Listenpunkte.
Das `README.md` richtet sich an Meldende und Mitwirkende; Technik und Betrieb gehören hierher, nicht ins README.

## Datenmodell

- Geometrie steht im Issue-Body als ```` ```geojson ```` -Block, Koordinaten in Länge/Breite-Reihenfolge.
  Die Karte liest jede Form (nackte Geometrie, Feature, FeatureCollection, GeometryCollection), erzeugt selbst aber immer eine FeatureCollection aus einzelnen Features, weil GitHubs Vorschau im Issue nackte Geometrien nicht rendert.
  Mehrere Punkte als mehrere Point-Features, nicht als MultiPoint.
- Formularfelder werden von GitHub als `### Feldname\n\nWert` gerendert; `karte/data.js` liest sie mit `feld(body, label)`.
  Feldnamen im Formular nicht umbenennen, ohne den Parser anzupassen (er kennt für den Standort den alten Namen „Ort (Adresse oder Beschreibung)“ und den neuen „Standort“).
- Formularfelder: Art, Schwere, Problem, Lösungsvorschlag (optional), Standort (Adresse, Bereich oder Liste mit einer Zeile je Stelle in der Reihenfolge der Geometrie-Punkte), Geometrie, Lizenz-Checkboxen.
- Labels: genau eines aus `art: …` (Farbe auf der Karte), `schwere: …` und `status: …`; null bis mehrere aus `zuständigkeit: …` (Stadt, Landkreis, Land, Bund, privat, unklar; geteilte Zuständigkeit ist normal); optional `thema: …` für Bündel mehrerer Issues (die Karte baut daraus automatisch einen Filter, keine Pflege in `ARTEN` nötig); dazu `duplikat`.
  Bündel zusätzlich als Eltern-Issue mit Sub-Issues strukturieren; dafür gibt es die Vorlage `thema.yml` ohne Geometrie (erscheint auf der Karte nur in der Liste).
  Vollständige Liste und Bedeutung in `labels.json` und `README.md`.
- Geschlossen wird ein Issue nur mit `status: behoben` oder `status: obsolet`.
  `status: abgelehnt` bleibt offen: der Mangel besteht in der echten Welt weiter.

## Vorbefüllung des Issue-Formulars

Die Karte befüllt nur `title` und das Feld `geometrie` über die URL.
Andere Formularfelder nicht per URL vorbefüllen: GitHub setzt sie bei jeder Neudarstellung aus der URL zurück, sie sind dann nicht mehr editierbar.

## Vier Orte, die zusammenpassen müssen

Eine neue Kategorie oder Schwere muss an allen vier Stellen eingetragen werden:

1. `.github/ISSUE_TEMPLATE/mangel.yml` (Dropdown-Text)
2. `labels.json` (Label-Name und Farbe)
3. `karte/config.js`, Objekt `ARTEN` (Schlüssel = Label-Suffix, `form` = exakter Dropdown-Text, `farbe` = Hexfarbe wie in `labels.json`)
4. `.github/workflows/labels-aus-formular.yml`, Tabellen `ART` und `SCHWERE` (Dropdown-Text → Label)

Labels sind die Wahrheit, die Dropdowns nur die Eingabe.
Neue Status-, Zuständigkeits- oder Themen-Labels brauchen nur `labels.json` und die Tabelle im `README.md`.

Repo-Name, Kartenmitte, Zoom und Kartenstile stehen in `karte/config.js`.

## Prüfen vor dem Abschluss

- YAML und JSON valide (`python3 -c 'import yaml,json; …'` oder `yq`/`jq`).
- JavaScript-Syntax: `node --check karte/*.js`.
- Nach Änderungen am Parser: `data.js` in einem `.mjs`-Testskript importieren und Beispiel-Bodys durch `feld()`, `geometrie()`, `artVon()` laufen lassen.
- Jede in `app.js` per `$('id')` benutzte ID muss in `index.html` existieren.

## Lizenz

Code MIT, Inhalte der Meldungen CC BY 4.0.
Die Lizenz-Checkboxen im Formular sind Pflicht und dürfen nicht entfernt werden.
