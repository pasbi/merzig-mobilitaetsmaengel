// Alles, was man zum Anpassen anfasst: Repo, Kartenmitte, Kategorien, Kartenstile.

export const CONFIG = {
  owner: 'pasbi',
  repo: 'merzig-mobilitaetsmaengel',
  template: 'mangel.yml',
  center: [49.4435, 6.6385],   // Merzig, Stadtmitte
  zoom: 14,
};

// Arten: Label-Suffix -> Anzeige + Farbe. Die Dropdown-Texte aus dem Issue-Formular dienen als Fallback,
// solange ein Issue noch kein "art:"-Label hat. Muss zu mangel.yml, labels.json und labels-aus-formular.yml passen.
export const ARTEN = {
  'hindernis':              { name: 'Hindernis / Engstelle',   farbe: '#e85d04', form: 'Hindernis / Engstelle' },
  'schild':                 { name: 'Beschilderung',           farbe: '#7b2cbf', form: 'Beschilderung falsch oder fehlend' },
  'regelung':               { name: 'Verkehrsregelung',        farbe: '#00838f', form: 'Verkehrsregelung / Verkehrsführung' },
  'belag':                  { name: 'Belag / Oberfläche',      farbe: '#8d5524', form: 'Belag / Oberfläche' },
  'fehlende-infrastruktur': { name: 'Fehlende Infrastruktur',  farbe: '#0a5fd6', form: 'Fehlende Infrastruktur' },
  'gefahr':                 { name: 'Gefährliche Stelle',      farbe: '#d00000', form: 'Gefährliche Stelle' },
  'sonstiges':              { name: 'Sonstiges',               farbe: '#6c757d', form: 'Sonstiges' },
};
export const GESCHLOSSEN_FARBE = '#9a9a9a';

// Kartenstile (alle aus OSM-Daten, serverseitig gerendert); der erste ist Standard.
// Im Dark-Mode werden die Kacheln per CSS invertiert, außer bei Ebenen mit className 'nicht-invertieren' (Luftbild).
export const KARTENSTILE = {
  'CyclOSM': {
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    optionen: {
      maxZoom: 20, subdomains: 'abc',
      attribution: '<a href="https://www.cyclosm.org">CyclOSM</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende',
    },
  },
  'OSM Standard': {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    optionen: {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende',
    },
  },
  'Luftbild': {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    optionen: {
      maxZoom: 19, className: 'nicht-invertieren',
      attribution: 'Luftbild © <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics, GIS User Community',
    },
  },
};
