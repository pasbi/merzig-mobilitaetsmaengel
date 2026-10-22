// Karte, Liste, Filter, Popups, Zeichenmodus, Mobil-Panel. Leaflet kommt global aus index.html.
import { CONFIG, ARTEN, GESCHLOSSEN_FARBE, KARTENSTILE } from './config.js';
import { ladeIssues, standortVon, geometrie, artenVon, statusVon, geometrieAus, esc, adresseFuer, neueMeldungUrl, labelSucheUrl } from './data.js';

const $ = id => document.getElementById(id);

// ---------- Karte ----------
const map = L.map('map').setView(CONFIG.center, CONFIG.zoom);
const KARTEN = Object.fromEntries(Object.entries(KARTENSTILE).map(([name, k]) => [name, L.tileLayer(k.url, k.optionen)]));
let gewaehlteKarte = Object.keys(KARTEN)[0];
try { const g = localStorage.getItem('kartenstil'); if (KARTEN[g]) gewaehlteKarte = g; } catch (e) {}
KARTEN[gewaehlteKarte].addTo(map);
L.control.layers(KARTEN, null, { position: 'topright' }).addTo(map);
map.on('baselayerchange', e => { try { localStorage.setItem('kartenstil', e.name); } catch (err) {} });

const issueLayer = L.featureGroup().addTo(map);
$('repoLink').href = `https://github.com/${CONFIG.owner}/${CONFIG.repo}`;

// ---------- Zustand ----------
let issues = [];
let datenStand = null;
let labelFarben = {}; // Label-Name -> Hexfarbe ohne '#'
let ladeWarnung = '';

// ---------- Darstellung ----------
const aktiveArten = () => [...document.querySelectorAll('#artFilter input:checked')].map(i => i.value);
const statusFilter = () => document.querySelector('input[name=st]:checked').value;

function zeichne() {
  issueLayer.clearLayers();
  const liste = $('liste');
  liste.innerHTML = '';
  const arten = aktiveArten();
  const st = statusFilter();
  const thema = $('themaFilter').value;
  const byNr = Object.fromEntries(issues.map(i => [i.number, i]));
  let n = 0;

  const passt = issue =>
    (st === 'all' || issue.state === st) &&
    (!thema || issue.labels.includes(thema)) &&
    artenVon(issue).some(a => arten.includes(a));

  // Ein Eintrag wird gezeigt, wenn er selbst passt oder eines seiner Sub-Issues
  const sichtbar = issue => passt(issue) || issue.kinder.some(k => byNr[k] && sichtbar(byNr[k]));

  function eintrag(issue, container) {
    const artListe = artenVon(issue);
    const artName = artListe.map(a => ARTEN[a].name).join(', ');
    const farbe = issue.state === 'closed' ? GESCHLOSSEN_FARBE : ARTEN[artListe[0]].farbe;
    const geo = geometrie(issue.body);
    const selbst = passt(issue);
    if (selbst) n++;

    const li = document.createElement('li');
    li.className = issue.state + (geo ? '' : ' ohneGeo') + (selbst ? '' : ' nurKontext');
    li.style.borderLeftColor = farbe;
    li.title = `${artName} · ${issue.state === 'open' ? 'offen' : 'erledigt'} · Status: ${statusVon(issue)}`;
    li.innerHTML = `<span class="nr" title="Issue-Nummer auf GitHub">#${issue.number}</span><span>${esc(issue.title)}</span>`;
    container.appendChild(li);

    if (geo && selbst) {
      const layer = L.geoJSON(geo, {
        style: () => ({ color: farbe, weight: 4, opacity: .9, fillOpacity: .25, dashArray: issue.state === 'closed' ? '6 6' : null }),
        pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius: 9, color: '#fff', weight: 2, fillColor: farbe, fillOpacity: .95 }),
      });
      layer.bindPopup(popup(issue, artName));
      layer.addTo(issueLayer);
      li.onclick = () => { if (istMobil()) panelSchliessen(); map.fitBounds(layer.getBounds().pad(0.5), { maxZoom: 18 }); layer.openPopup(); };
    } else if (!geo) {
      li.title += ' · ohne Ort auf der Karte';
      li.onclick = () => toast(`#${issue.number} hat keinen Ort auf der Karte.`, issue.url);
    } else {
      li.onclick = () => toast(`#${issue.number} ist vom Filter ausgeblendet.`, issue.url);
    }

    const kinder = issue.kinder.map(k => byNr[k]).filter(k => k && sichtbar(k));
    if (kinder.length) {
      const ul = document.createElement('ul');
      ul.className = 'kinder';
      container.appendChild(ul);
      kinder.forEach(k => eintrag(k, ul));
    }
  }

  // Wurzeln: ohne Eltern-Issue (oder Eltern nicht im Repo), nach Nummer absteigend wie bei GitHub
  issues.filter(i => !(i.eltern && byNr[i.eltern]) && sichtbar(i)).forEach(i => eintrag(i, liste));

  $('anzahl').textContent = `(${n}${n < issues.length ? ` von ${issues.length}` : ''})`;
  const s = $('status');
  s.className = ladeWarnung ? 'err' : '';
  s.textContent = ladeWarnung || (datenStand
    ? `Stand: ${new Date(datenStand).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}`
    : 'Live von der GitHub-API');
  // Zusammenfassung im zugeklappten Filter-Abschnitt
  const aktiv = [];
  if (st !== 'open') aktiv.push(st === 'all' ? 'alle' : 'erledigt');
  if (arten.length < Object.keys(ARTEN).length) aktiv.push(`${arten.length} Arten`);
  if (thema) aktiv.push(thema.slice(6).trim());
  $('filterHinweis').textContent = aktiv.length ? `· ${aktiv.join(', ')}` : '';
}

