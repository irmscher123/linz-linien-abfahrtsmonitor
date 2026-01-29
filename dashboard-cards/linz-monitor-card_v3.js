/* ---------------------------------------------------------
   LinzAG Monitor – Abfahrtsmonitor - Mini
   --------------------------------------------------------- */

const LINE_COLORS_V3 = { 
  "1": "#EE3A80", "2": "#C67DB5", "3": "#A4238F", "3a": "#A4238F", "4": "#C40653", 
  "11": "#E1771E", "12": "#159655", "17": "#E1771E", "18": "#008DD0", "19": "#E9639F", 
  "25": "#BD8B30", "26": "#008DD0", "27": "#819C4E", "33": "#AF7B86", "33a": "#AF7B86", 
  "38": "#E1771E", "41": "#D2232B", "43": "#33A0C4", "45": "#D2232B", "46": "#33A0C4", 
  "50": "#00CC00", "70": "#955336", "71": "#955336", "72": "#955336", "73": "#955336", 
  "77": "#955336", "101": "#DBAF3B", "102": "#48A643", "103": "#48A643", "104": "#DBAF3B", 
  "105": "#48A643", "106": "#48A643", "107": "#DBAF3B", "108": "#DBAF3B", "191": "#48A643", 
  "192": "#DBAF3B", "194": "#48A643", "150": "#DBAF3B", "N82": "#C67DB5", "N83": "#008DD0", "N84": "#C40653" 
};

const STANDARD_ROUTES_V3 = {
  '1': ['Auwiesen', 'Universität'], '2': ['solarCity', 'Universität'],
  '3': ['Landgutstraße', 'Trauner Kreuzung P&R'], '4': ['Landgutstraße', 'Schloss Traun'],
  '50': ['Pöstlingberg', 'Hauptplatz'], 'N82': ['solarCity', 'Universität'],
  'N84': ['Hauptbahnhof', 'Schloss Traun'], '11': ['Pichlinger See','Sporthalle Leonding'],
  '12': ['Karlhof', 'Auwiesen'], '17': ['Hitzing', 'Fernheizkraftwerk'], 
  '19': ['Pichlinger See', 'Fernheizkraftwerk'], '25': ['Oed', 'Karlhof'],
  '26': ['St. Margarethen', 'Stadion'], '27': ['Fernheizkraftwerk', 'Chemiepark'],
  '33': ['Riesenhof', 'Pleschinger See'], '33a': ['Rudolfstraße', 'Plesching'],
  '38': ['Rudolfstraße', 'Jäger im Tal'], '41': ['Hessenplatz', 'Baintwiese'],
  '43': ['Hessenplatz', 'Stadtfriedhof'], '45': ['Froschberg', 'Stieglbauernstraße'],
  '46': ['Hafenportal', 'Froschberg'], '70': ['Stadtfriedhof', 'Schiffswerft'],
  '71': ['Baintwiese', 'Industriezeile'], '72': ['Schiffswerft', 'Stadtfriedhof'],
  '73': ['Fernheizkraftwerk', 'Baintwiese'], '77': ['Universität', 'Hauptbahnhof'],
  '108': ['Simonystraße', 'Lunzerstraße Ost']
};

/* --- GOOGLE FONT LOADER --- */
const loadGoogleFontV3 = (fontName) => {
  if (!fontName || ['Arial','Verdana','Helvetica','sans-serif','serif','monospace'].includes(fontName)) return;
  const id = `font-v3-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id; link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;600;700;800&display=swap`;
  document.head.appendChild(link);
};

