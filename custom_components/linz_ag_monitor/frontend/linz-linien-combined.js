/* ---------------------------------------------------------
   LinzAG Monitor – ULTIMATE COMBINED (Maxi, Midi, Mini, LED Wall)
   (Features: Dynamic Filters, Orange LED (#FF9900), Direction Filter, Skyfont, Zeitanzeige, Sensor-Filter)
   --------------------------------------------------------- */

const LINE_COLORS = { 
  "1": "#EE3A80", "2": "#C67DB5", "3": "#A4238F", "3a": "#A4238F", "4": "#C40653", 
  "11": "#E1771E", "12": "#159655", "17": "#E1771E", "18": "#008DD0", "19": "#E9639F", 
  "25": "#BD8B30", "26": "#008DD0", "27": "#819C4E", "33": "#AF7B86", "33a": "#AF7B86", 
  "38": "#E1771E", "41": "#D2232B", "43": "#33A0C4", "45": "#D2232B", "46": "#33A0C4", 
  "50": "#00CC00", "70": "#955336", "71": "#955336", "72": "#955336", "73": "#955336", 
  "77": "#955336", "101": "#DBAF3B", "102": "#48A643", "103": "#48A643", "104": "#DBAF3B", 
  "105": "#48A643", "106": "#48A643", "107": "#DBAF3B", "108": "#DBAF3B", "191": "#48A643", 
  "192": "#DBAF3B", "194": "#48A643", "150": "#DBAF3B", "N82": "#C67DB5", "N83": "#008DD0", "N84": "#C40653",
  "SE": "#FF9900"
};

const STANDARD_ROUTES = {
  '1': ['Auwiesen', 'Universität'], 
  '2': ['solarCity', 'Universität'],
  '3': ['Landgutstraße', 'Trauner Kreuzung P&R', 'Trauner Kreuzung'], 
  '4': ['Landgutstraße', 'Schloss Traun'],
  '50': ['Pöstlingberg', 'Hauptplatz'], 
  'N82': ['solarCity', 'Universität'],
  'N84': ['Hauptbahnhof', 'Schloss Traun'], 
  '11': ['Pichlinger See','Sporthalle Leonding'],
  '12': ['Karlhof', 'Hafenportal', 'Auwiesen'], 
  '13': ['Karlhof', 'Pichlinger See'], 
  '17': ['Hitzing', 'Fernheizkraftwerk'], 
  '19': ['Pichlinger See', 'Fernheizkraftwerk'], 
  '25': ['Oed', 'Karlhof'],
  '26': ['St. Margarethen', 'Stadion'], 
  '27': ['Fernheizkraftwerk', 'Chemiepark'],
  '33': ['Riesenhof', 'Pleschinger See'], 
  '33a': ['Rudolfstraße', 'Plesching'],
  '38': ['Rudolfstraße', 'Jäger im Tal'], 
  '41': ['Hessenplatz', 'Baintwiese'],
  '43': ['Hessenplatz', 'Stadtfriedhof', 'Stadtfriedhof Linz'], 
  '45': ['Froschberg', 'Stieglbauernstraße'],
  '46': ['Hafenportal', 'Froschberg'], 
  '70': ['Stadtfriedhof', 'Schiffswerft'],
  '71': ['Baintwiese', 'Industriezeile'], 
  '72': ['Schiffswerft', 'Stadtfriedhof'],
  '73': ['Fernheizkraftwerk', 'Baintwiese'], 
  '77': ['Universität', 'Hauptbahnhof', 'Universität Nord'],
  '108': ['Simonystraße', 'Lunzerstraße Ost']
};

/* --- EIGENE DATEIEN (Logo, Schrift) liegen neben dieser Datei --- */
const LINZ_ASSET_BASE = (() => {
  try { return new URL(".", document.currentScript.src).href; } catch (e) { return "/linz_ag_monitor/"; }
})();

// LED-Raster der Haltestellen-Säule: 24 Zeichen, Zeichenfeld 10 x 16 Punkte, Glyphe 8 x 14 Punkte
const STELE_COLS = 24;
const STELE_DOT = 2;                  // 1 Schrift-Punkt = 2 x 2 LED-Punkte ("doppelte Punkte")
const STELE_PIX_W = 12;               // ein Kästchen hat 12 x 20 Pixel (wie an der echten Anzeige)
const STELE_PIX_H = 20;
const STELE_CELL_GAP = 1;             // dunkle Fuge zwischen den Kästchen (in Pixeln)
const STELE_CELL_W = STELE_PIX_W + STELE_CELL_GAP;
const STELE_CELL_H = STELE_PIX_H + STELE_CELL_GAP;
const STELE_GLYPH_X = 1;              // Schrift (5x8 x 2 = 10 x 16 Pixel) im Kästchen: 1 Pixel Rand links
const STELE_GLYPH_Y = 2;              // 2 Pixel Rand oben
const STELE_MIN_W = 3;                // Abfahrtsminuten: Feld 22-24
const STELE_DOT_ASPECT = 1;           // 1 = quadratische LED-Punkte (größer = höhere, schlankere Zeichen)
// Aussehen der LED-Anzeige:
//   mode     "full" = jeder Schrift-Punkt als 2x2 feine Punkte, "thinH" = waagrechte Striche 1 Punkt,
//            "led" = ein großes LED pro Schrift-Punkt
//   fill     Größe der leuchtenden Punkte (0-1, kleiner = mehr Abstand)
//   grid     Helligkeit der unbeleuchteten Pixel im Hintergrund (0 = aus)
//   gridMode Raster im Hintergrund ("led" = ein großes Feld pro Schrift-Punkt, sonst wie mode)
//   gridFill Größe der Hintergrund-Pixel
//   glow     Stärke des Leuchtens um die Schrift
const STELE_LOOK = { mode: "full", fill: 0.76, grid: 0.11, gridMode: "full", gridFill: 0.60, glow: 1.2 };
// 5x8-LED-Schrift wie an der echten Anzeige (Zeile 0-6 Zeichen, Zeile 7 Unterlänge).
// Jede Zeile = 5 Bits (links = höchstes Bit). Jeder Schrift-Punkt wird als 2x2 feine LED-Punkte gezeichnet.
const STELE_FONT = {
  "0": [14,17,19,21,25,17,14,0],
  "1": [4,12,4,4,4,4,14,0],
  "2": [14,17,1,2,4,8,31,0],
  "3": [31,2,4,2,1,17,14,0],
  "4": [2,6,10,18,31,2,2,0],
  "5": [31,16,30,1,1,17,14,0],
  "6": [6,8,16,30,17,17,14,0],
  "7": [31,1,2,4,8,8,8,0],
  "8": [14,17,17,14,17,17,14,0],
  "9": [14,17,17,15,1,2,12,0],
  "A": [14,17,17,17,31,17,17,0],
  "B": [30,17,17,30,17,17,30,0],
  "C": [14,17,16,16,16,17,14,0],
  "D": [28,18,17,17,17,18,28,0],
  "E": [31,16,16,30,16,16,31,0],
  "F": [31,16,16,30,16,16,16,0],
  "G": [14,17,16,23,17,17,15,0],
  "H": [17,17,17,31,17,17,17,0],
  "I": [14,4,4,4,4,4,14,0],
  "J": [7,2,2,2,2,18,12,0],
  "K": [17,18,20,24,20,18,17,0],
  "L": [16,16,16,16,16,16,31,0],
  "M": [17,27,21,21,17,17,17,0],
  "N": [17,17,25,21,19,17,17,0],
  "O": [14,17,17,17,17,17,14,0],
  "P": [30,17,17,30,16,16,16,0],
  "Q": [14,17,17,17,21,18,13,0],
  "R": [30,17,17,30,20,18,17,0],
  "S": [15,16,16,14,1,1,30,0],
  "T": [31,4,4,4,4,4,4,0],
  "U": [17,17,17,17,17,17,14,0],
  "V": [17,17,17,17,17,10,4,0],
  "W": [17,17,17,21,21,21,10,0],
  "X": [17,17,10,4,10,17,17,0],
  "Y": [17,17,10,4,4,4,4,0],
  "Z": [31,1,2,4,8,16,31,0],
  "Ä": [10,0,14,17,31,17,17,0],
  "Ö": [10,0,14,17,17,17,14,0],
  "Ü": [10,0,17,17,17,17,14,0],
  "a": [0,0,14,1,15,17,15,0],
  "b": [16,16,22,25,17,17,30,0],
  "c": [0,0,14,16,16,17,14,0],
  "d": [1,1,13,19,17,17,15,0],
  "e": [0,0,14,17,31,16,14,0],
  "f": [6,9,8,28,8,8,8,0],
  "g": [0,0,15,17,17,15,1,14],
  "h": [16,16,22,25,17,17,17,0],
  "i": [4,0,12,4,4,4,14,0],
  "j": [2,0,6,2,2,2,18,12],
  "k": [16,16,18,20,24,20,18,0],
  "l": [12,4,4,4,4,4,14,0],
  "m": [0,0,26,21,21,21,21,0],
  "n": [0,0,22,25,17,17,17,0],
  "o": [0,0,14,17,17,17,14,0],
  "p": [0,0,30,17,17,30,16,16],
  "q": [0,0,15,17,17,15,1,1],
  "r": [0,0,22,25,16,16,16,0],
  "s": [0,0,15,16,14,1,30,0],
  "t": [8,8,28,8,8,9,6,0],
  "u": [0,0,17,17,17,19,13,0],
  "v": [0,0,17,17,17,10,4,0],
  "w": [0,0,17,17,21,21,10,0],
  "x": [0,0,17,10,4,10,17,0],
  "y": [0,0,17,17,17,15,1,14],
  "z": [0,0,31,2,4,8,31,0],
  "ä": [10,0,14,1,15,17,15,0],
  "ö": [10,0,14,17,17,17,14,0],
  "ü": [10,0,17,17,17,19,13,0],
  "ß": [12,18,18,20,18,17,22,0],
  ".": [0,0,0,0,0,12,12,0],
  ",": [0,0,0,0,0,12,4,8],
  "-": [0,0,0,31,0,0,0,0],
  "+": [0,4,4,31,4,4,0,0],
  "*": [0,4,21,14,21,4,0,0],
  "/": [1,2,2,4,8,8,16,0],
  ":": [0,12,12,0,12,12,0,0],
  "(": [2,4,8,8,8,4,2,0],
  ")": [8,4,2,2,2,4,8,0],
  "&": [12,18,20,8,21,18,13,0],
  "'": [4,4,8,0,0,0,0,0],
  "\"": [10,10,0,0,0,0,0,0],
  "!": [4,4,4,4,4,0,4,0],
  "?": [14,17,1,2,4,0,4,0],
  "|": [4,4,4,4,4,4,4,0],
  "<": [2,4,8,16,8,4,2,0],
  ">": [8,4,2,1,2,4,8,0],
  "=": [0,0,31,0,31,0,0,0],
  "%": [24,25,2,4,8,19,3,0],
};

// Kurznamen nur für die Haltestellen-Anzeige (DFI) – die anderen Designs schreiben aus
const STELE_DEST_SHORT = [
  [/^Fernheizkraftwerk$/i, "Fernheizwerk"],
  [/^Remise Kleinmünchen$/i, "Kleinmünchen"],
  [/^Trauner Kreuzung\s*P\s*(\+|&|und)\s*R$/i, "Trauner Kreuzung"],
  [/^Stieglbauernstraße$/i, "Stieglbauernstr."],
];
const steleShortDest = (t) => {
  const s = String(t || "").trim();
  for (const [re, short] of STELE_DEST_SHORT) if (re.test(s)) return short;
  return s;
};

