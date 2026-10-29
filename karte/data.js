// Laden und Auswerten der Issues. Kein DOM, kein Leaflet: lässt sich mit node direkt importieren und testen.
import { CONFIG, ARTEN } from './config.js';

// ---------- Laden ----------
// Erste Wahl: issues.json, das die Pages-Action neben die Seite legt (keine API-Anfragen, kein Limit).
// Fehlt die Datei (lokale Entwicklung), direkt von der GitHub-API.
// Ergebnis: { issues, stand, labelFarben, warnung }
export async function ladeIssues(force) {
  try {
    const r = await fetch('issues.json', { cache: force ? 'reload' : 'default' });
    if (r.ok) {
      const j = await r.json();
      return { issues: normalisiere(j.issues), stand: j.stand, labelFarben: j.labelFarben || {}, warnung: '' };
    }
  } catch (e) {}
  return ladeIssuesVonApi(force);
}

function normalisiere(issues) {
  issues.forEach(i => { i.kinder = i.kinder || []; i.eltern = i.eltern || null; });
  return issues;
}

// Seite 1 wird mit dem gespeicherten ETag angefragt: antwortet GitHub mit 304, hat sich nichts geändert,
// der Cache wird genutzt und die Anfrage zählt nicht gegen das API-Limit (60/Stunde ohne Anmeldung).
export async function ladeIssuesVonApi(force) {
  const key = `issues:v2:${CONFIG.owner}/${CONFIG.repo}`; // v2: mit kinder/eltern
  let cache = null;
  try { cache = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) {}
  const ausCache = () => ({ issues: normalisiere(cache.data), stand: null, labelFarben: cache.labelFarben || {}, warnung: '' });
  const url = page => `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/issues?state=all&per_page=100&page=${page}`;
  const headers = { Accept: 'application/vnd.github+json' };
  if (cache && cache.etag && !force) headers['If-None-Match'] = cache.etag;

  const r1 = await fetch(url(1), { headers });
  if (r1.status === 304 && cache) return ausCache();
  if (!r1.ok) {
    if (cache) return ausCache(); // z. B. Limit erreicht: lieber alte Daten als keine
    throw new Error(`GitHub-API: ${r1.status} ${r1.statusText}`);
  }
  const etag = r1.headers.get('ETag');
  const all = [];
  let batch = await r1.json();
  all.push(...batch);
  for (let page = 2; batch.length === 100 && page <= 20; page++) {
    const r = await fetch(url(page), { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) break;
    batch = await r.json();
    all.push(...batch);
  }
  const data = all.filter(i => !i.pull_request).map(i => ({
    number: i.number, title: i.title, state: i.state, url: i.html_url,
    labels: i.labels.map(l => l.name), body: i.body || '',
    updated: i.updated_at,
    kinder: [], eltern: null,
    _subTotal: (i.sub_issues_summary && i.sub_issues_summary.total) || 0,
  }));
  // Sub-Issues: je Eltern-Issue eine Anfrage (nur bei Issues mit Sub-Issues, meist wenige)
  const byNr = Object.fromEntries(data.map(i => [i.number, i]));
  let warnung = '';
  for (const p of data.filter(i => i._subTotal > 0)) {
    try {
      const r = await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/issues/${p.number}/sub_issues?per_page=100`, { headers: { Accept: 'application/vnd.github+json' } });
      if (!r.ok) { warnung = `Sub-Issues von #${p.number} nicht ladbar (${r.status}).`; continue; }
      for (const s of await r.json()) {
        if (byNr[s.number]) { p.kinder.push(s.number); byNr[s.number].eltern = p.number; }
      }
    } catch (e) { warnung = `Sub-Issues von #${p.number} nicht ladbar (${e.message}).`; }
  }
  data.forEach(i => delete i._subTotal);
  const labelFarben = {};
  all.forEach(i => i.labels.forEach(l => { labelFarben[l.name] = l.color; }));
  try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), etag, data, labelFarben })); } catch (e) {}
  return { issues: data, stand: null, labelFarben, warnung };
}

// ---------- Issue-Body auswerten ----------
// Issue-Formulare rendern jedes Feld als "### Label\n\nWert"
export function feld(body, label) {
  const sicher = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = body.match(new RegExp('### ' + sicher + '\\s*\\n+([\\s\\S]*?)(?=\\n### |$)'));
  return m ? m[1].trim() : '';
}