/* --- EDITOR --- */
class LinzMonitorCardEditorV3 extends HTMLElement {
  setConfig(config) { this._config = config; this.render(); }
  set hass(hass) { this._hass = hass; if (!this._initialized) { this.render(); this._initialized = true; } }
  render() {
    if (!this._hass || !this._config) return;
    const entities = Object.keys(this._hass.states).filter(k => k.includes('linz_ag') || this._hass.states[k].attributes?.departureList).sort();
    const badgeRound = this._config.badge_round !== false;

    this.innerHTML = `
      <div class="card-config" style="padding:10px;">
        <div style="margin-bottom:10px;"><label style="font-weight:bold; display:block;">Haltestelle</label>
          <select id="entity" style="width:100%; padding:8px; background:#222; color:white; border:1px solid #444; border-radius:4px;">
            <option value="">Wählen...</option>
            ${entities.map(e => `<option value="${e}" ${this._config.entity === e ? 'selected' : ''}>${e}</option>`).join('')}
          </select>
        </div>
        <div style="margin-bottom:10px;"><label style="font-weight:bold; display:block;">Name (Optional)</label>
          <input id="stop_name_override" type="text" value="${this._config.stop_name_override || ''}" placeholder="Eigener Name..." style="width:100%; padding:8px; background:#222; color:white; border:1px solid #444; border-radius:4px;">
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px; background:#333; padding:8px; border-radius:4px;">
           <div><label style="font-weight:bold; display:block;">Badge Größe (px)</label><input id="badge_size" type="number" value="${this._config.badge_size || 24}" style="width:100%; padding:8px; background:#222; color:white; border:1px solid #444; border-radius:4px;"></div>
           <div style="display:flex; align-items:flex-end;"><label style="display:flex; align-items:center; gap:8px; cursor:pointer;"><input id="badge_round" type="checkbox" ${badgeRound ? 'checked' : ''} style="transform:scale(1.2);"><span style="font-weight:700;">Kreis / Rund</span></label></div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
          <div><label style="font-weight:bold; display:block;">Filter (Linien)</label><input id="filter" type="text" value="${this._config.filter || ''}" placeholder="z.B. 1, 2" style="width:100%; padding:8px; background:#222; color:white; border:1px solid #444; border-radius:4px;"></div>
          <div><label style="font-weight:bold; display:block;">Sortierung</label>
            <select id="sortierung" style="width:100%; padding:8px; background:#222; color:white; border:1px solid #444; border-radius:4px;">
              <option value="echtzeit" ${this._config.sortierung === "echtzeit" ? 'selected' : ''}>Echtzeit</option>
              <option value="plan" ${this._config.sortierung === "plan" ? 'selected' : ''}>Plan</option>
            </select>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
          <div><label style="font-weight:bold; display:block;">Zeilen</label><input id="anzahl" type="number" value="${this._config.anzahl || 5}" style="width:100%; padding:8px; background:#222; color:white; border:1px solid #444; border-radius:4px;"></div>
          <div><label style="font-weight:bold; display:block;">Zeilenhöhe</label><input id="row_height" type="number" value="${this._config.row_height || 32}" style="width:100%; padding:8px; background:#222; color:white; border:1px solid #444; border-radius:4px;"></div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
          <div><label style="font-weight:bold; display:block;">Schrift Zeit</label><input id="font_size" type="number" value="${this._config.font_size || 14}" style="width:100%; padding:8px; background:#222; color:white; border:1px solid #444; border-radius:4px;"></div>
          <div><label style="font-weight:bold; display:block;">Schrift Ziel</label><input id="dest_size" type="number" value="${this._config.dest_size || 14}" style="width:100%; padding:8px; background:#222; color:white; border:1px solid #444; border-radius:4px;"></div>
        </div>
        <div><label style="font-weight:bold; display:block;">Google Font (Name)</label><input id="font_family" type="text" value="${this._config.font_family || ''}" placeholder="z.B. Oswald, Roboto..." style="width:100%; padding:8px; background:#222; color:white; border:1px solid #444; border-radius:4px;"></div>
      </div>
    `;
    this.querySelectorAll("select, input").forEach(el => el.addEventListener("change", (ev) => this._update(ev)));
  }
  _update(ev) {
    const t = ev.target;
    let value = (t.type === "checkbox") ? t.checked : (t.type === "number" ? Number(t.value) : t.value);
    const newConfig = { ...this._config, [t.id]: value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: newConfig }, bubbles: true, composed: true }));
  }
}
if (!customElements.get("linz-monitor-card-editor-v3")) { customElements.define("linz-monitor-card-editor-v3", LinzMonitorCardEditorV3); }

/* --- CARD --- */
class LinzMonitorCardV3 extends HTMLElement {
  static getConfigElement() { return document.createElement("linz-monitor-card-editor-v3"); }
  constructor() { super(); this._gone_mem = new Map(); }

  setConfig(config) {
    this._config = { 
      entity: "sensor.linz_ag_monitor",
      anzahl: 5, row_height: 32, font_size: 14, dest_size: 14,
      sortierung: "echtzeit", stop_name_override: "", filter: "",
      font_family: "", badge_size: 24, badge_round: true, ...config 
    };
    if (this._config.font_family) loadGoogleFontV3(this._config.font_family);
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config.entity || !hass.states[this._config.entity]) {
      if (!this.querySelector("ha-card")) {
        this.innerHTML = `<ha-card style="padding:20px;color:white;background:var(--ha-card-background,var(--card-background-color,#1c1c1c));">Bitte Haltestelle wählen.</ha-card>`;
      }
      return;
    }

    const state = hass.states[this._config.entity];
    const nowTs = Date.now();
    let departures = [...(state.attributes.departureList || [])];

