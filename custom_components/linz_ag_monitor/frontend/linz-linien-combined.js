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
  '12': ['Karlhof', 'Auwiesen'], 
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
       
       const lines = [...new Set(deps.map(d => d.line.replace('*','')))].sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
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
             <input id="anzahl" class="std-input" type="number" value="${this._config.anzahl || 7}">
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
    this._animTimers.forEach(t => clearTimeout(t));
    this._animTimers.clear();
  }

  setConfig(config) {
    this._config = { 
      layout: "maxi",
      anzahl: 7, 
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
    
    // FONT FIX: Lädt Exo 2 als Standard, wenn das Feld leer gelassen wurde!
    if (this._config.layout === 'led') {
       loadGoogleFont("DotGothic16");
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

    departures = departures.filter(d => matchesLine(d.line) && matchesDirection(d.direction));

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
      const cleanL = d.line.replace("*", "");
      // Bereinigt unsichtbare Leerzeichen und gleicht alles in Kleinbuchstaben ab
      const dest = (d.direction || "").trim().toLowerCase();
      
      const isStandard = (STANDARD_ROUTES[cleanL] || []).some(s => s.trim().toLowerCase() === dest);
      
      if (!isStandard && STANDARD_ROUTES[cleanL]) {
        if ((cleanL === "3" || cleanL === "3a") && (dest.includes("neue welt") || dest.includes("ferihumerstraße") || dest.includes("remise kleinmünchen"))) {
          return cleanL + "a";
        } else if (cleanL === "33" && dest.includes("rudolfstraße")) {
          return "33a"; 
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
    const filterRegex = new RegExp("Linz/Donau|Leonding|Linz", "gi");
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
    const filterRegex = new RegExp("Linz/Donau|Leonding|Linz", "gi");
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
    const filterRegex = new RegExp("Linz/Donau|Leonding|Linz", "gi");
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
    const filterRegex = new RegExp("Linz/Donau|Leonding|Linz", "gi");
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

  getCardSize() { return (this._config.anzahl || 7) + 1; }
}

if (!customElements.get("linz-monitor-combined")) {
  customElements.define("linz-monitor-combined", LinzMonitorCombined);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "linz-monitor-combined",
  name: "LinzAG Linien Monitor",
  description: "Maxi, Midi, Mini und LED Wall in einer Karte.",
  preview: true
});