// Standort-Feld gab es nur in frühen Formular-Versionen ("Standort" bzw. "Ort (Adresse oder Beschreibung)");
// seitdem steht der Ort im Titel. Wird nur noch angezeigt, wenn vorhanden.
export function standortVon(issue) {
  return feld(issue.body, 'Standort') || feld(issue.body, 'Ort (Adresse oder Beschreibung)');
}

// GeoJSON-Block im Body; liefert immer ein Feature oder eine FeatureCollection, sonst null
export function geometrie(body) {
  const m = body.match(/```geojson\s*([\s\S]*?)```/i);
  if (!m) return null;
  try {
    const g = JSON.parse(m[1]);
    if (g.type === 'FeatureCollection' || g.type === 'Feature') return g;
    if (g.type === 'GeometryCollection' || (g.type && g.coordinates)) return { type: 'Feature', geometry: g, properties: {} };
  } catch (e) {}
  return null;
}

// Alle Arten eines Issues (mehrere "art:"-Labels sind erlaubt); ohne Label der Dropdown-Wert, sonst "sonstiges".
// Die erste Art bestimmt die Farbe auf der Karte.
export function artenVon(issue) {
  const aus = issue.labels.filter(n => n.startsWith('art:')).map(n => n.slice(4).trim()).filter(k => ARTEN[k]);
  if (aus.length) return aus;
  const f = feld(issue.body, 'Art des Mangels');
  const k = Object.keys(ARTEN).find(k => ARTEN[k].form === f);
  return [k || 'sonstiges'];
}

export function statusVon(issue) {
  const l = issue.labels.find(n => n.startsWith('status:'));
  return l ? l.slice(7).trim() : (issue.state === 'closed' ? 'geschlossen' : 'unbestätigt');
}

// ---------- Geometrie erzeugen ----------
// GitHub rendert im Issue zuverlässig nur FeatureCollections, darum wird immer eine erzeugt;
// mehrere Punkte als einzelne Point-Features statt MultiPoint. Punkte sind {lat, lng}.
const rund = ll => [+ll.lng.toFixed(6), +ll.lat.toFixed(6)];
const feature = geometry => ({ type: 'Feature', properties: {}, geometry });
const sammlung = features => ({ type: 'FeatureCollection', features });

export function geometrieAus(modus, punkte) {
  if (modus === 'line') return sammlung([feature({ type: 'LineString', coordinates: punkte.map(rund) })]);
  if (modus === 'polygon') { const ring = punkte.map(rund); ring.push(ring[0]); return sammlung([feature({ type: 'Polygon', coordinates: [ring] })]); }
  return sammlung(punkte.map(ll => feature({ type: 'Point', coordinates: rund(ll) })));
}

// ---------- Sonstiges ----------
export function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Straße (plus Hausnummer) per Nominatim, leer bei Fehler
export async function adresseFuer(latlng) {
  try {
    const u = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${latlng.lat}&lon=${latlng.lng}`;
    const r = await fetch(u, { headers: { 'Accept-Language': 'de' } });
    const j = await r.json();
    const a = j.address || {};
    const str = a.road || a.pedestrian || a.footway || a.cycleway || a.path || '';
    return str ? `${str}${a.house_number ? ' ' + a.house_number : ''}` : '';
  } catch (e) { return ''; }
}

// URL des GitHub-Formulars mit Titel und Geometrie vorbefüllt. Nur diese beiden: andere Formularfelder
// setzt GitHub bei jeder Neudarstellung aus der URL zurück, sie wären dann nicht mehr editierbar.
export function neueMeldungUrl(adresse, geo) {
  const p = new URLSearchParams({ template: CONFIG.template, title: `${adresse || '[Ort]'}: `, geometrie: JSON.stringify(geo) });
  return `https://github.com/${CONFIG.owner}/${CONFIG.repo}/issues/new?${p}`;
}

export function labelSucheUrl(name) {
  return `https://github.com/${CONFIG.owner}/${CONFIG.repo}/issues?q=${encodeURIComponent(`is:issue label:"${name}"`)}`;
}