function popup(issue, artName) {
  const adresse = standortVon(issue);
  return `<strong><a href="${issue.url}" target="_blank" rel="noopener">#${issue.number} ${esc(issue.title)}</a></strong>
    <div class="muted" style="font-size:12px">${esc(artName)} · ${issue.state === 'open' ? 'offen' : 'erledigt'} · Status: ${esc(statusVon(issue))}</div>
    ${adresse ? `<div>${esc(adresse).replace(/\n+/g, '<br>')}</div>` : ''}
    <div class="chips">${issue.labels.map(chip).join('')}</div>`;
}

// Label-Chip in der Farbe aus GitHub, Textfarbe nach Helligkeit; Klick öffnet die gefilterte Issue-Liste
function chip(name) {
  const hex = labelFarben[name];
  let stil = '';
  if (hex) {
    const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
    const hell = (r * 299 + g * 587 + b * 114) / 1000 > 150;
    stil = ` style="background:#${hex};color:${hell ? '#111' : '#fff'};border-color:transparent"`;
  }
  return `<a class="chip" href="${labelSucheUrl(name)}" target="_blank" rel="noopener" title="Alle Issues mit diesem Label auf GitHub"${stil}>${esc(name)}</a>`;
}

// Kurze Einblendung unten auf der Karte, optional mit Link zum Issue
let toastTimer = null;
function toast(text, url) {
  const t = $('toast');
  t.innerHTML = esc(text) + (url ? ` <a href="${url}" target="_blank" rel="noopener">Auf GitHub öffnen ↗</a>` : '');
  t.classList.add('sichtbar');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('sichtbar'), 5000);
}

// ---------- Filter ----------
const af = $('artFilter');
for (const [k, a] of Object.entries(ARTEN)) {
  const l = document.createElement('label');
  l.className = 'chk';
  l.innerHTML = `<input type="checkbox" value="${k}" checked><span class="swatch" style="background:${a.farbe}"></span>${a.name}`;
  af.appendChild(l);
}
af.addEventListener('change', zeichne);
document.querySelectorAll('input[name=st]').forEach(r => r.addEventListener('change', zeichne));
$('themaFilter').addEventListener('change', zeichne);

// Themenfilter aus den vorhandenen "thema:"-Labels aufbauen; versteckt, solange es keine gibt
function baueThemaFilter() {
  const sel = $('themaFilter');
  const alt = sel.value;
  const themen = [...new Set(issues.flatMap(i => i.labels.filter(l => l.startsWith('thema:'))))].sort();
  sel.innerHTML = '<option value="">Alle Themen</option>' +
    themen.map(t => `<option value="${esc(t)}">${esc(t.slice(6).trim())}</option>`).join('');
  sel.value = themen.includes(alt) ? alt : '';
  sel.style.display = themen.length ? '' : 'none';
}