    // Filter Logic
    const matchesFilter = (line) => {
      if (!this._config.filter) return true;
      const filters = this._config.filter.split(',').map(f => f.trim().toLowerCase()).filter(Boolean);
      if (filters.length === 0) return true;
      const l = (line || "").toLowerCase();
      return filters.includes(l) || filters.includes(l.replace('*', ''));
    };
    departures = departures.filter(d => matchesFilter(d.line));

    // Memory Logic
    const currentKeys = new Set(departures.map(d => `${d.line}-${d.scheduled}-${d.direction}`));
    if (this._lastRaw) {
      this._lastRaw.forEach(old => {
        const key = `${old.line}-${old.scheduled}-${old.direction}`;
        if (matchesFilter(old.line) && !currentKeys.has(key) && old.countdown <= 1 && old.countdown >= 0 && !this._gone_mem.has(key)) {
          this._gone_mem.set(key, { ...old, goneAt: nowTs });
        }
      });
    }
    this._lastRaw = departures;
    for (const [key, val] of this._gone_mem) { if (nowTs - val.goneAt > 10000) this._gone_mem.delete(key); }
    const combined = [...departures];
    this._gone_mem.forEach(val => combined.push({ ...val, isGone: true }));

    // --- NEUE SORTIERUNG (UNIFIED TIME SORT FÜR V3) ---
    const getSortTime = (d) => {
      const [h, m] = d.scheduled.split(':').map(Number);
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      let schedMins = h * 60 + m;
      if (schedMins < (nowMins - 180)) schedMins += 1440;
      
      // Wenn wir "Echtzeit" wollen und ein Countdown da ist -> Nimm (Jetzt + Countdown)
      if (this._config.sortierung !== "plan" && typeof d.countdown === 'number') {
         return nowMins + d.countdown;
      }
      // Fallback: Planzeit (Geisterbusse reihen sich hier richtig ein)
      return schedMins;
    };

    combined.sort((a, b) => getSortTime(a) - getSortTime(b));

