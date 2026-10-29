# Mobilitätsmängel Merzig

Eine gemeinsam gepflegte Sammlung von Mängeln an der Rad-, Fuß- und Verkehrsinfrastruktur in Merzig: Laternen mitten im Radweg, falsche oder fehlende Schilder, fehlende Querungen, schlechter Belag.

Jeder Mangel ist ein [Issue](../../issues) mit einer Geometrie (Punkt, Linie oder Fläche).
Alle Meldungen erscheinen auf der **[Karte](https://pasbi.github.io/merzig-mobilitaetsmaengel/)**.

## Mangel melden

1. Auf der [Karte](https://pasbi.github.io/merzig-mobilitaetsmaengel/) „Punkt(e)“, „Linie“ oder „Fläche“ wählen und in die Karte klicken; bei „Punkt(e)“ fügt jeder weitere Klick eine weitere Stelle zur selben Meldung hinzu.
2. „Meldung auf GitHub erstellen“ öffnet das Formular mit vorausgefüllter Geometrie; die Straße steht als Vorschlag im Titel.
3. Titel anpassen (Ort: kurze Beschreibung), Art, Schwere, Problem und optional Lösungsvorschlag ausfüllen, Fotos per Drag & Drop ins Problem-Feld ziehen, absenden.

Gehört eine weitere Stelle zu einer bestehenden Meldung (z. B. dieselben zu engen Fahrradbügel an mehreren Orten), unter „Werkzeuge“ → „Koordinaten abgreifen“ die Stellen anklicken, das GeoJSON kopieren und die `Feature`-Einträge im Issue in die Liste unter „Geometrie“ einfügen (Issue öffnen → ··· → Edit).
Daneben misst „Entfernung messen“ die Länge einer geklickten Strecke, etwa für Umwege oder Abschnittslängen in der Beschreibung.

Jede Meldung hat einen Link auf der Karte: `https://pasbi.github.io/merzig-mobilitaetsmaengel/#12` zoomt auf #12 und öffnet das Popup; beim Anklicken einer Meldung erscheint die Nummer in der Adresszeile, die URL lässt sich dann kopieren.

Ohne Karte geht es auch direkt über [„Mangel melden“](../../issues/new/choose); die Geometrie dann als GeoJSON-`FeatureCollection` eintragen (erst Länge, dann Breite), z. B.
`{"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[6.6385,49.4435]}}]}`.
Mehrere Stellen in einer Meldung sind einfach mehrere `Feature`-Einträge in der Liste; GitHubs eigene Kartenvorschau im Issue zeigt nackte Geometrien wie `MultiPoint` nicht an.

## Lebenszyklus einer Meldung

Der Zustand wird über `status:`-Labels geführt, jede Meldung trägt genau eines (setzt man ein zweites, entfernt eine Action automatisch das alte); Themen-Issues haben keinen Status, den tragen ihre Sub-Issues:

| Label | Bedeutung |
| --- | --- |
| `status: unbestätigt` | Neu eingegangen, noch nicht vor Ort geprüft (wird vom Formular gesetzt) |
| `status: geprüft` | Von einer Person aus dem Team vor Ort bestätigt |
| `status: weitergegeben` | An die zuständige Stelle weitergegeben (Datum, Empfänger und Kanal im Kommentar festhalten) |
| `status: in-arbeit` | Die zuständige Stelle hat Maßnahmen angekündigt oder begonnen |
| `status: behoben` | Erledigt, Issue wird geschlossen |
| `status: abgelehnt` | Die zuständige Stelle lehnt ab (Begründung im Kommentar); der Mangel besteht weiter, das Issue bleibt offen |
| `status: obsolet` | Durch veränderten Kontext irrelevant geworden (z. B. Umbau, Straße gesperrt), Issue wird geschlossen |

Weitere Label-Gruppen:

- `art:` – Kategorie; mehrere erlaubt, das erste bestimmt die Farbe auf der Karte.
  `art: vorschlag` ist für Ideen ohne akuten Mangel (z. B. ein neuer Bahnhaltepunkt); Mangel ist, was einen bestehenden Weg unbenutzbar oder gefährlich macht.
- `schwere:` – niedrig, mittel, hoch (genau eines).
- `zuständigkeit:` – Stadt, Landkreis, Land, Bund, privat oder unklar; bei geteilter Zuständigkeit mehrere setzen.
- `thema:` – bündelt mehrere Meldungen zu einem Thema (z. B. `thema: einbahnstraße`); die Karte bietet dafür einen Filter.
  Für die Struktur zusätzlich ein Eltern-Issue mit der allgemeinen Argumentation anlegen und die Einzelmeldungen als Sub-Issues zuordnen (im Eltern-Issue „Add sub-issue → Add existing issue“ oder im Kind-Issue unter „Relationships“).
- `foto gesucht`, `messung gesucht` – Aufgaben für alle, die vor Ort vorbeikommen; nach dem Hochladen bzw. Eintragen das Label wieder entfernen.
- `duplikat` – bereits gemeldet, im Kommentar das ursprüngliche Issue verlinken und schließen.

Beim Prüfen einer neuen Meldung bitte `art:` und `schwere:` passend zu den Angaben im Formular setzen und die Zuständigkeit eintragen, sobald sie bekannt ist.
Die vollständige Liste steht in [`labels.json`](labels.json), technische Hinweise in [`AGENTS.md`](AGENTS.md).

## Lizenz

Code (Kartenseite, Vorlagen, Skripte): [MIT](LICENSE).

Inhalte der Meldungen (Texte, Geometrien, Fotos): [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.de).
Jede Person, die einen Mangel meldet, bestätigt dies im Formular.
Presse, Verwaltung und alle anderen dürfen die Meldungen frei nutzen, mit Nennung von „Mobilitätsmängel Merzig“ und Link auf dieses Repository.

Kartendaten: © [OpenStreetMap-Mitwirkende](https://www.openstreetmap.org/copyright), [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