// ---------- Laden ----------
async function start(force) {
  const s = $('status');
  s.className = ''; s.textContent = 'Lade …';
  try {
    const d = await ladeIssues(force);
    issues = d.issues; datenStand = d.stand; labelFarben = d.labelFarben; ladeWarnung = d.warnung;
    baueThemaFilter();
    zeichne();
    if (issueLayer.getLayers().length && !location.hash) map.fitBounds(issueLayer.getBounds().pad(0.2), { maxZoom: 16 });
  } catch (e) {
    s.className = 'err';
    s.textContent = `Konnte Meldungen nicht laden (${e.message}). Bei "403" ist das API-Limit erreicht, bitte später nochmal.`;
  }
}
$('btnReload').onclick = e => { e.preventDefault(); e.stopPropagation(); start(true); };

// ---------- Mobile Kopfleiste: Panel über der Karte ----------
const aside = document.querySelector('aside');
const istMobil = () => matchMedia('(max-width: 760px)').matches;
function panelZeigen(id) {
  document.querySelectorAll('aside details').forEach(d => d.open = d.id === id);
  aside.classList.add('offen');
  aside.scrollTop = 0;
  document.querySelectorAll('header.mobil button').forEach(b => b.classList.toggle('aktiv', b.dataset.panel === id));
}
function panelSchliessen() {
  aside.classList.remove('offen');
  document.querySelectorAll('header.mobil button').forEach(b => b.classList.remove('aktiv'));
}
document.querySelectorAll('header.mobil button').forEach(b => b.onclick = () => {
  const offen = aside.classList.contains('offen') && $(b.dataset.panel).open;
  offen ? panelSchliessen() : panelZeigen(b.dataset.panel);
});
$('btnSchliessen').onclick = panelSchliessen;
map.on('click', () => { if (istMobil() && !modus) panelSchliessen(); });

// ---------- Mangel melden ----------
// Modi: point/line/polygon = neue Meldung; coords = Koordinaten sammeln
let modus = null, punkte = [], skizze = null;
const hilfe = $('meldenHilfe');
const aktionen = $('meldenAktionen');
const btnErstellen = $('btnErstellen');
const coordsHilfe = $('coordsHilfe');
const coordsBox = $('coordsBox');
const coordsText = $('coordsText');
const HILFE = {
  point: 'Klicke auf die Stelle des Mangels. Weitere Klicks fügen weitere Stellen zur selben Meldung hinzu.',
  line: 'Klicke die Punkte entlang des Abschnitts, dann „Meldung erstellen“.',
  polygon: 'Klicke die Eckpunkte der Fläche (mindestens 3), dann „Meldung erstellen“.',
  coords: 'Klicke eine oder mehrere Stellen; unten erscheint das GeoJSON zum Kopieren.',
};
const HILFE_BEARBEITEN = ' Punkt ziehen = verschieben, Klick = entfernen, Zwischenpunkt ziehen = einfügen.';
const HILFE_LEER = {
  melden: 'Wähle Punkt, Linie oder Fläche und klicke in die Karte.',
  coords: 'Stellen anklicken, GeoJSON kopieren und z. B. im Geometrie-Block einer Meldung einfügen.',
};

document.querySelectorAll('#meldenButtons button, #btnCoords').forEach(b => b.onclick = () => startModus(b.dataset.mode));
$('btnAbbrechen').onclick = endeModus;
$('btnCoordsEnde').onclick = endeModus;

function startModus(m) {
  endeModus();
  modus = m;
  document.body.classList.add('imModus');
  panelSchliessen(); // mobil: nur der aktive Abschnitt bleibt als Leiste unten sichtbar
  if (istMobil()) document.querySelectorAll('aside details').forEach(d => d.open = false);
  const btn = document.querySelector(`button[data-mode=${m}]`);
  if (btn) btn.classList.add('active');
  if (m === 'coords') {
    $('secCoords').open = true;
    coordsHilfe.textContent = HILFE[m] + HILFE_BEARBEITEN;
    coordsBox.style.display = '';
    aktualisiereCoordsText();
  } else {
    $('secMelden').open = true;
    hilfe.textContent = HILFE[m] + HILFE_BEARBEITEN;
    aktionen.style.display = '';
  }
  map.getContainer().style.cursor = 'crosshair';
  map.doubleClickZoom.disable();
}

function endeModus() {
  modus = null; punkte = [];
  document.body.classList.remove('imModus');
  if (skizze) { map.removeLayer(skizze); skizze = null; }
  document.querySelectorAll('button[data-mode]').forEach(b => b.classList.remove('active'));
  hilfe.textContent = HILFE_LEER.melden;
  coordsHilfe.textContent = HILFE_LEER.coords;
  aktionen.style.display = 'none';
  coordsBox.style.display = 'none';
  btnErstellen.disabled = true;
  map.getContainer().style.cursor = '';
  map.doubleClickZoom.enable();
}