    this.render(state, combined);
  }

  render(state, departures) {
    const ROW_H = this._config.row_height;
    const TIME_S = this._config.font_size;
    const DEST_S = this._config.dest_size || 14;
    const B_SIZE = this._config.badge_size || 24; 
    const B_ROUND = this._config.badge_round !== false; 
    const B_RADIUS = B_ROUND ? "50%" : "3px"; 
    const B_FONT = Math.round(B_SIZE * 0.60); 

    const FONT = this._config.font_family ? `'${this._config.font_family}', sans-serif` : "'Exo 2', sans-serif";

    if (!this.querySelector("ha-card") || (this.querySelector("ha-card")?.innerText || "").includes("Bitte Haltestelle")) {
      this.innerHTML = `
        <style>
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
          
          /* SCROLL PING PONG */
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
          
          /* ALERT STYLE (Rot/Weiss) */
          .alert-style { background: #d32f2f; color: white !important; border: 1px solid #ff8a80; border-radius: 4px; padding: 0 4px; font-weight: 800; }
        </style>
        <ha-card>
          <div class="title-area">
            <img class="title-icon" src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Zeichen_224_-_Haltestelle%2C_StVO_2017.svg/1200px-Zeichen_224_-_Haltestelle%2C_StVO_2017.svg.png">
            <span class="stop-name"></span>
          </div>
          <table><tbody id="list"></tbody></table>
        </ha-card>
      `;
    }

    const list = this.querySelector("#list");
    const defaultName = (state.attributes.stop_name || "").replace(/Linz\/Donau|Leonding|Linz/gi, "").trim();
    this.querySelector(".stop-name").innerText = this._config.stop_name_override || defaultName;

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
      const isStandard = STANDARD_ROUTES_V3[cleanL]?.includes(d.direction);
      let lineT = d.line;
      if (!isStandard && STANDARD_ROUTES_V3[cleanL]) {
        const dest = d.direction.toLowerCase();
        if ((cleanL === "3" || cleanL === "3a") && (dest.includes("neue welt") || dest.includes("remise kleinmünchen"))) lineT = cleanL + "a";
        else lineT = cleanL + "*";
      }

      if (!row) {
        row = document.createElement("tr");
        row.setAttribute("data-id", rowId);
        row.innerHTML = `<td class="col-line"><div class="badge"></div></td><td class="col-dest"><div class="dest-text"></div><div class="info-overlay"><span style="margin-right:5px">⚠️</span><div class="marquee-wrap"><div class="marquee-text"></div></div></div></td><td class="col-time"></td>`;
        list.appendChild(row);
        row._state = 'dest'; row._next = Date.now() + 10000;
      }

      if (d.isGone) row.className = 'is-gone';
      else if (isCancelled) row.className = 'is-cancelled';
      else row.className = '';

      const b = row.querySelector(".badge");
      if(b.innerText !== lineT) b.innerText = lineT;
      b.style.background = LINE_COLORS_V3[cleanL] || "#444";
      b.classList.toggle("blink-badge", isNow);
      b.style.borderRadius = B_RADIUS; 

      const timeCol = row.querySelector(".col-time");
      const delayText = (!d.isGone && !isCancelled && d.delay > 0) ? `<span class="delay-red">(+${d.delay})</span>` : "";

      if (isCancelled) timeCol.innerHTML = `<span style="text-decoration: line-through; color: #ff5252; opacity: 0.9;">${d.scheduled}</span>`;
      else if (isNow) timeCol.innerHTML = `<div style="display:flex;justify-content:flex-end;"><img src="https://www.irmscher.at/linzag/linzlinien-z.png" style="width:${Math.round(B_SIZE*0.8)}px;height:${Math.round(B_SIZE*0.8)}px;object-fit:contain;"></div>`;
      else if (d.isGone || d.countdown >= 45) timeCol.innerHTML = `${d.scheduled}`;
      else timeCol.innerHTML = `${delayText}${d.countdown}`;

      const destEl = row.querySelector(".dest-text");
      if(destEl.innerText !== d.direction) destEl.innerText = d.direction;
      destEl.style.fontSize = `${DEST_S}px`;

      // CHECK FOR SCROLL (Ping Pong)
      const col = row.querySelector(".col-dest");
      if (col && destEl) {
         if (destEl.scrollWidth > col.offsetWidth) {
            const diff = col.offsetWidth - destEl.scrollWidth;
            destEl.style.setProperty('--scroll-dist', `${diff - 5}px`);
            destEl.classList.add("ping-pong-scroll");
         } else {
            destEl.classList.remove("ping-pong-scroll");
         }
      }

      // LAUFTEXT / ALERT
      const overlay = row.querySelector(".info-overlay");
      const marquee = row.querySelector(".marquee-text");
      const wrap = row.querySelector(".marquee-wrap");

      const hideDest = (shouldHide) => {
         if (shouldHide) destEl.style.opacity = "0";
         else destEl.style.opacity = "1";
      };

      if (isCancelled) {
        const alarmMsg = "FAHRT FÄLLT AUS";
        if (marquee.innerText !== alarmMsg) { 
            marquee.innerText = alarmMsg; 
            marquee.className = "marquee-text alert-style"; 
        }
        
        if (Date.now() > row._next) {
          row._state = (row._state === 'dest') ? 'warn' : 'dest';
          row._next = Date.now() + 5000;
          if (row._state === 'warn') { 
             overlay.classList.add("visible"); 
             wrap.classList.add("animating"); 
             hideDest(true);
          } else { 
             overlay.classList.remove("visible"); 
             wrap.classList.remove("animating");
             hideDest(false);
          }
        }
      } else if (d.infos && d.infos.length > 5 && !isNow && !d.isGone) {
        const infoText = d.infos.replace(/\n/g, " ").replace("Niederflurfahrzeug", "").trim();
        if (marquee.innerText !== infoText) { marquee.innerText = infoText; marquee.className = "marquee-text"; }
        const duration = Math.max(7, infoText.length * 0.22);
        if (Date.now() > row._next) {
          if (row._state === 'dest') {
             row._state = 'info'; row._next = Date.now() + (duration * 1000) + 500;
             overlay.classList.add("visible"); 
             wrap.classList.add("animating"); 
             marquee.style.animationDuration = `${duration}s`;
             hideDest(true);
          } else {
             row._state = 'dest'; row._next = Date.now() + 10000;
             overlay.classList.remove("visible"); 
             wrap.classList.remove("animating");
             hideDest(false);
          }
        }
      } else {
        overlay.classList.remove("visible");
        hideDest(false);
      }
    });

    Array.from(list.children).forEach(c => {
      if (!activeIds.includes(c.getAttribute("data-id"))) list.removeChild(c);
    });
  }
  getCardSize() { return (this._config.anzahl || 5) + 1; }
}

if (!customElements.get("linz-monitor-card-v3")) {
  customElements.define("linz-monitor-card-v3", LinzMonitorCardV3);
}

window.customCards = window.customCards || [];
window.customCards.push({ 
  type: "linz-monitor-card-v3", 
  name: "Linz AG Monitor - V3 - Mini", 
  description: "LinzAG Linien Abfahrtsmonitor (Mini)",
  preview: true 
});