/* --- FONT LOADER --- */
const loadGoogleFont = (fontName) => {
  if (!fontName || ['Skyfont', 'Arial','Verdana','Helvetica','sans-serif','serif','monospace'].includes(fontName)) return;
  const id = `font-comb-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id; link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;600;700;800&display=swap`;
  document.head.appendChild(link);
};

/* --- DYNAMISCHER EDITOR --- */
class LinzMonitorIrmscherEditorV11 extends HTMLElement {
  setConfig(config) { this._config = config; this.render(); }
  set hass(hass) { this._hass = hass; if (!this._initialized) { this.render(); this._initialized = true; } }

  render() {
    if (!this._hass || !this._config) return;
    
    // NUR SENSOREN MIT "nachste_abfahrt" ODER "hybrid" IM NAMEN ERLAUBEN (damit die neuen Sensoren auch gefunden werden)
    const entities = Object.keys(this._hass.states).filter(k => k.includes('nachste_abfahrt') || k.includes('hybrid')).sort();
    
    const mode = this._config.layout || "maxi"; 

    // Dynamische Filter Analyse
    let dynamicFilterHtml = "";
    if (this._config.entity && this._hass.states[this._config.entity]) {
       const state = this._hass.states[this._config.entity];
       const deps = state.attributes.departureList || [];
       
       const lines = [...new Set(deps.filter(d => d.line).map(d => String(d.line).replace('*','')))].sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
       const dirs = [...new Set(deps.map(d => d.direction))].sort();

       const activeLines = (this._config.filter || "").split(',').map(s=>s.trim()).filter(Boolean);
       const activeDirs = (this._config.filter_direction || "").split(',').map(s=>s.trim()).filter(Boolean);

       dynamicFilterHtml = `
         <div class="filter-box">
           <h4>🚦 Intelligente Filter (Autom. erkannt)</h4>
           
           <div class="mb-15">
             <strong class="filter-title">Linienauswahl (Klicken zum Filtern):</strong>
             <div class="chip-container">
               ${lines.length > 0 ? lines.map(l => `
                 <label class="chip ${activeLines.includes(l) ? 'active-line' : ''}">
                   <input type="checkbox" class="dyn-filter-line" value="${l}" ${activeLines.includes(l) ? 'checked' : ''} style="display:none;">
                   Linie ${l}
                 </label>
               `).join('') : '<span class="empty-hint">Keine Linien in Echtzeit gefunden.</span>'}
             </div>
           </div>

           <div>
             <strong class="filter-title">Richtungsauswahl (Klicken zum Filtern):</strong>
             <div class="chip-container">
               ${dirs.length > 0 ? dirs.map(d => `
                 <label class="chip ${activeDirs.includes(d) ? 'active-dir' : ''}">
                   <input type="checkbox" class="dyn-filter-dir" value="${d}" ${activeDirs.includes(d) ? 'checked' : ''} style="display:none;">
                   ${d}
                 </label>
               `).join('') : '<span class="empty-hint">Keine Richtungen in Echtzeit gefunden.</span>'}
             </div>
             <div class="hint-text">*Wenn nichts markiert ist, werden alle angezeigt.</div>
           </div>
         </div>
       `;
    }

    let specificHtml = "";
    if (mode === "maxi") {
      specificHtml = `
        <div class="grid-2">
          <label class="toggle-box"><input id="show_info" class="std-input" type="checkbox" ${this._config.show_info !== false ? 'checked' : ''}><span>Info-Zeile anzeigen</span></label>
          <label class="toggle-box"><input id="badge_round" class="std-input" type="checkbox" ${this._config.badge_round !== false ? 'checked' : ''}><span>Badges rund</span></label>
        </div>
        <div class="form-row"><label>Schriftart (Tippe 'Skyfont' für deine Eigene)</label><input id="font_family" class="std-input" type="text" value="${this._config.font_family || ''}" placeholder="Standard: Exo 2"></div>
      `;
    } else if (mode === "midi") {
       specificHtml = `
        <div class="grid-2">
          <div><label>Zeilenhöhe</label><input id="row_height" class="std-input" type="number" value="${this._config.row_height || 38}"></div>
          <div><label>Schrift Zeit</label><input id="font_size" class="std-input" type="number" value="${this._config.font_size || 20}"></div>
        </div>
        <div class="form-row"><label>Schrift Ziel</label><input id="dest_size" class="std-input" type="number" value="${this._config.dest_size || 20}"></div>
        <div class="form-row"><label>Schriftart (Tippe 'Skyfont' für deine Eigene)</label><input id="font_family" class="std-input" type="text" value="${this._config.font_family || ''}" placeholder="Standard: Exo 2"></div>
       `;
    } else if (mode === "mini") {
       specificHtml = `
        <div class="grid-2 toggle-box-dark">
           <div><label>Badge Größe (px)</label><input id="badge_size" class="std-input" type="number" value="${this._config.badge_size || 24}"></div>
           <div style="display:flex; align-items:flex-end;"><label class="toggle-box" style="border:none; padding:0; background:transparent;"><input id="badge_round" class="std-input" type="checkbox" ${this._config.badge_round !== false ? 'checked' : ''}><span>Kreis / Rund</span></label></div>
        </div>
        <div class="grid-2">
          <div><label>Zeilenhöhe</label><input id="row_height" class="std-input" type="number" value="${this._config.row_height || 32}"></div>
          <div><label>Schrift Zeit</label><input id="font_size" class="std-input" type="number" value="${this._config.font_size || 14}"></div>
        </div>
        <div class="form-row"><label>Schrift Ziel</label><input id="dest_size" class="std-input" type="number" value="${this._config.dest_size || 14}"></div>
        <div class="form-row"><label>Schriftart</label><input id="font_family" class="std-input" type="text" value="${this._config.font_family || ''}" placeholder="Standard: Exo 2"></div>
       `;
    } else if (mode === "led") {
       specificHtml = `
        <div class="form-row">
           <label>💡 LED Farbe (Hexadezimal)</label>
           <input id="led_color" class="std-input" type="text" value="${this._config.led_color || '#FF9900'}" placeholder="Standard: #FF9900 (Orange)">
        </div>
       `;
    } else if (mode === "stele") {
       specificHtml = `
        <div class="grid-2">
          <div>
            <label>💡 LED Farbe</label>
            <input id="stele_led_color" class="std-input" type="text" value="${this._config.stele_led_color || '#4dff5e'}" placeholder="Standard: #4dff5e (Grün)">
          </div>
          <label class="toggle-box"><input id="stele_clock" class="std-input" type="checkbox" ${this._config.stele_clock !== false ? 'checked' : ''}><span>Uhrzeit unten anzeigen</span></label>
        </div>
        <div class="grid-2">
          <label class="toggle-box"><input id="stele_compact" class="std-input" type="checkbox" ${this._config.stele_compact === true ? 'checked' : ''}><span>Kompakt (Badge): nur LED-Zeilen</span></label>
          <label class="toggle-box"><input id="stele_labels" class="std-input" type="checkbox" ${this._config.stele_labels !== false ? 'checked' : ''}><span>Spaltenköpfe (Linie / Ziel / Abfahrt)</span></label>
        </div>
        <div class="form-row">
          <label>🔤 Linien-Zeile (leer = automatisch aus den Abfahrten)</label>
          <input id="stele_lines" class="std-input" type="text" value="${this._config.stele_lines || ''}" placeholder="z.B. 27,41,43">
        </div>
        <div class="form-row">
          <label>🖼️ Bild unten rechts (URL, leer = Linz AG Linien Logo)</label>
          <input id="stele_footer_image" class="std-input" type="text" value="${this._config.stele_footer_image || ''}" placeholder="https://… oder /local/…">
        </div>
        <div class="hint-text">Tipp: „Anzahl der Zeilen“ auf 3 oder 4 stellen – wie an der echten Haltestelle. Jede Zeile hat 24 Felder: Linie (1-3), Zusatz (4), Ziel/Info (6-21), Minuten (22-24, max. 99).</div>
       `;
    }

    this.innerHTML = `
      <style>
        .irmscher-editor { padding: 15px; background: #1e1e1e; color: #e1e1e1; border-radius: 8px; font-family: sans-serif; border: 1px solid #333; box-sizing: border-box; width: 100%; color-scheme: dark; }
        .irmscher-editor * { box-sizing: border-box; }
        .irmscher-editor h3 { margin: 0 0 15px 0; color: #fff; border-bottom: 1px solid #444; padding-bottom: 8px; }
        .irmscher-editor h4 { margin: 20px 0 10px 0; color: #aaa; border-bottom: 1px solid #333; padding-bottom: 4px; }
        .form-row { margin-bottom: 15px; width: 100%; }
        .form-row label { display: block; font-weight: bold; margin-bottom: 2px; }
        /* FIX FÜR WEISSE DROPDOWNS & LAYOUT */
        .std-input { width: 100%; padding: 8px; background-color: #333 !important; color: #fff !important; border: 1px solid #555; border-radius: 4px; outline: none; transition: border-color 0.3s; appearance: auto; box-sizing: border-box; margin-top: 4px; }
        .std-input option { background-color: #222 !important; color: #fff !important; }
        .std-input:focus { border-color: #FF9900; }
        .grid-2 { display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 15px; }
        @media (min-width: 400px) { .grid-2 { grid-template-columns: 1fr 1fr; } }
        
        .filter-box { margin-top: 15px; background: #222; padding: 15px; border-radius: 6px; border: 1px solid #444; }
        .filter-box h4 { margin: 0 0 10px 0; color: #FF9900; border: none; padding: 0; }
        .filter-title { display: block; margin-bottom: 5px; color: #bbb; }
        .chip-container { display: flex; flex-wrap: wrap; gap: 8px; }
        .chip { background: #444; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; transition: 0.2s; user-select: none; }
        .chip:hover { background: #555; }
        .active-line { background: #4caf50 !important; }
        .active-dir { background: #2196f3 !important; }
        .empty-hint { color: #777; font-style: italic; }
        .hint-text { width: 100%; font-size: 12px; color: #aaa; margin-top: 8px; }
        
        .toggle-box { display: flex; align-items: center; gap: 8px; background: #333; border: 1px solid #555; padding: 10px; border-radius: 6px; cursor: pointer; }
        .toggle-box input { transform: scale(1.2); margin: 0; }
        .toggle-box span { font-weight: 700; }
        .toggle-box-dark { background: #333; padding: 8px; border-radius: 4px; }
        .mb-15 { margin-bottom: 15px; }
      </style>

      <div class="irmscher-editor">
         <h3>⚙️ LinzAG Monitor (Irmscher)</h3>
         
         <div class="form-row">
           <label>📌 Haltestelle (Sensor auswählen)</label>
           <select id="entity" class="std-input">
             <option value="">Wählen...</option>
             ${entities.map(e => `<option value="${e}" ${this._config.entity === e ? 'selected' : ''}>${e}</option>`).join('')}
           </select>
         </div>

         <div class="grid-2">
           <div>
              <label>🎨 Layout</label>
              <select id="layout" class="std-input">
                <option value="maxi" ${mode === 'maxi' ? 'selected' : ''}>Maxi (Classic)</option>
                <option value="midi" ${mode === 'midi' ? 'selected' : ''}>Midi (Compact)</option>
                <option value="mini" ${mode === 'mini' ? 'selected' : ''}>Mini (Minimal)</option>
                <option value="led" ${mode === 'led' ? 'selected' : ''}>LED Wall (Matrix)</option>
                <option value="stele" ${mode === 'stele' ? 'selected' : ''}>Haltestellen-Säule</option>
              </select>
           </div>
           <div>
              <label>🏷️ Eigener Name (Titel)</label>
              <input id="stop_name_override" class="std-input" type="text" value="${this._config.stop_name_override || ''}" placeholder="Wird statt Originalname angezeigt">
           </div>
         </div>

         ${dynamicFilterHtml}

         <input type="hidden" id="filter" class="std-input" value="${this._config.filter || ''}">
         <input type="hidden" id="filter_direction" class="std-input" value="${this._config.filter_direction || ''}">

         <div class="grid-2" style="margin-top: 20px;">
           <div>
             <label>Anzahl der Zeilen</label>
             <input id="anzahl" class="std-input" type="number" value="${this._config.anzahl || (mode === "stele" ? 4 : 7)}">
           </div>
           <div>
             <label>Sortierung</label>
             <select id="sortierung" class="std-input">
               <option value="echtzeit" ${this._config.sortierung === "echtzeit" ? 'selected' : ''}>Nach Echtzeit (inkl. Verspätung)</option>
               <option value="plan" ${this._config.sortierung === "plan" ? 'selected' : ''}>Nach Fahrplan</option>
             </select>
           </div>
         </div>

         <div class="grid-2" style="margin-top: 15px;">
           <div>
             <label>⏱️ Zeitanzeige</label>
             <select id="time_format" class="std-input">
               <option value="countdown" ${this._config.time_format !== "absolute" ? 'selected' : ''}>In Minuten (Standard)</option>
               <option value="absolute" ${this._config.time_format === "absolute" ? 'selected' : ''}>Uhrzeit (z.B. 14:30)</option>
             </select>
           </div>
         </div>

         <h4>🛠️ Design Einstellungen (${mode.toUpperCase()})</h4>
         ${specificHtml}
      </div>
    `;

    // Event Listener für Standard-Inputs
    this.querySelectorAll(".std-input").forEach(el => el.addEventListener("change", (ev) => this._update(ev)));
    
    // Event Listener für Dynamische Filter (Linien)
    this.querySelectorAll('.dyn-filter-line').forEach(cb => {
      cb.addEventListener('change', () => {
        const checked = Array.from(this.querySelectorAll('.dyn-filter-line:checked')).map(el => el.value);
        this._updateDirect('filter', checked.join(', '));
      });
    });

    // Event Listener für Dynamische Filter (Richtungen)
    this.querySelectorAll('.dyn-filter-dir').forEach(cb => {
      cb.addEventListener('change', () => {
        const checked = Array.from(this.querySelectorAll('.dyn-filter-dir:checked')).map(el => el.value);
        this._updateDirect('filter_direction', checked.join(', '));
      });
    });
  }