map.on('click', e => {
  if (!modus) return;
  punkte.push(e.latlng);
  zeichneSkizze();
});

// Skizze: Linie/Fläche plus Eckpunkte (ziehen = verschieben, Klick = entfernen)
// und Zwischenpunkte auf jedem Segment (ziehen = neuen Eckpunkt einfügen).
const ICON_ECKE = L.divIcon({ className: 'vtx', iconSize: [14, 14] });
const ICON_MITTE = L.divIcon({ className: 'vtx mid', iconSize: [10, 10] });

function zeichneSkizze() {
  if (skizze) { map.removeLayer(skizze); skizze = null; }
  skizze = L.featureGroup().addTo(map);
  let form = null;
  if (modus === 'line' && punkte.length >= 2) form = L.polyline(punkte, { color: '#111', weight: 4, dashArray: '4 6', interactive: false });
  if (modus === 'polygon' && punkte.length >= 2) form = L.polygon(punkte, { color: '#111', weight: 3, dashArray: '4 6', fillOpacity: .15, interactive: false });
  if (form) skizze.addLayer(form);

  const mitten = []; // Zwischenpunkt-Marker, Index i = Segment punkte[i] -> punkte[i+1]
  const mitteVon = i => {
    const a = punkte[i], b = punkte[(i + 1) % punkte.length];
    return L.latLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);
  };

  punkte.forEach((ll, i) => {
    const m = L.marker(ll, { icon: ICON_ECKE, draggable: true, title: 'Ziehen: verschieben · Klick: entfernen' }).addTo(skizze);
    m.on('drag', () => {
      punkte[i] = m.getLatLng();
      if (form) form.setLatLngs(punkte);
      mitten.forEach((mm, j) => mm.setLatLng(mitteVon(j)));
    });
    m.on('dragend', zeichneSkizze);
    m.on('click', () => { punkte.splice(i, 1); zeichneSkizze(); });
  });

  if (modus === 'line' || modus === 'polygon') {
    const n = punkte.length;
    const segmente = modus === 'polygon' && n >= 3 ? n : n - 1;
    for (let i = 0; i < segmente; i++) {
      const m = L.marker(mitteVon(i), { icon: ICON_MITTE, draggable: true, title: 'Ziehen: Punkt einfügen' }).addTo(skizze);
      mitten.push(m);
      let idx = -1;
      m.on('dragstart', () => { idx = i + 1; punkte.splice(idx, 0, m.getLatLng()); });
      m.on('drag', () => { punkte[idx] = m.getLatLng(); if (form) form.setLatLngs(punkte); });
      m.on('dragend', zeichneSkizze);
    }
  }

  btnErstellen.disabled = !((modus === 'point' && punkte.length >= 1) || (modus === 'line' && punkte.length >= 2) || (modus === 'polygon' && punkte.length >= 3));
  document.querySelectorAll('.btnZurueck').forEach(b => b.disabled = !punkte.length);
  if (modus === 'coords') aktualisiereCoordsText();
}

document.querySelectorAll('.btnZurueck').forEach(b => b.onclick = () => { punkte.pop(); zeichneSkizze(); });

function aktualisiereCoordsText() {
  coordsText.value = punkte.length ? JSON.stringify(geometrieAus(modus, punkte)) : '';
}

$('btnKopieren').onclick = async () => {
  const text = coordsText.value;
  try { await navigator.clipboard.writeText(text); }
  catch (e) { coordsText.select(); document.execCommand('copy'); }
  const b = $('btnKopieren');
  b.textContent = 'Kopiert ✓'; setTimeout(() => b.textContent = 'Kopieren', 1500);
};

btnErstellen.onclick = async () => {
  btnErstellen.disabled = true; btnErstellen.textContent = 'Öffne GitHub …';
  const geo = geometrieAus(modus, punkte);
  const mitte = punkte.length === 1 ? punkte[0] : skizze.getBounds().getCenter();
  const url = neueMeldungUrl(await adresseFuer(mitte), geo);
  if (url.length > 8000) alert('Die Geometrie ist zu groß für die Vorausfüllung. Bitte weniger Punkte verwenden.');
  else window.open(url, '_blank');
  btnErstellen.textContent = 'Meldung auf GitHub erstellen';
  endeModus();
};

start(false);