  _update(ev) {
    const t = ev.target;
    let value = (t.type === "checkbox") ? t.checked : (t.type === "number" ? Number(t.value) : t.value);
    const config = { ...this._config, [t.id]: value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  _updateDirect(key, value) {
    const config = { ...this._config, [key]: value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }
}

// Registry für den Editor
if (!customElements.get("linz-monitor-combined-editor-v11")) {
  customElements.define("linz-monitor-combined-editor-v11", LinzMonitorIrmscherEditorV11);
}


/* --- MAIN CARD --- */
class LinzMonitorCombined extends HTMLElement {
  static getConfigElement() { return document.createElement("linz-monitor-combined-editor-v11"); }
  static getStubConfig() { return { entity: "", layout: "led", anzahl: 7 }; }

  constructor() { 
    super(); 
    this._gone_mem = new Map(); 
    this._clockTimer = null; 
    this._animTimers = new Map(); 
  }

  connectedCallback() {
    this._clockTimer = setInterval(() => this._updateClockDisplay(), 1000);
  }
  
  disconnectedCallback() {
    if (this._clockTimer) clearInterval(this._clockTimer);
    if (this._steleRO) { this._steleRO.disconnect(); this._steleRO = null; }
    if (this._steleTimer) { clearInterval(this._steleTimer); this._steleTimer = null; }
    this._animTimers.forEach(t => clearTimeout(t));
    this._animTimers.clear();
  }

  setConfig(config) {
    this._config = { 
      layout: "maxi",
      anzahl: config.layout === "stele" ? 4 : 7, 
      sortierung: "echtzeit", 
      time_format: "countdown",
      filter: "", 
      filter_direction: "",
      stop_name_override: "",
      font_family: "",
      led_color: "#FF9900", // Standard jetzt ORANGE (#FF9900)
      show_info: true, 
      badge_round: true,
      row_height: config.layout === "mini" ? 32 : 38,
      font_size: config.layout === "mini" ? 14 : 20,
      dest_size: config.layout === "mini" ? 14 : 20,
      badge_size: 24,
      ...config 
    };
    // Layout bei jeder Konfig-Änderung neu aufbauen, sonst bleiben CSS-Werte
    // (Zeilenhöhe, Schriftgröße, LED-Farbe, Schriftart) bis zum Neuladen alt.
    this._currentLayout = null;
    
    // FONT FIX: Lädt Exo 2 als Standard, wenn das Feld leer gelassen wurde!
    if (this._config.layout === 'led') {
       loadGoogleFont("DotGothic16");
    } else if (this._config.layout === 'stele') {
       // LED-Zeilen werden selbst gezeichnet – keine zusätzliche Schrift nötig
    } else {
       loadGoogleFont(this._config.font_family || "Exo 2");
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config.entity || !hass.states[this._config.entity]) {
      if (!this.querySelector("ha-card")) {
        this.innerHTML = `<ha-card style="padding:20px;color:white;background:var(--ha-card-background,var(--card-background-color,#1c1c1c));">Bitte Haltestelle auswählen.</ha-card>`;
      }
      return;
    }

    const state = hass.states[this._config.entity];
    const nowTs = Date.now();
    let departures = [...(state.attributes.departureList || [])];

    // 1. FILTER
    const matchesLine = (line) => {
      if (!this._config.filter) return true;
      const filters = this._config.filter.split(',').map(f => f.trim().toLowerCase()).filter(Boolean);
      if (filters.length === 0) return true;
      const l = (line || "").toLowerCase();
      return filters.includes(l) || filters.includes(l.replace('*', ''));
    };

    const matchesDirection = (dir) => {
      if (!this._config.filter_direction) return true;
      const filters = this._config.filter_direction.split(',').map(f => f.trim().toLowerCase()).filter(Boolean);
      if (filters.length === 0) return true;
      const d = (dir || "").toLowerCase();
      return filters.some(f => d.includes(f));
    };

    departures = departures.filter(d => d && d.line && d.scheduled).filter(d => matchesLine(d.line) && matchesDirection(d.direction));

    // 2. MEMORY
    const currentKeys = new Set(departures.map(d => `${d.line}-${d.scheduled}-${d.direction}`));
    if (this._lastRaw) {
      this._lastRaw.forEach(old => {
        const key = `${old.line}-${old.scheduled}-${old.direction}`;
        if (matchesLine(old.line) && matchesDirection(old.direction) && !currentKeys.has(key) && old.countdown <= 1 && old.countdown >= 0 && !this._gone_mem.has(key)) {
          this._gone_mem.set(key, { ...old, goneAt: nowTs });
        }
      });
    }
    this._lastRaw = departures;
    for (const [key, val] of this._gone_mem) { if (nowTs - val.goneAt > 10000) this._gone_mem.delete(key); }
    const combined = [...departures];
    this._gone_mem.forEach(val => combined.push({ ...val, isGone: true }));

    // 3. SORTIERUNG
    const getSortTime = (d) => {
      const [h, m] = d.scheduled.split(':').map(Number);
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      let schedMins = h * 60 + m;
      if (schedMins < (nowMins - 180)) schedMins += 1440;
      if (this._config.sortierung !== "plan" && typeof d.countdown === 'number') {
         return nowMins + d.countdown;
      }
      return schedMins;
    };
    combined.sort((a, b) => getSortTime(a) - getSortTime(b));

    // ROUTING
    const layout = this._config.layout || "maxi";
    if (layout === "mini") {
        this._renderMini(state, combined);
    } else if (layout === "midi") {
        this._renderMidi(state, combined);
    } else if (layout === "led") {
        this._renderLed(state, combined);
    } else if (layout === "stele") {
        this._renderStele(state, combined);
    } else {
        this._renderMaxi(state, combined);
    }
  }

  _updateClockDisplay() {
    const clock = this.querySelector("#clock");
    if (!clock) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'});
    if(clock.innerText !== timeStr) clock.innerText = timeStr;
  }

  _startAnimationLoop(row, infoTextWidth) {
    const rowId = row.dataset.rowId;
    if (this._animTimers.has(rowId)) return; 

    const run = () => {
       const containerWidth = row.querySelector(".col-dest").offsetWidth || 300;
       const distance = containerWidth + infoTextWidth;
       const speed = 50; 
       const durationSec = distance / speed;
       
       row.classList.add("mode-ticker");
       const ticker = row.querySelector(".info-ticker");
       ticker.style.transition = 'none'; 
       ticker.style.transform = `translateX(${containerWidth}px)`; 
       
       void ticker.offsetWidth; 

       ticker.style.transition = `transform ${durationSec}s linear`;
       ticker.style.transform = `translateX(-${infoTextWidth}px)`;

       const t1 = setTimeout(() => {
          row.classList.remove("mode-ticker");
          const t2 = setTimeout(() => {
              this._animTimers.delete(rowId);
              run(); 
          }, 10000); 
          
          this._animTimers.set(rowId, t2);
       }, durationSec * 1000);
       
       this._animTimers.set(rowId, t1);
    };
    run();
  }

  // --- DIE KORRIGIERTE _getRouteName FUNKTION ---
  _getRouteName(d) {
      const cleanL = String(d.line || "").replace("*", "");
      // Bereinigt unsichtbare Leerzeichen und gleicht alles in Kleinbuchstaben ab
      const dest = (d.direction || "").trim().toLowerCase();
      
      const isStandard = (STANDARD_ROUTES[cleanL] || []).some(s => s.trim().toLowerCase() === dest);
      
      if (!isStandard && STANDARD_ROUTES[cleanL]) {
        if (cleanL === "3" && (dest.includes("neue welt") || dest.includes("ferihumerstraße") || dest.includes("remise kleinmünchen"))) {
          return cleanL + "a";
        } else if (cleanL === "33" && dest.includes("rudolfstraße")) {
          return "33a"; 
        } else if (cleanL === "11" && dest.includes("stadtfriedhof")) {
          return "11s";
        } else {
          return cleanL + "*";
        }
      }
      return d.line;
  }

  /* ==================================================================================
     RENDER: LED WALL
     ================================================================================== */
  _renderLed(state, departures) {
    const LED_C = this._config.led_color || "#FF9900";
    const LED_DIM = LED_C + "44"; 

    if (!this.querySelector("ha-card") || this._currentLayout !== 'led') {
      this._currentLayout = 'led';
      this.innerHTML = `
        <style>
          @font-face { font-family: 'Skyfont'; src: url('/local/Skyfont-NonCommercial.otf') format('opentype'); }
          ha-card {
            background: #000000;
            border: 6px solid #222;
            border-radius: 4px !important;
            padding: 10px !important;
            color: ${LED_C} !important;
            font-family: 'DotGothic16', sans-serif !important;
            box-shadow: 0 0 15px rgba(0,0,0,1);
            display: flex; flex-direction: column;
            overflow: hidden !important;
            letter-spacing: 0px; 
            text-shadow: 0 0 5px ${LED_C}66;
            height: 100%; width: 100%; box-sizing: border-box;
          }
          .header-row {
            display: flex; justify-content: space-between; align-items: center;
            border-bottom: 2px solid ${LED_DIM};
            padding-bottom: 6px; margin-bottom: 6px;
            height: 40px; flex-shrink: 0;
          }
          .h-symbol {
            height: 34px; width: 34px;
            background: #afca0b; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-family: sans-serif; font-weight: 900;
            color: #005a31; font-size: 22px;
            border: 2px solid #005a31; flex-shrink: 0;
            box-shadow: 0 0 5px rgba(255,255,255,0.2);
          }
          .h-symbol::after { content: "H"; }
          .stop-name { flex: 1; text-align: left; margin-left: 15px; font-size: 24px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${LED_C}; }
          .clock { font-size: 24px; font-weight: bold; letter-spacing: 1px; display: flex; align-items: center; }

          .matrix-table { width: 100%; display: flex; flex-direction: column; gap: 4px; flex: 1; min-height: 0; }
          .matrix-row {
            display: grid; 
            grid-template-columns: 50px 1fr 85px; 
            align-items: center;
            font-size: 28px; 
            line-height: 1.1;
            border-bottom: 1px solid #111; 
            padding: 2px 0; height: 38px;
          }
          .col-line { text-align: left; font-weight: bold; padding-left: 2px; }
          
          .col-dest { 
            display: grid; grid-template-columns: 1fr; grid-template-rows: 1fr;
            overflow: hidden; padding-right: 5px; height: 100%; align-items: center; position: relative;
          }
          .dest-static, .info-ticker { grid-column: 1; grid-row: 1; white-space: nowrap; }
          .dest-static { color: #ffffff; text-shadow: 0 0 3px rgba(255,255,255,0.4); opacity: 1; visibility: visible; width: 100%; overflow: hidden; transition: opacity 0.2s, visibility 0.2s; }
          .dest-inner { display: inline-block; transition: transform 0.1s; }
          .ping-pong-scroll { animation: scroll-pingpong 6s linear infinite alternate; --scroll-dist: -50px; }
          .info-ticker { color: ${LED_C}; opacity: 0; visibility: hidden; position: absolute; left: 0; transition: opacity 0.2s, visibility 0.2s; }

          .matrix-row.mode-ticker .dest-static { opacity: 0 !important; visibility: hidden !important; }
          .matrix-row.mode-ticker .info-ticker { opacity: 1 !important; visibility: visible !important; }

          .matrix-row.is-cancelled { color: #ff4444 !important; }
          .matrix-row.is-cancelled .dest-static { color: #ff4444 !important; }
          .matrix-row.is-cancelled .col-line { color: #ff4444 !important; }

          @keyframes scroll-pingpong { 0%, 20% { transform: translateX(0); } 80%, 100% { transform: translateX(var(--scroll-dist)); } }

          .col-min { text-align: right; font-weight: bold; white-space: nowrap; display: flex; justify-content: flex-end; align-items: baseline;}
          .min-small { font-size: 22px; margin-left: 2px; vertical-align: top; }
          .delay-info { font-size: 18px; margin-right: 6px; font-weight: normal; color: ${LED_C}; opacity: 0.8; }
          .is-gone { opacity: 0.5; }
          .is-gone .col-min { text-decoration: line-through; }
          .blink { animation: blinker 1s steps(1) infinite; }
          @keyframes blinker { 50% { opacity: 0; } }
          
          @media (max-width: 450px) {
            .matrix-row { font-size: 22px; grid-template-columns: 40px 1fr 65px; }
            .stop-name { font-size: 18px; }
            .clock { font-size: 18px; }
            .h-symbol { height: 28px; width: 28px; font-size: 18px; }
          }
        </style>
        <ha-card>
          <div class="header-row">
             <div class="h-symbol"></div>
             <div class="stop-name" id="led-title"></div>
             <div class="clock" id="clock">00:00</div>
          </div>
          <div class="matrix-table" id="board"></div>
        </ha-card>
      `;
    }

    const board = this.querySelector("#board");
    this._updateClockDisplay();

    // *** BUGFIX FÜR DEN DATEI-EDITOR IN HOME ASSISTANT ***
    const filterRegex = /^(Linz\/Donau|Leonding|Linz)[,\s]+/i;
    const defaultName = (state.attributes.stop_name || "").replace(filterRegex, "").trim();
    const finalName = this._config.stop_name_override || defaultName;
    if(this.querySelector("#led-title").innerText !== finalName) this.querySelector("#led-title").innerText = finalName;

    const visibleRows = departures.slice(0, this._config.anzahl);
    let existingRows = Array.from(board.children);

    const warningSvg = `<svg style="width:18px;height:18px;margin-bottom:-2px;margin-right:4px;" viewBox="0 0 24 24"><path fill="currentColor" d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z" /></svg>`;

    visibleRows.forEach((d, i) => {
      const infoLow = (d.infos || "").toLowerCase();
      const isCancelled = d.canceled || d.cancelled || infoLow.includes("fällt aus") || infoLow.includes("entfällt");
      const isNow = d.countdown === 0 && !d.isGone && !isCancelled;
      
      let lineT = this._getRouteName(d); 

      let infoText = "";
      if (isCancelled) infoText = "FAHRT FÄLLT AUS";
      else if (d.infos && d.infos.length > 3) {
          let cleanInfo = d.infos.replace("Niederflurfahrzeug", "").replace(/\n/g, " ").trim();
          if (cleanInfo.length > 2) infoText = cleanInfo;
      }

      let timeHtml = "";
      let delayHtml = "";
      if (!isCancelled && !d.isGone && d.delay > 0 && !isNow) delayHtml = `<span class="delay-info">+${d.delay}</span>`;
      
      // STRIKETHROUGH FÜR ZEIT
      if (isCancelled) timeHtml = `<span style="text-decoration: line-through;">${d.scheduled}</span>`; 
      else if (isNow) timeHtml = `0<span class='min-small'>'</span>`; 
      else if (d.isGone) timeHtml = `${d.scheduled}`;
      else if (this._config.time_format === "absolute" || d.countdown >= 45) timeHtml = d.scheduled;
      else timeHtml = `${d.countdown}<span class='min-small'>'</span>`;
      
      const finalTimeContent = delayHtml + timeHtml;

      let row = existingRows[i];
      if (!row) {
        row = document.createElement("div");
        row.className = "matrix-row";
        row.dataset.rowId = "row_" + i;
        row.innerHTML = `
          <div class="col-line"></div>
          <div class="col-dest">
             <div class="dest-static"><span class="dest-inner"></span></div>
             <div class="info-ticker"><span class="ticker-inner"></span></div>
          </div>
          <div class="col-min"></div>
        `;
        board.appendChild(row);
      }

      const hasInfo = infoText !== "" && !isNow && !d.isGone;
      
      if(!hasInfo && this._animTimers.has(row.dataset.rowId)) {
          clearTimeout(this._animTimers.get(row.dataset.rowId));
          this._animTimers.delete(row.dataset.rowId);
          row.classList.remove("mode-ticker");
      }

      const elLine = row.querySelector(".col-line");
      const elDestInner = row.querySelector(".dest-inner");

      if (isCancelled) {
          row.classList.add("is-cancelled");
          elDestInner.style.textDecoration = "line-through";
      } else {
          row.classList.remove("is-cancelled");
          elDestInner.style.textDecoration = "none";
      }
      
      row.classList.toggle("is-gone", !!d.isGone);
      
      if(elLine.innerText !== lineT) elLine.innerText = lineT;

      if(elDestInner.innerText !== d.direction) {
          elDestInner.innerText = d.direction;
          elDestInner.classList.remove("ping-pong-scroll");
          elDestInner.style.transform = "translateX(0)";
          setTimeout(() => {
             const parent = row.querySelector(".col-dest");
             // 2 PIXEL TOLERANZ HINZUGEFÜGT
             if (elDestInner.scrollWidth > parent.offsetWidth - 2) {
                const diff = parent.offsetWidth - elDestInner.scrollWidth;
                elDestInner.style.setProperty('--scroll-dist', `${diff - 10}px`);
                elDestInner.classList.add("ping-pong-scroll");
             }
          }, 50);
      }

      const elInfoInner = row.querySelector(".ticker-inner");
      const fullInfoHtml = warningSvg + infoText;
      if(hasInfo) {
          if(elInfoInner.innerHTML !== fullInfoHtml) elInfoInner.innerHTML = fullInfoHtml;
          requestAnimationFrame(() => {
              const width = elInfoInner.offsetWidth + 20; 
              this._startAnimationLoop(row, width);
          });
      }

      const elMin = row.querySelector(".col-min");
      if(elMin.innerHTML !== finalTimeContent) elMin.innerHTML = finalTimeContent;
      
      if (isNow) {
          if(!elMin.classList.contains("blink")) elMin.classList.add("blink");
      } else {
          elMin.classList.remove("blink");
      }
    });

    while (board.children.length > visibleRows.length) {
      const r = board.lastChild;
      if(r.dataset.rowId && this._animTimers.has(r.dataset.rowId)) {
          clearTimeout(this._animTimers.get(r.dataset.rowId));
          this._animTimers.delete(r.dataset.rowId);
      }
      board.removeChild(r);
    }
  }

  /* ==================================================================================
     RENDER: MAXI (Classic)
     ================================================================================== */
  _renderMaxi(state, departures) {
    const FONT = this._config.font_family ? `'${this._config.font_family}', sans-serif` : "'Exo 2', sans-serif";
    const badgeRadius = (this._config.badge_round === false) ? 6 : 16;
    const showInfo = this._config.show_info !== false;

    if (!this.querySelector("ha-card") || this._currentLayout !== 'maxi') {
      this._currentLayout = 'maxi';
      this.innerHTML = `
        <style>
          @font-face { font-family: 'Skyfont'; src: url('/local/Skyfont-NonCommercial.otf') format('opentype'); }
          ha-card { background: var(--ha-card-background, var(--card-background-color, #1c1c1c)); border-radius: 16px !important; padding: 12px !important; color: white !important; font-family: ${FONT} !important; overflow: hidden !important; height: 100%; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; min-height: 0; }
          .header-box { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 8px; padding-bottom: 8px; flex-shrink: 0; }
          .stop-logo { height: 28px; width: 28px; object-fit: contain; }
          .stop-title { font-size: 22px; font-weight: 800; }
          .rows-container { display: flex; flex-direction: column; gap: 6px; flex: 1; overflow-y: auto; min-height: 0; }
          .row { display: flex; align-items: center; background: rgba(255,255,255,0.05); border-radius: 10px; padding: 5px 10px; position: relative; min-height: 48px; border-left: 4px solid transparent; }
          .line-badge { min-width: 40px; height: 32px; border-radius: ${badgeRadius}px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; color: white; margin-right: 10px; }
          .main-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; justify-content: center; }
          .dest-wrap { overflow: hidden; white-space: nowrap; }
          .dest { font-size: 22px; font-weight: 700; color: #fff; white-space: nowrap; display: inline-block; }
          .ping-pong-scroll { animation: scroll-pingpong 8s linear infinite alternate; --scroll-dist: -50px; }
          @keyframes scroll-pingpong { 0%, 15% { transform: translateX(0); } 85%, 100% { transform: translateX(var(--scroll-dist)); } }
          .count-box-wrapper { display: flex; flex-direction: column; align-items: flex-end; min-width: 80px; }
          .count-box { font-size: 25px; font-weight: 800; line-height: 1; display: flex; align-items: baseline; justify-content: flex-end; white-space: nowrap; }
          .time-small { font-size: 12px; color: #bbb; margin-top: 2px; }
          .delay-red { color: #ff5252; font-weight: 600; }
          .min-u { font-size: 13px; color: #777; margin-left: 3px; font-weight: 600; }
          .gone-txt { text-decoration: line-through; color: #777; }
          .is-cancelled { opacity: 0.6; }
          .is-cancelled .dest { text-decoration: line-through; color: #ff5252; }
          @keyframes bB { 0%, 100% { border-left-color: #4caf50; } 50% { border-left-color: transparent; } }
          .dots { display: flex; justify-content: flex-end; gap: 4px; height: 18px; align-items: center; padding-right: 5px;}
          .dots span { width: 7px; height: 7px; background: #4caf50; border-radius: 50%; animation: dAn 1.5s infinite; opacity: 0.2; }
          .dots span:nth-child(2) { animation-delay: 0.3s; }
          .dots span:nth-child(3) { animation-delay: 0.6s; }
          @keyframes dAn { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
          .row-info { margin-top: 2px; background: rgba(0,0,0,0.3); border-radius: 4px; padding: 1px 6px; font-size: 12px; color: #fff; display: flex; align-items: center; gap: 8px; overflow: hidden; font-weight: 600; }
          .mq-w { flex: 1; overflow: hidden; white-space: nowrap; position: relative; height: 18px; }
          .mq-t { display: inline-block; padding-left: 100%; animation: mMo 25s linear infinite; will-change: transform; line-height: 18px; }
          @keyframes mMo { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
          .alert-style { background: #d32f2f !important; border: 1px solid #ff8a80; }
          .alert-txt { color: white !important; font-weight: 800; text-transform: uppercase; }
          @media (max-width: 450px) {
            .line-badge { min-width: 35px; height: 28px; font-size: 16px; }
            .dest { font-size: 19px; }
            .count-box { font-size: 22px; }
          }
        </style>
        <ha-card>
          <div class="header-box">
            <img class="stop-logo" src="https://www.irmscher.at/linzag/logos/Haltestelle-Logo.png">
            <div class="stop-title" id="maxi-title"></div>
          </div>
          <div class="rows-container" id="maxi-list"></div>
        </ha-card>
      `;
    }

    const container = this.querySelector("#maxi-list");
    
    // *** BUGFIX FÜR DEN DATEI-EDITOR IN HOME ASSISTANT ***
    const filterRegex = /^(Linz\/Donau|Leonding|Linz)[,\s]+/i;
    const defaultName = (state.attributes.stop_name || "").replace(filterRegex, "").trim();
    
    this.querySelector("#maxi-title").innerText = this._config.stop_name_override || defaultName;

    const visibleRows = departures.slice(0, this._config.anzahl);
    const activeIds = [];

    visibleRows.forEach((d) => {
      const rowId = `r-${d.line}-${d.direction}-${d.scheduled}`.replace(/[^a-z0-9]/gi, "");
      activeIds.push(rowId);
      
      let rowEl = container.querySelector(`[data-id="${rowId}"]`);
      
      const infoLow = (d.infos || "").toLowerCase();
      const isCancelled = d.canceled || d.cancelled || infoLow.includes("fällt aus") || infoLow.includes("entfällt");
      const isNow = d.countdown === 0 && !d.isGone && !isCancelled;

      let timeVal;
      let metaVal = (!d.isGone && d.delay > 0 && !isCancelled) ? `${d.scheduled} <span class="delay-red">(+${d.delay})</span>` : d.scheduled;

      if (isCancelled) {
         timeVal = `<span style="text-decoration:line-through; color:#ff5252;">${d.scheduled}</span>`;
         metaVal = "";
      } else if (isNow) {
         timeVal = `<div class="dots"><span></span><span></span><span></span></div>`;
      } else if (d.isGone) {
         timeVal = `<span class="gone-txt">${d.scheduled}</span>`;
         metaVal = "";
      } else if (this._config.time_format === "absolute" || d.countdown >= 45) {
         timeVal = d.scheduled;
         metaVal = (this._config.time_format === "absolute" && d.countdown < 45 && !d.isGone && !isNow) ? `in ${d.countdown} Min` : ""; 
      } else {
         timeVal = `${d.countdown}<span class="min-u">Min</span>`;
      }

      const cleanL = d.line.replace("*", "");
      let lineT = this._getRouteName(d);

      let styledInfoHtml = "";
      if (isCancelled) {
         styledInfoHtml = `
            <div class="row-info alert-style">
              <span style="color:white">⚠️</span>
              <div class="mq-w"><div class="mq-t" style="animation:none; padding-left:0;"><span class="alert-txt">FAHRT FÄLLT AUS</span></div></div>
            </div>`;
      } else if (showInfo) {
         const infoTextRaw = (d.infos || "").replace(/\n/g, " ").trim();
         if (infoTextRaw.length > 2 && !infoTextRaw.includes("Niederflur")) {
            const parts = infoTextRaw.split(/([.,;])/);
            const buildColoredBlock = () => parts.map(part => `<span>${part}</span>`).join("");
            const block = buildColoredBlock();
            const separator = `<span> &nbsp;&nbsp; +++ &nbsp;&nbsp; </span>`;
            styledInfoHtml = `
              <div class="row-info">
                <span class="warn-icon">⚠️</span>
                <div class="mq-w"><div class="mq-t">${block}${separator}${block}</div></div>
              </div>`;
         }
      }

      if (!rowEl) {
        const tempRow = document.createElement("div");
        tempRow.setAttribute("data-id", rowId);
        tempRow.className = "row";
        tempRow.innerHTML = `
          <div class="line-badge" style="background:${LINE_COLORS[cleanL] || "#444"}">${lineT}</div>
          <div class="main-body">
            <div class="dest-wrap"><div class="dest">${d.direction}</div></div>
            <div class="info-area">${styledInfoHtml}</div>
          </div>
          <div class="count-box-wrapper">
            <div class="count-box">${timeVal}</div>
            <div class="time-meta"><span class="time-small">${metaVal}</span></div>
          </div>
        `;
        container.appendChild(tempRow);
        rowEl = tempRow;
      } else {
        const cBox = rowEl.querySelector(".count-box");
        const mBox = rowEl.querySelector(".time-small");
        const infoArea = rowEl.querySelector(".info-area");
        const badgeEl = rowEl.querySelector(".line-badge");
        if (cBox.innerHTML !== timeVal) cBox.innerHTML = timeVal;
        if (mBox.innerHTML !== metaVal) mBox.innerHTML = metaVal;
        const destEl = rowEl.querySelector(".dest");
        if (destEl && destEl.textContent !== d.direction) destEl.textContent = d.direction;
        if (infoArea && infoArea.innerHTML !== styledInfoHtml) infoArea.innerHTML = styledInfoHtml;
        if (badgeEl) {
          if (badgeEl.textContent !== lineT) badgeEl.textContent = lineT;
          badgeEl.style.background = LINE_COLORS[cleanL] || "#444";
        }
      }

      const badgeEl2 = rowEl.querySelector(".line-badge");
      if (badgeEl2) badgeEl2.style.borderRadius = `${badgeRadius}px`;

      rowEl.style.opacity = (d.isGone || isCancelled) ? "0.6" : "1";
      rowEl.style.borderLeftColor = isNow ? "#4caf50" : (d.isGone ? "#d32f2f" : "transparent");
      rowEl.style.animation = isNow ? "bB 2s infinite" : "none";
      rowEl.className = isCancelled ? "row is-cancelled" : "row";

      const destEl = rowEl.querySelector(".dest");
      const destWrap = rowEl.querySelector(".dest-wrap");
      if (destWrap && destEl) {
         // 2 PIXEL TOLERANZ HINZUGEFÜGT
         if (destEl.scrollWidth > destWrap.offsetWidth - 2) {
            const diff = destWrap.offsetWidth - destEl.scrollWidth;
            destEl.style.setProperty('--scroll-dist', `${diff - 10}px`);
            destEl.classList.add("ping-pong-scroll");
         } else {
            destEl.classList.remove("ping-pong-scroll");
         }
      }
    });

    Array.from(container.children).forEach(child => {
      if (!activeIds.includes(child.getAttribute("data-id"))) container.removeChild(child);
    });
  }

  /* ==================================================================================
     RENDER: MIDI (Compact)
     ================================================================================== */
  _renderMidi(state, departures) {
    const ROW_H = this._config.row_height || 38;
    const TIME_S = this._config.font_size || 20;
    const DEST_S = this._config.dest_size || 20;
    const BADGE_W = 48;
    const FONT = this._config.font_family ? `'${this._config.font_family}', sans-serif` : "'Exo 2', sans-serif";

    if (!this.querySelector("ha-card") || this._currentLayout !== 'midi') {
      this._currentLayout = 'midi';
      this.innerHTML = `
        <style>
          @font-face { font-family: 'Skyfont'; src: url('/local/Skyfont-NonCommercial.otf') format('opentype'); }
          ha-card { background: var(--ha-card-background, var(--card-background-color, #1c1c1c)); border-radius: 12px !important; padding: 10px !important; color: white !important; font-family: ${FONT} !important; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; height: 100%; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; min-height: 0; isolation: isolate; }
          .title-area { font-size: ${TIME_S}px; font-weight: 700; color: #bbb; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; margin-bottom: 5px; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
          .title-icon { height: ${Math.round(TIME_S * 1.3)}px; width: ${Math.round(TIME_S * 1.3)}px; object-fit: contain; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; flex: 1; min-height: 0; }
          tbody { display: block; height: 100%; overflow: hidden; }
          tr { display: table; width: 100%; table-layout: fixed; height: ${ROW_H}px; }
          td { vertical-align: middle; border-bottom: 1px solid rgba(255,255,255,0.05); position: relative; }
          .col-line { width: ${BADGE_W + 10}px; }
          .col-dest { width: auto; padding-left: 8px; overflow: hidden; white-space: nowrap; }
          .col-time { width: 105px; text-align: right; font-weight: 800; font-size: ${TIME_S + 1}px; z-index: 5; }
          .badge { width: ${BADGE_W}px; height: ${Math.round(ROW_H * 0.8)}px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: ${TIME_S}px; color: white; }
          .blink-badge { animation: syncBlink 1s infinite steps(1); }
          @keyframes syncBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.5; } }
          .dest-text { font-size: ${DEST_S}px; font-weight: 800; color: #fff; white-space: nowrap; display: inline-block; transition: opacity 0.2s; }
          .ping-pong-scroll { animation: scroll-pingpong 8s linear infinite alternate; --scroll-dist: -50px; }
          @keyframes scroll-pingpong { 0%, 15% { transform: translateX(0); } 85%, 100% { transform: translateX(var(--scroll-dist)); } }
          .info-overlay { position: absolute; top: 0; left: 8px; width: calc(100% - 8px); height: 100%; background: var(--ha-card-background, var(--card-background-color, #1c1c1c)); display: flex; align-items: center; opacity: 0; transition: opacity 0.4s; z-index: 2; pointer-events: none; }
          .info-overlay.visible { opacity: 1; }
          .marquee-wrap { overflow: hidden; flex: 1; position: relative; display: flex; align-items: center; height: 100%; }
          .marquee-text { white-space: nowrap; font-size: ${DEST_S - 2}px; font-weight: 600; color: #fff; display: inline-block; padding-left: 100%; }
          .animating .marquee-text { animation: scrollLeft linear forwards; }
          @keyframes scrollLeft { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
          .delay-red { font-size: ${Math.max(12, TIME_S - 6)}px; color: #ff5252; margin-right: 4px; font-weight: 800; }
          .is-gone { opacity: 0.3 !important; text-decoration: line-through !important; }
          .is-cancelled { opacity: 0.6; text-decoration: line-through; color: #ff5252 !important; }
          .is-cancelled .dest-text { color: #ff5252 !important; text-decoration: line-through; }
          .alert-style { background: #d32f2f; color: white !important; border: 1px solid #ff8a80; border-radius: 4px; padding: 0 4px; font-weight: 800; }
        </style>
        <ha-card>
          <div class="title-area">
            <img class="title-icon" src="https://www.irmscher.at/linzag/logos/Haltestelle-Logo.png">
            <span class="stop-name" id="midi-title"></span>
          </div>
          <table><tbody id="midi-list"></tbody></table>
        </ha-card>
      `;
    }

    const list = this.querySelector("#midi-list");
    
    // *** BUGFIX FÜR DEN DATEI-EDITOR IN HOME ASSISTANT ***
    const filterRegex = /^(Linz\/Donau|Leonding|Linz)[,\s]+/i;
    const defaultName = (state.attributes.stop_name || "").replace(filterRegex, "").trim();
    
    this.querySelector("#midi-title").innerText = this._config.stop_name_override || defaultName;

    const visibleRows = departures.slice(0, this._config.anzahl);
    const activeIds = [];

    visibleRows.forEach((d) => {
      const rowId = `r-${d.line}-${d.scheduled}-${d.direction}`.replace(/[^a-z0-9]/gi, "");
      activeIds.push(rowId);
      
      let row = list.querySelector(`[data-id="${rowId}"]`);
      const infoLow = (d.infos || "").toLowerCase();
      const isCancelled = d.canceled || d.cancelled || infoLow.includes("fällt aus") || infoLow.includes("entfällt");
      const isNow = d.countdown === 0 && !d.isGone && !isCancelled;
      const cleanL = d.line.replace("*", "");
      let lineT = this._getRouteName(d);

      if (!row) {
        row = document.createElement("tr");
        row.setAttribute("data-id", rowId);
        row.innerHTML = `<td class="col-line"><div class="badge"></div></td><td class="col-dest"><div class="dest-text"></div><div class="info-overlay"><span style="margin-right:5px">⚠️</span><div class="marquee-wrap"><div class="marquee-text"></div></div></div></td><td class="col-time"></td>`;
        list.appendChild(row);
        row._state = 'dest'; row._next = Date.now() + 10000;
      }
      row.className = d.isGone ? 'is-gone' : (isCancelled ? 'is-cancelled' : '');
      const b = row.querySelector(".badge");
      if(b.innerText !== lineT) b.innerText = lineT;
      b.style.background = LINE_COLORS[cleanL] || "#444";
      b.classList.toggle("blink-badge", isNow);

      const timeCol = row.querySelector(".col-time");
      const delayText = (!d.isGone && !isCancelled && d.delay > 0) ? `<span class="delay-red">(+${d.delay})</span>` : "";

      if (isCancelled) timeCol.innerHTML = `<span style="text-decoration: line-through; color: #ff5252; opacity: 0.9;">${d.scheduled}</span>`;
      else if (isNow) timeCol.innerHTML = `<div style="display:flex;justify-content:flex-end;"><img src="https://www.irmscher.at/linzag/linzlinien-z.png" style="width:22px;height:22px;object-fit:contain;"></div>`;
      else if (this._config.time_format === "absolute" || d.isGone || d.countdown >= 45) timeCol.innerHTML = `${delayText}${d.scheduled}`;
      else timeCol.innerHTML = `${delayText}${d.countdown}<span style="font-size:${TIME_S-3}px;opacity:0.6;margin-left:2px">Min</span>`;

      const destEl = row.querySelector(".dest-text");
      if(destEl.innerText !== d.direction) destEl.innerText = d.direction;
      destEl.style.fontSize = `${DEST_S}px`;

      const col = row.querySelector(".col-dest");
      if (col && destEl) {
         // 2 PIXEL TOLERANZ HINZUGEFÜGT
         if (destEl.scrollWidth > col.offsetWidth - 2) {
            const diff = col.offsetWidth - destEl.scrollWidth;
            destEl.style.setProperty('--scroll-dist', `${diff - 10}px`);
            destEl.classList.add("ping-pong-scroll");
         } else {
            destEl.classList.remove("ping-pong-scroll");
         }
      }

      const overlay = row.querySelector(".info-overlay");
      const marquee = row.querySelector(".marquee-text");
      const wrap = row.querySelector(".marquee-wrap");
      const hideDest = (shouldHide) => { destEl.style.opacity = shouldHide ? "0" : "1"; };

      if (isCancelled) {
        if (marquee.innerText !== "FAHRT FÄLLT AUS") { marquee.innerText = "FAHRT FÄLLT AUS"; marquee.className = "marquee-text alert-style"; }
        if (Date.now() > row._next) {
          row._state = (row._state === 'dest') ? 'warn' : 'dest';
          row._next = Date.now() + 5000;
          if (row._state === 'warn') { overlay.classList.add("visible"); wrap.classList.remove("animating"); hideDest(true); } 
          else { overlay.classList.remove("visible"); hideDest(false); }
        }
      } else if (d.infos && d.infos.length > 5 && !isNow && !d.isGone) {
        const infoText = d.infos.replace(/\n/g, " ").replace("Niederflurfahrzeug", "").trim();
        if (marquee.innerText !== infoText) { marquee.innerText = infoText; marquee.className = "marquee-text"; }
        const duration = Math.max(7, infoText.length * 0.22);
        if (Date.now() > row._next) {
          if (row._state === 'dest') {
             row._state = 'info'; row._next = Date.now() + (duration * 1000) + 500;
             overlay.classList.add("visible"); wrap.classList.add("animating"); marquee.style.animationDuration = `${duration}s`; hideDest(true);
          } else {
             row._state = 'dest'; row._next = Date.now() + 10000;
             overlay.classList.remove("visible"); wrap.classList.remove("animating"); hideDest(false);
          }
        }
      } else {
        overlay.classList.remove("visible"); hideDest(false);
      }
    });

    Array.from(list.children).forEach(c => { if (!activeIds.includes(c.getAttribute("data-id"))) list.removeChild(c); });
  }

  /* ==================================================================================
     RENDER: MINI (Minimal)
     ================================================================================== */
  _renderMini(state, departures) {
    const ROW_H = this._config.row_height || 32;
    const TIME_S = this._config.font_size || 14;
    const DEST_S = this._config.dest_size || 14;
    const B_SIZE = this._config.badge_size || 24; 
    const B_ROUND = this._config.badge_round !== false; 
    const B_RADIUS = B_ROUND ? "50%" : "3px"; 
    const B_FONT = Math.round(B_SIZE * 0.60); 
    const FONT = this._config.font_family ? `'${this._config.font_family}', sans-serif` : "'Exo 2', sans-serif";

    if (!this.querySelector("ha-card") || this._currentLayout !== 'mini') {
      this._currentLayout = 'mini';
      this.innerHTML = `
        <style>
          @font-face { font-family: 'Skyfont'; src: url('/local/Skyfont-NonCommercial.otf') format('opentype'); }
          ha-card { background: var(--ha-card-background, var(--card-background-color, #1c1c1c)); border-radius: 10px !important; padding: 8px !important; color: white !important; font-family: ${FONT} !important; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; height: 100%; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; min-height: 0; isolation: isolate; }
          .title-area { font-size: ${TIME_S}px; font-weight: 700; color: #bbb; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 2px; margin-bottom: 2px; display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
          .title-icon { height: ${Math.round(TIME_S * 1.2)}px; width: ${Math.round(TIME_S * 1.2)}px; object-fit: contain; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; flex: 1; min-height: 0; }
          tbody { display: block; height: 100%; overflow: hidden; }
          tr { display: table; width: 100%; table-layout: fixed; height: ${ROW_H}px; }
          td { vertical-align: middle; border-bottom: 1px solid rgba(255,255,255,0.05); position: relative; }
          .col-line { width: ${B_SIZE + 4}px; }
          .col-dest { width: auto; padding-left: 3px; overflow: hidden; white-space: nowrap; }
          .col-time { width: 50px; text-align: right; font-weight: 800; font-size: ${TIME_S}px; z-index: 5; }
          .badge { width: ${B_SIZE}px; height: ${B_SIZE}px; border-radius: ${B_RADIUS}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: ${B_FONT}px; color: white; }
          .blink-badge { animation: syncBlink 1s infinite steps(1); }
          @keyframes syncBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.5; } }
          .dest-text { font-size: ${DEST_S}px; font-weight: 700; color: #fff; white-space: nowrap; display: inline-block; transition: opacity 0.2s; }
          .ping-pong-scroll { animation: scroll-pingpong 8s linear infinite alternate; --scroll-dist: -50px; }
          @keyframes scroll-pingpong { 0%, 15% { transform: translateX(0); } 85%, 100% { transform: translateX(var(--scroll-dist)); } }
          .info-overlay { position: absolute; top: 0; left: 3px; width: calc(100% - 3px); height: 100%; background: var(--ha-card-background, var(--card-background-color, #1c1c1c)); display: flex; align-items: center; opacity: 0; transition: opacity 0.4s; z-index: 2; pointer-events: none; }
          .info-overlay.visible { opacity: 1; }
          .marquee-wrap { overflow: hidden; flex: 1; position: relative; display: flex; align-items: center; height: 100%; }
          .marquee-text { white-space: nowrap; font-size: ${DEST_S - 2}px; font-weight: 600; color: #fff; display: inline-block; padding-left: 100%; }
          .animating .marquee-text { animation: scrollLeft linear forwards; }
          @keyframes scrollLeft { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
          .delay-red { font-size: ${Math.max(10, TIME_S - 3)}px; color: #ff5252; margin-right: 2px; font-weight: 800; }
          .is-gone { opacity: 0.3 !important; text-decoration: line-through !important; }
          .is-cancelled { opacity: 0.6; text-decoration: line-through; color: #ff5252 !important; }
          .is-cancelled .dest-text { color: #ff5252 !important; text-decoration: line-through; }
          .alert-style { background: #d32f2f; color: white !important; border: 1px solid #ff8a80; border-radius: 4px; padding: 0 4px; font-weight: 800; }
        </style>
        <ha-card>
          <div class="title-area">
            <img class="title-icon" src="https://www.irmscher.at/linzag/logos/Haltestelle-Logo.png">
            <span class="stop-name" id="mini-title"></span>
          </div>
          <table><tbody id="mini-list"></tbody></table>
        </ha-card>
      `;
    }

    const list = this.querySelector("#mini-list");
    
    // *** BUGFIX FÜR DEN DATEI-EDITOR IN HOME ASSISTANT ***
    const filterRegex = /^(Linz\/Donau|Leonding|Linz)[,\s]+/i;
    const defaultName = (state.attributes.stop_name || "").replace(filterRegex, "").trim();
    
    this.querySelector("#mini-title").innerText = this._config.stop_name_override || defaultName;

    const visibleRows = departures.slice(0, this._config.anzahl);
    const activeIds = [];

    visibleRows.forEach((d) => {
      const rowId = `r-${d.line}-${d.scheduled}-${d.direction}`.replace(/[^a-z0-9]/gi, "");
      activeIds.push(rowId);
      
      let row = list.querySelector(`[data-id="${rowId}"]`);
      const infoLow = (d.infos || "").toLowerCase();
      const isCancelled = d.canceled || d.cancelled || infoLow.includes("fällt aus") || infoLow.includes("entfällt");
      const isNow = d.countdown === 0 && !d.isGone && !isCancelled;
      const cleanL = d.line.replace("*", "");
      let lineT = this._getRouteName(d);

      if (!row) {
        row = document.createElement("tr");
        row.setAttribute("data-id", rowId);
        row.innerHTML = `<td class="col-line"><div class="badge"></div></td><td class="col-dest"><div class="dest-text"></div><div class="info-overlay"><span style="margin-right:5px">⚠️</span><div class="marquee-wrap"><div class="marquee-text"></div></div></div></td><td class="col-time"></td>`;
        list.appendChild(row);
        row._state = 'dest'; row._next = Date.now() + 10000;
      }
      row.className = d.isGone ? 'is-gone' : (isCancelled ? 'is-cancelled' : '');
      const b = row.querySelector(".badge");
      if(b.innerText !== lineT) b.innerText = lineT;
      b.style.background = LINE_COLORS[cleanL] || "#444";
      b.classList.toggle("blink-badge", isNow);
      b.style.borderRadius = B_RADIUS; 

      const timeCol = row.querySelector(".col-time");
      const delayText = (!d.isGone && !isCancelled && d.delay > 0) ? `<span class="delay-red">(+${d.delay})</span>` : "";

      if (isCancelled) timeCol.innerHTML = `<span style="text-decoration: line-through; color: #ff5252; opacity: 0.9;">${d.scheduled}</span>`;
      else if (isNow) timeCol.innerHTML = `<div style="display:flex;justify-content:flex-end;"><img src="https://www.irmscher.at/linzag/linzlinien-z.png" style="width:${Math.round(B_SIZE*0.8)}px;height:${Math.round(B_SIZE*0.8)}px;object-fit:contain;"></div>`;
      else if (this._config.time_format === "absolute" || d.isGone || d.countdown >= 45) timeCol.innerHTML = `${delayText}${d.scheduled}`;
      else timeCol.innerHTML = `${delayText}${d.countdown}`;

      const destEl = row.querySelector(".dest-text");
      
      let finalDestText = d.direction;
      if (isCancelled) finalDestText = `${d.direction} ⚠️ FÄLLT AUS`;
      
      if(destEl.innerText !== finalDestText) destEl.innerText = finalDestText;
      destEl.style.fontSize = `${DEST_S}px`;

      const col = row.querySelector(".col-dest");
      if (col && destEl) {
         // 2 PIXEL TOLERANZ HINZUGEFÜGT
         if (destEl.scrollWidth > col.offsetWidth - 2) {
            const diff = col.offsetWidth - destEl.scrollWidth;
            destEl.style.setProperty('--scroll-dist', `${diff - 10}px`);
            destEl.classList.add("ping-pong-scroll");
         } else {
            destEl.classList.remove("ping-pong-scroll");
         }
      }

      const overlay = row.querySelector(".info-overlay");
      const marquee = row.querySelector(".marquee-text");
      const wrap = row.querySelector(".marquee-wrap");
      const hideDest = (shouldHide) => { destEl.style.opacity = shouldHide ? "0" : "1"; };

      if (isCancelled) {
         overlay.classList.remove("visible");
         hideDest(false); 
      } else if (d.infos && d.infos.length > 5 && !isNow && !d.isGone) {
        const infoText = d.infos.replace(/\n/g, " ").replace("Niederflurfahrzeug", "").trim();
        if (marquee.innerText !== infoText) { marquee.innerText = infoText; marquee.className = "marquee-text"; }
        const duration = Math.max(7, infoText.length * 0.22);
        if (Date.now() > row._next) {
          if (row._state === 'dest') {
             row._state = 'info'; row._next = Date.now() + (duration * 1000) + 500;
             overlay.classList.add("visible"); wrap.classList.add("animating"); marquee.style.animationDuration = `${duration}s`; hideDest(true);
          } else {
             row._state = 'dest'; row._next = Date.now() + 10000;
             overlay.classList.remove("visible"); wrap.classList.remove("animating"); hideDest(false);
          }
        }
      } else {
        overlay.classList.remove("visible"); hideDest(false);
      }
    });

    Array.from(list.children).forEach(c => { if (!activeIds.includes(c.getAttribute("data-id"))) list.removeChild(c); });
  }

  /* ==================================================================================
     RENDER: HALTESTELLEN-SÄULE (Nachbau der Linz AG Anzeige an der Haltestelle)
     Nur die Tafel selbst – ohne Mast, ohne Kartenhintergrund.
     ================================================================================== */
  _renderStele(state, departures) {
    const LED = this._config.stele_led_color || "#4dff5e";
    const esc = (t) => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    const compact = this._config.stele_compact === true;
    const showLabels = this._config.stele_labels !== false;

    if (!this.querySelector("ha-card") || this._currentLayout !== 'stele') {
      this._currentLayout = 'stele';
      this._steleDrawn = [];
      this.innerHTML = `
        <style>
          ha-card.st-card {
            background: transparent !important; box-shadow: none !important; border: none !important;
            display: block; width: 100%; padding: 0 !important; overflow: visible !important; container-type: inline-size;
            --st-led: ${LED};
          }
          .st-wrap { width: 100%; font-family: Arial, "Helvetica Neue", Helvetica, sans-serif; color: #1d1d1b; }

          /* --- Kopf mit Bogen --- */
          .st-head {
            position: relative; background: linear-gradient(180deg, #ffffff 0%, #f1f1ef 100%);
            border: 1px solid #c7cacc; border-bottom: none;
            border-radius: 50% 50% 0 0 / 34cqw 34cqw 0 0;
            padding: 5cqw 6cqw 2.6cqw; text-align: center;
            box-shadow: inset 0 -0.6cqw 0 rgba(0,0,0,0.04);
          }
          .st-h {
            width: 19cqw; height: 19cqw; margin: 0 auto 2cqw; border-radius: 50%;
            background: #f6b70f; border: 1.6cqw solid #1f8a55; box-sizing: border-box;
            display: flex; align-items: center; justify-content: center;
            color: #1b6b43; font-weight: 700; font-size: 13cqw; line-height: 1; font-family: Arial, sans-serif;
          }
          .st-name { font-weight: 700; font-size: 6.6cqw; line-height: 1.15; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .st-lines { text-align: left; font-size: 4.6cqw; margin-top: 1.6cqw; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

          /* --- Fuge zwischen Kopf und Anzeige --- */
          .st-joint { height: 1.4cqw; background: linear-gradient(180deg, #b9bcbe, #dfe1e2); border-left: 1px solid #c7cacc; border-right: 1px solid #c7cacc; }

          /* --- Anzeigefeld --- */
          .st-body {
            background: linear-gradient(180deg, #fbfbfa 0%, #f0f0ee 100%);
            border: 1px solid #c7cacc; border-top: none; border-radius: 0 0 2.4cqw 2.4cqw;
            padding: 3.4cqw 4.6cqw 4cqw;
          }
          /* Kompakt (Badge): nur Anzeigefeld, rundum abgerundet, schmaler Rand */
          .st-compact .st-body { border-top: 1px solid #c7cacc; border-radius: 2cqw; padding: 2cqw 2.6cqw 2.6cqw; }
          .st-compact .st-body.no-labels { padding-top: 2.6cqw; }
          /* Spaltenköpfe exakt über dem 24-Zeichen-Raster: "Ziel" beginnt bei Zeichen 5 */
          .st-labels { display: grid; grid-template-columns: calc(1.2% + 97.6% * 5 / 24) 1fr auto; align-items: end; font-size: 3.9cqw; line-height: 1.15; margin-bottom: 1.8cqw; color: #2a2a28; }
          .st-labels .lab-time { text-align: right; }

          .st-rows { display: flex; flex-direction: column; gap: 2.8cqw; }
          .st-row {
            background-color: #0b0e0c; border-radius: 0.5cqw;
            box-shadow: inset 0 0 0 0.3cqw #1a1f1c;
            padding: 0.6cqw 1.2%; box-sizing: border-box; line-height: 0;
          }
          /* 24 Kästchen à 12 x 20 Pixel (+ Fuge) */
          .st-row canvas { display: block; width: 100%; aspect-ratio: ${(STELE_COLS * STELE_CELL_W) / (STELE_CELL_H * STELE_DOT_ASPECT)} / 1; }

          /* --- Fußbereich --- */
          .st-foot { position: relative; margin-top: 6cqw; min-height: 10cqw; display: flex; justify-content: flex-end; align-items: flex-end; }
          .st-foot img { width: 62%; max-height: 18cqw; object-fit: contain; object-position: right bottom; display: block; }
          .st-clock { position: absolute; left: 0; bottom: 0; font-size: 3.6cqw; color: #8a8d8f; font-variant-numeric: tabular-nums; }
        </style>
        <ha-card class="st-card">
          <div class="st-wrap${compact ? " st-compact" : ""}">
            ${compact ? `` : `
            <div class="st-head">
              <div class="st-h">H</div>
              <div class="st-name" id="st-title"></div>
              <div class="st-lines" id="st-lines"></div>
            </div>
            <div class="st-joint"></div>`}
            <div class="st-body${showLabels ? "" : " no-labels"}">
              ${showLabels ? `<div class="st-labels"><span>Linie</span><span>Ziel</span><span class="lab-time">Abfahrt<br>in Min.</span></div>` : ``}
              <div class="st-rows" id="st-rows"></div>
              ${compact ? `` : `
              <div class="st-foot">
                <img src="${esc(this._config.stele_footer_image || (LINZ_ASSET_BASE + "linzag-linien.png"))}" alt="Linz AG Linien">
                ${this._config.stele_clock !== false ? `<div class="st-clock" id="clock"></div>` : ``}
              </div>`}
            </div>
          </div>
        </ha-card>
      `;
    }

    this._updateClockDisplay();

    // Titel
    const filterRegex = /^(Linz\/Donau|Leonding|Linz)[,\s]+/i;
    const defaultName = (state.attributes.stop_name || "").replace(filterRegex, "").trim();
    const title = this._config.stop_name_override || defaultName;
    const titleEl = this.querySelector("#st-title");
    if (titleEl && titleEl.textContent !== title) titleEl.textContent = title;

    // Linien-Zeile: manuell oder automatisch aus allen Abfahrten der Haltestelle
    let lines = (this._config.stele_lines || "").split(",").map(s => s.trim()).filter(Boolean);
    if (!lines.length) {
      const all = (state.attributes.departureList || []).filter(d => d && d.line).map(d => String(d.line).replace("*", ""));
      lines = [...new Set(all)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }
    const linesText = lines.length ? `${lines.length === 1 ? "Linie" : "Linien"} ${lines.join(",")}` : "";
    const linesEl = this.querySelector("#st-lines");
    if (linesEl && linesEl.textContent !== linesText) linesEl.textContent = linesText;

    // Zeilen aufbauen – 24 Felder:
    //   1-3 Liniennummer (rechtsbündig) | 4 Zusatz (a, *, s, b …) | 5 leer
    //   6-21 Ziel bzw. Sonderinformation (16 Felder, läuft Feld für Feld, wenn zu lang)
    //   22-24 Abfahrtsminuten (rechtsbündig, max. 99 – wie an der echten Anzeige)
    // Bereits abgefahrene Fahrten zeigt die echte Anzeige nicht.
    const count = Math.max(1, Number(this._config.anzahl) || 4);
    // Die echte Anzeige zeigt nur Abfahrten bis 99 Minuten
    const visible = departures.filter(d => !d.isGone && !(typeof d.countdown === "number" && d.countdown > 99)).slice(0, count);
    const rows = [];
    for (let i = 0; i < count; i++) {
      const d = visible[i];
      if (!d) { rows.push({ id: `leer-${i}`, prefix: "", segments: [""], min: "", blink: false }); continue; }
      const infoLow = (d.infos || "").toLowerCase();
      const isCancelled = d.canceled || d.cancelled || infoLow.includes("fällt aus") || infoLow.includes("entfällt");
      const isNow = d.countdown === 0 && !isCancelled;

      // Liniennummer + Zusatzbezeichnung trennen ("11s" -> "11" + "s", "27*" -> "27" + "*", "N82" bleibt)
      const name = String(this._getRouteName(d) || "");
      const m = /^(.{1,3}?)([a-zA-Z*])$/.exec(name);
      const base = (m && /\d/.test(m[1])) ? m[1] : name.slice(0, 3);
      const suffix = (m && /\d/.test(m[1])) ? m[2] : "";
      const prefix = base.padStart(3) + (suffix || " ") + " ";

      let minTxt;
      if (isCancelled) minTxt = "--";
      else if (isNow) minTxt = "0";
      else minTxt = String(d.countdown);

      // Ziel + Sonderinformationen wechseln sich im Zielfeld ab
      const segments = [steleShortDest(d.direction)];
      if (isCancelled) segments.push("Fällt aus");
      const info = String(d.infos || "").replace(/Niederflurfahrzeug/gi, "").replace(/\s+/g, " ").replace(/^[\s+]+|[\s+]+$/g, "");
      if (!isCancelled && info.length > 2) segments.push(info);

      rows.push({
        id: `${name}|${d.direction}|${d.scheduled}`,
        prefix, segments, min: minTxt, blink: isNow,
      });
    }

    const rowsEl = this.querySelector("#st-rows");
    if (rowsEl.children.length !== count) {
      rowsEl.innerHTML = Array.from({ length: count }, () => `<div class="st-row"><canvas></canvas></div>`).join("");
      if (!this._steleRO && window.ResizeObserver) {
        this._steleRO = new ResizeObserver(() => { this._steleDrawn = []; this._steleTick(); });
      }
      if (this._steleRO) { this._steleRO.disconnect(); this._steleRO.observe(rowsEl); }
    }
    this._steleDrawn = this._steleDrawn || [];
    this._steleAnim = this._steleAnim || new Map();
    // Laufschrift-Zustand nur für noch sichtbare Fahrten behalten
    const ids = new Set(rows.map(r => r.id));
    for (const k of this._steleAnim.keys()) if (!ids.has(k)) this._steleAnim.delete(k);
    this._steleRows = rows;

    if (!this._steleTimer) this._steleTimer = setInterval(() => this._steleTick(), 100);
    this._steleTick();
  }

  /* Zielfeld-Text zum Zeitpunkt "now": kurze Texte stehen, lange laufen Feld für Feld nach links */
  _steleField(row, width, now) {
    const HOLD_START = 2000, HOLD_END = 1500, STEP = 330, SHOW_SHORT = 6000;
    let st = this._steleAnim.get(row.id);
    if (!st || st.segCount !== row.segments.length) {
      st = { seg: 0, off: 0, phase: "start", until: now + HOLD_START, segCount: row.segments.length };
      this._steleAnim.set(row.id, st);
    }
    let guard = 0;
    while (now >= st.until && guard++ < 200) {
      const text = row.segments[st.seg] || "";
      const overflow = text.length - width;
      if (overflow <= 0) {
        // passt: eine Weile stehen lassen, dann ggf. zur nächsten Information
        if (row.segments.length === 1) { st.until = now + 1e9; break; }
        st.seg = (st.seg + 1) % row.segments.length; st.off = 0; st.phase = "start";
        st.until += (row.segments[st.seg].length > width) ? HOLD_START : SHOW_SHORT;
      } else if (st.phase === "start") {
        st.phase = "scroll"; st.until += STEP;
      } else if (st.phase === "scroll") {
        st.off++;
        if (st.off >= overflow) { st.phase = "end"; st.until += HOLD_END; }
        else st.until += STEP;
      } else {
        st.seg = (st.seg + 1) % row.segments.length; st.off = 0; st.phase = "start";
        st.until += (row.segments[st.seg].length > width) ? HOLD_START : SHOW_SHORT;
      }
    }
    const text = row.segments[st.seg] || "";
    return text.slice(st.off, st.off + width).padEnd(width);
  }

  /* Takt für Laufschrift und Blinken – zeichnet nur Zeilen neu, die sich geändert haben */
  _steleTick() {
    if (this._currentLayout !== "stele" || !this._steleRows) {
      if (this._steleTimer) { clearInterval(this._steleTimer); this._steleTimer = null; }
      return;
    }
    const rowsEl = this.querySelector("#st-rows");
    if (!rowsEl) return;
    const now = Date.now();
    const blinkOn = Math.floor(now / 500) % 2 === 0;
    const LED = this._config.stele_led_color || "#4dff5e";
    const canvases = rowsEl.querySelectorAll("canvas");
    this._steleRows.forEach((row, r) => {
      let text = "";
      if (row.prefix) {
        const minW = STELE_MIN_W;                           // Felder 22-24
        const fieldW = STELE_COLS - 5 - minW;               // 16 Felder (6-21)
        const min = (row.blink && !blinkOn) ? "" : row.min;
        text = row.prefix + this._steleField(row, fieldW, now) + min.padStart(minW);
      }
      const key = text + "|" + LED;
      if (this._steleDrawn[r] !== key && canvases[r]) {
        this._steleDrawn[r] = key;
        this._drawSteleRow(canvases[r], text, LED);
      }
    });
  }

  /* Eine LED-Zeile zeichnen: 24 Zeichenfelder, 5x7-LED-Schrift, jeder Schrift-Punkt = 2x2 LED-Punkte */
  _drawSteleRow(cv, text, LED) {
    const PX = STELE_CELL_W, PY = STELE_CELL_H, W = STELE_COLS * PX, H = PY, D = STELE_DOT;

    const m = /^#?([0-9a-f]{6})$/i.exec(String(LED).trim());
    let cellColor = "#132016";
    if (m) {
      const n = parseInt(m[1], 16), mix = (c, bg) => Math.round(bg + (c - bg) * 0.10);
      cellColor = `rgb(${mix(n >> 16 & 255, 11)},${mix(n >> 8 & 255, 14)},${mix(n & 255, 12)})`;
    }

    const dpr = window.devicePixelRatio || 1;
    const cssW = cv.clientWidth || 300;
    const cw = Math.max(W, Math.round(cssW * dpr)), ch = Math.round(cw * H * STELE_DOT_ASPECT / W);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const ctx = cv.getContext("2d");
    const dot = cw / W, dotY = dot * STELE_DOT_ASPECT;

    // Hintergrund + dunkle Zeichenfelder (alle gleich groß)
    const look = STELE_LOOK;
    ctx.fillStyle = "#0b0e0c";
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = cellColor;
    for (let i = 0; i < STELE_COLS; i++) {
      ctx.fillRect((i * PX + STELE_CELL_GAP / 2) * dot, (STELE_CELL_GAP / 2) * dotY, STELE_PIX_W * dot, STELE_PIX_H * dotY);
    }
    const gapX = dot * (1 - look.fill) / 2, gapY = dotY * (1 - look.fill) / 2;

    // unbeleuchtete Pixel des LED-Boards ganz leicht sichtbar
    if (look.grid > 0) {
      const gm = look.gridMode || look.mode, gf = look.gridFill ?? look.fill;
      const ggX = dot * (1 - gf) / 2, ggY = dotY * (1 - gf) / 2;
      ctx.beginPath();
      for (let i = 0; i < STELE_COLS; i++) {
        // ganzes Kästchen: 12 x 20 Pixel
        for (let r = 0; r < STELE_PIX_H; r++) for (let c = 0; c < STELE_PIX_W; c++) {
          if (gm === "led" && (r % D || c % D)) continue;
          const x = i * PX + STELE_CELL_GAP / 2 + c, y = STELE_CELL_GAP / 2 + r;
          if (gm === "led") ctx.rect(x * dot + ggX * D, y * dotY + ggY * D, D * dot - 2 * ggX * D, D * dotY - 2 * ggY * D);
          else ctx.rect(x * dot + ggX, y * dotY + ggY, dot - 2 * ggX, dotY - 2 * ggY);
        }
      }
      ctx.fillStyle = LED;
      ctx.globalAlpha = look.grid;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // leuchtende Punkte
    ctx.beginPath();
    Array.from(text).slice(0, STELE_COLS).forEach((c, i) => {
      let g = STELE_FONT[c];
      if (!g) {
        const plain = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "");   // é -> e usw.
        g = STELE_FONT[plain] || STELE_FONT[plain.toUpperCase()] || null;
      }
      if (!g) return;
      const on = (r, col) => r >= 0 && r < 8 && col >= 0 && col < 5 && !!(g[r] & (16 >> col));
      for (let r = 0; r < 8; r++) {
        for (let col = 0; col < 5; col++) {
          if (!on(r, col)) continue;
          const x0 = i * PX + STELE_CELL_GAP / 2 + STELE_GLYPH_X + col * D, y0 = STELE_CELL_GAP / 2 + STELE_GLYPH_Y + r * D;
          if (look.mode === "led") {            // ein großes LED pro Schrift-Punkt
            ctx.rect(x0 * dot + gapX * D, y0 * dotY + gapY * D, D * dot - 2 * gapX * D, D * dotY - 2 * gapY * D);
            continue;
          }
          for (let dy = 0; dy < D; dy++) for (let dx = 0; dx < D; dx++) {
            // "thinH": waagrechte Striche nur 1 Punkt hoch, senkrechte bleiben durchgehend
            if (look.mode === "thinH" && dy > 0 && !on(r + 1, col)) continue;
            const x = x0 + dx, y = y0 + dy;
            ctx.rect(x * dot + gapX, y * dotY + gapY, dot - 2 * gapX, dotY - 2 * gapY);
          }
        }
      }
    });
    ctx.fillStyle = LED;
    ctx.shadowColor = LED;
    ctx.shadowBlur = dot * (look.glow ?? 1.2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  getCardSize() {
    if (this._config.layout === "stele" && this._config.stele_compact) return Math.max(1, Math.ceil((this._config.anzahl || 1) / 2));
    return (this._config.anzahl || 7) + 1;
  }
}

if (!customElements.get("linz-monitor-combined")) {
  customElements.define("linz-monitor-combined", LinzMonitorCombined);
}

window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === "linz-monitor-combined")) window.customCards.push({
  type: "linz-monitor-combined",
  name: "LinzAG Linien Monitor",
  description: "Maxi, Midi, Mini, LED Wall und Haltestellen-Säule in einer Karte.",
  preview: true
});
