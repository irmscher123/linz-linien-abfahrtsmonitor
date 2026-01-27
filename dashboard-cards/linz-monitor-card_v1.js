/* ---------------------------------------------------------
   LINZ MONITOR CARD v1 (Classic)
   --------------------------------------------------------- */

const LINE_COLORS = { 
  "1": "#EE3A80", "2": "#C67DB5", "3": "#A4238F", "3a": "#A4238F", "4": "#C40653", 
  "11": "#E1771E", "12": "#159655", "17": "#E1771E", "18": "#008DD0", "19": "#E9639F", 
  "25": "#BD8B30", "26": "#008DD0", "27": "#819C4E", "33": "#AF7B86", "33a": "#AF7B86", 
  "38": "#E1771E", "41": "#D2232B", "43": "#33A0C4", "45": "#D2232B", "46": "#33A0C4", 
  "50": "#00CC00", "70": "#955336", "71": "#955336", "72": "#955336", "73": "#955336", 
  "77": "#955336", "101": "#DBAF3B", "102": "#48A643", "103": "#48A643", "104": "#DBAF3B", 
  "105": "#48A643", "106": "#48A643", "107": "#DBAF3B", "108": "#DBAF3B", "191": "#48A643", 
  "192": "#DBAF3B", "194": "#48A643", "150": "#DBAF3B", "N82": "#C67DB5", "N83": "#008DD0", "N84": "#C40653" 
};

const STANDARD_ROUTES = {
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
const loadGoogleFont = (fontName) => {
  if (!fontName || ['Arial','Verdana','Helvetica','sans-serif','serif','monospace'].includes(fontName)) return;
  const id = `font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;600;700;800&display=swap`;
  document.head.appendChild(link);
};

/* --- EDITOR --- */
class LinzMonitorCardEditor extends HTMLElement {
  setConfig(config) { this._config = config; this.render(); }
  set hass(hass) { this._hass = hass; if (!this._initialized) { this.render(); this._initialized = true; } }

  render() {
    if (!this._hass || !this._config) return;
    const entities = Object.keys(this._hass.states)
      .filter(k => k.includes('linz_ag') || this._hass.states[k].attributes?.departureList)
      .sort();

    const showInfo = this._config.show_info !== false; // default true
    const badgeRound = this._config.badge_round !== false; // default true

    this.innerHTML = `
      <div class="card-config" style="padding:10px;">
        <div style="margin-bottom:10px;">
          <label style="font-weight:bold; display:block;">Haltestelle</label>
          <select id="entity" style="width:100%; padding:8px; background:#222; color:white; border:1px solid #444; border-radius:4px;">
            <option value="">Wählen...</option>
            ${entities.map(e => `<option value="${e}" ${this._config.entity === e ? 'selected' : ''}>${e}</option>`).join('')}
          </select>
        </div>

        <div style="margin-bottom:10px;">
          <label style="font-weight:bold; display:block;">Name (Optional)</label>
          <input id="stop_name_override" type="text" value="${this._config.stop_name_override || ''}" placeholder="Eigener Name..." style="width:100%; padding:8px; background:#222; color:white; border:1px solid #444; border-radius:4px;">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
          <div>
            <label style="font-weight:bold; display:block;">Filter (Linien)</label>
            <input id="filter" type="text" value="${this._config.filter || ''}" placeholder="z.B. 1, 2" style="width:100%; padding:8px; background:#222; color:white; border:1px solid #444; border-radius:4px;">
          </div>
          <div>
            <label style="font-weight:bold; display:block;">Sortierung</label>
            <select id="sortierung" style="width:100%; padding:8px; background:#222; color:white; border:1px solid #444; border-radius:4px;">
              <option value="echtzeit" ${this._config.sortierung === "echtzeit" ? 'selected' : ''}>Echtzeit</option>
              <option value="plan" ${this._config.sortierung === "plan" ? 'selected' : ''}>Plan</option>
            </select>
          </div>
        </div>

        <div style="margin-bottom:10px;">
          <label style="font-weight:bold; display:block;">Anzahl Zeilen</label>
          <input id="anzahl" type="number" value="${this._config.anzahl || 7}" style="width:100%; padding:8px; background:#222; color:white; border:1px solid #444; border-radius:4px;">
        </div>

        <div style="margin-bottom:10px;">
          <label style="font-weight:bold; display:block;">Google Font (Name)</label>
          <input id="font_family" type="text" value="${this._config.font_family || ''}" placeholder="z.B. Oswald, Roboto... (Leer = Standard)" style="width:100%; padding:8px; background:#222; color:white; border:1px solid #444; border-radius:4px;">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
          <label style="display:flex; align-items:center; gap:8px; background:#1a1a1a; border:1px solid #333; padding:10px; border-radius:6px; cursor:pointer;">
            <input id="show_info" type="checkbox" ${showInfo ? 'checked' : ''} style="transform:scale(1.2);">
            <span style="font-weight:700;">Info-Zeile anzeigen</span>
          </label>

          <label style="display:flex; align-items:center; gap:8px; background:#1a1a1a; border:1px solid #333; padding:10px; border-radius:6px; cursor:pointer;">
            <input id="badge_round" type="checkbox" ${badgeRound ? 'checked' : ''} style="transform:scale(1.2);">
            <span style="font-weight:700;">Badges rund</span>
          </label>
        </div>
      </div>
    `;

    this.querySelectorAll("select, input").forEach(el => {
      el.addEventListener("change", (ev) => this._update(ev));
    });
  }

  _update(ev) {
    const t = ev.target;
    let value;
    if (t.type === "checkbox") value = t.checked;
    else if (t.type === "number") value = Number(t.value);
    else value = t.value;

    const newConfig = { ...this._config, [t.id]: value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: newConfig }, bubbles: true, composed: true }));
  }
}
customElements.define("linz-monitor-card-editor", LinzMonitorCardEditor);

/* --- CARD --- */
class LinzMonitorCard extends HTMLElement {
  static getConfigElement() { return document.createElement("linz-monitor-card-editor"); }
  constructor() { super(); this._gone_mem = new Map(); }

  setConfig(config) {
    this._config = { 
      entity: "sensor.linz_ag_monitor",
      anzahl: 7,
      sortierung: "echtzeit",
      stop_name_override: "",
      filter: "",
      font_family: "",

      // NEW
      show_info: true,
      badge_round: true,

      ...config
    };
    if (this._config.font_family) loadGoogleFont(this._config.font_family);
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
    const now = Date.now();
    let departures = [...(state.attributes.departureList || [])];

    // FILTER
    const matchesFilter = (line) => {
      if (!this._config.filter) return true;
      const filters = this._config.filter.split(',').map(f => f.trim().toLowerCase()).filter(Boolean);
      if (filters.length === 0) return true;
      const l = (line || "").toLowerCase();
      return filters.includes(l) || filters.includes(l.replace('*', ''));
    };
    departures = departures.filter(d => matchesFilter(d.line));

    // MEMORY
    const currentKeys = new Set(departures.map(d => `${d.line}-${d.scheduled}-${d.direction}`));
    if (this._lastRaw) {
      this._lastRaw.forEach(old => {
        const key = `${old.line}-${old.scheduled}-${old.direction}`;
        if (matchesFilter(old.line) && !currentKeys.has(key) && old.countdown <= 1 && !this._gone_mem.has(key)) {
          this._gone_mem.set(key, { ...old, goneAt: now });
        }
      });
    }
    this._lastRaw = departures;
    for (const [key, val] of this._gone_mem) { if (now - val.goneAt > 15000) this._gone_mem.delete(key); }

    const combined = [...departures];
    this._gone_mem.forEach(val => combined.push({ ...val, isGone: true }));

    // SORTIERUNG (FIX: Dynamisch statt starr 18 Uhr)
    combined.sort((a, b) => {
      if (a.isGone && !b.isGone) return -1;
      if (!a.isGone && b.isGone) return 1;

      if (this._config.sortierung === "plan") {
        const getMins = (t) => {
          const [h, m] = t.split(':').map(Number);
          // HIER DIE ÄNDERUNG: Dynamischer Vergleich mit JETZT
          const nowD = new Date();
          const curMins = nowD.getHours() * 60 + nowD.getMinutes();
          let total = h * 60 + m;
          
          // Wenn die Abfahrtszeit viel kleiner ist als die aktuelle Zeit (minus 2h Puffer),
          // dann ist es "Morgen". (Ersetzt die starre "h < 5 && now > 18" Logik)
          if (total < (curMins - 120)) total += 1440;
          
          return total;
        };
        return getMins(a.scheduled) - getMins(b.scheduled);
      } else {
        return a.countdown - b.countdown;
      }
    });

    this.render(state, combined);
  }

  render(state, departures) {
    const FONT = this._config.font_family ? `'${this._config.font_family}', sans-serif` : "'Exo 2', sans-serif";
    const badgeRadius = (this._config.badge_round === false) ? 6 : 16;
    const showInfo = this._config.show_info !== false;

    if (!this.querySelector("ha-card") || (this.querySelector("ha-card")?.innerText || "").includes("Bitte Haltestelle")) {
      this.innerHTML = `
        <style>
          ha-card {
            background: var(--ha-card-background, var(--card-background-color, #1c1c1c));
            border-radius: 16px !important;
            padding: 12px !important;
            color: white !important;
            font-family: ${FONT} !important;
            overflow: hidden !important;

            height: 100%;
            width: 100%;
            box-sizing: border-box;

            display: flex;
            flex-direction: column;
            min-height: 0;
          }

          .header-box { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 8px; padding-bottom: 8px; flex-shrink: 0; }
          .stop-logo { height: 28px; width: 28px; object-fit: contain; }
          .stop-title { font-size: 22px; font-weight: 800; }

          .rows-container { display: flex; flex-direction: column; gap: 6px; flex: 1; overflow-y: auto; min-height: 0; }

          .row {
            display: flex; align-items: center;
            background: rgba(255,255,255,0.05);
            border-radius: 10px;
            padding: 5px 10px;
            position: relative;
            min-height: 48px;
            border-left: 4px solid transparent;
          }

          .line-badge {
            min-width: 40px;
            height: 32px;
            border-radius: ${badgeRadius}px;
            display: flex; align-items: center; justify-content: center;
            font-weight: 800; font-size: 18px; color: white; margin-right: 10px;
          }

          .main-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; justify-content: center; }

          .dest {
            font-size: 22px;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.2;
          }

          .count-box-wrapper { display: flex; flex-direction: column; align-items: flex-end; min-width: 80px; }

          .count-box {
            font-size: 25px;
            font-weight: 800;
            line-height: 1;
            display: flex;
            align-items: baseline;
            justify-content: flex-end;
            white-space: nowrap;
          }

          .time-small { font-size: 12px; color: #bbb; margin-top: 2px; }
          .delay-red { color: #ff5252; font-weight: 600; }
          .min-u { font-size: 13px; color: #777; margin-left: 3px; font-weight: 600; }
          .gone-txt { text-decoration: line-through; color: #777; }

          @keyframes bB { 0%, 100% { border-left-color: #4caf50; } 50% { border-left-color: transparent; } }

          .dots { display: flex; justify-content: flex-end; gap: 4px; height: 18px; align-items: center; padding-right: 5px;}
          .dots span { width: 7px; height: 7px; background: #4caf50; border-radius: 50%; animation: dAn 1.5s infinite; opacity: 0.2; }
          .dots span:nth-child(2) { animation-delay: 0.3s; }
          .dots span:nth-child(3) { animation-delay: 0.6s; }
          @keyframes dAn { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }

          .row-info {
            margin-top: 2px;
            background: rgba(0,0,0,0.3);
            border-radius: 4px;
            padding: 1px 6px;
            font-size: 12px;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 8px;
            overflow: hidden;
            font-weight: 600;
          }

          /* Option B: keine Inline-Farben, alles neutral */
          .row-info span { color: #ffffff; }

          .mq-w { flex: 1; overflow: hidden; white-space: nowrap; position: relative; height: 18px; }
          .mq-t { display: inline-block; padding-left: 100%; animation: mMo 25s linear infinite; will-change: transform; line-height: 18px; }
          @keyframes mMo { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }

          @media (max-width: 450px) {
            .line-badge { min-width: 35px; height: 28px; font-size: 16px; }
            .dest { font-size: 19px; }
            .count-box { font-size: 22px; }
          }
        </style>

        <ha-card>
          <div class="header-box">
            <img class="stop-logo" src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Zeichen_224_-_Haltestelle%2C_StVO_2017.svg/1200px-Zeichen_224_-_Haltestelle%2C_StVO_2017.svg.png">
            <div class="stop-title"></div>
          </div>
          <div class="rows-container"></div>
        </ha-card>
      `;
    } else {
      // CSS live anpassen (wenn User Toggles ändert)
      const badge = this.querySelector(".line-badge");
      if (badge) {
        const styleTag = this.querySelector("style");
        if (styleTag) {
          styleTag.textContent = styleTag.textContent.replace(/border-radius:\s*\d+px;\s*\/\*badge\*\*\*\//g, "");
        }
      }
      // einfacher: wird beim nächsten innerHTML-Neuaufbau sauber gesetzt,
      // aber wir setzen pro Row sowieso borderRadius weiter unten nochmal.
    }

    const container = this.querySelector(".rows-container");
    const stopTitle = this.querySelector(".stop-title");
    const defaultName = (state.attributes.stop_name || "").replace(/Linz\/Donau|Leonding|Linz/gi, "").trim();
    stopTitle.innerText = this._config.stop_name_override || defaultName;

    const visibleRows = departures.slice(0, this._config.anzahl);

    visibleRows.forEach((d) => {
      const rowId = `r-${d.line}-${d.direction}-${d.scheduled}`.replace(/[^a-z0-9]/gi, "");
      let rowEl = container.querySelector(`[data-id="${rowId}"]`);

      const isNow = d.countdown === 0 && !d.isGone;
      let timeVal;

      // DOTS STATT 0 MINUTEN
      if (isNow) {
        timeVal = `<div class="dots"><span></span><span></span><span></span></div>`;
      } else {
        timeVal = `${d.countdown}<span class="min-u">Min</span>`;
      }

      let metaVal = d.delay > 0 ? `${d.scheduled} <span class="delay-red">(+${d.delay}')</span>` : d.scheduled;

      const cleanL = d.line.replace("*", "");
      const isStandard = STANDARD_ROUTES[cleanL]?.includes(d.direction);
      let lineT = d.line;

      if (!isStandard && STANDARD_ROUTES[cleanL]) {
        const dest = d.direction.toLowerCase();
        if ((cleanL === "3" || cleanL === "3a") && (dest.includes("neue welt") || dest.includes("ferihumerstraße") || dest.includes("remise kleinmünchen"))) {
          lineT = cleanL + "a";
        } else {
          lineT = cleanL + "*";
        }
      }

      if (d.isGone) {
        timeVal = `<span class="gone-txt">${d.scheduled}</span>`;
        metaVal = "";
      }

      // Info HTML bauen (nur wenn Toggle an)
      let styledInfoHtml = "";
      if (showInfo) {
        const infoTextRaw = (d.infos || "").replace(/\n/g, " ").trim();
        if (infoTextRaw.length > 2 && !infoTextRaw.includes("Niederflur")) {
          const parts = infoTextRaw.split(/([.,;])/);

          // Option B: keine Farb-Logik, nur neutrale spans
          const buildColoredBlock = () => parts.map(part => `<span>${part}</span>`).join("");

          const block = buildColoredBlock();
          const separator = `<span> &nbsp;&nbsp; +++ &nbsp;&nbsp; </span>`;
          styledInfoHtml = `
            <div class="row-info">
              <span class="warn-icon">⚠️</span>
              <div class="mq-w"><div class="mq-t">${block}${separator}${block}</div></div>
            </div>
          `;
        }
      }

      if (!rowEl) {
        const tempRow = document.createElement("div");
        tempRow.setAttribute("data-id", rowId);
        tempRow.className = "row";

        tempRow.innerHTML = `
          <div class="line-badge" style="background:${LINE_COLORS[cleanL] || "#444"}">${lineT}</div>
          <div class="main-body">
            <div class="dest">${d.direction}</div>
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

        // Ziel ggf. ändern (falls sich Richtung ändert)
        const destEl = rowEl.querySelector(".dest");
        if (destEl && destEl.textContent !== d.direction) destEl.textContent = d.direction;

        // Info live updaten (Toggle + Text)
        if (infoArea) {
          if (infoArea.innerHTML !== styledInfoHtml) infoArea.innerHTML = styledInfoHtml;
        }

        // Badge Text/Color updaten
        if (badgeEl) {
          if (badgeEl.textContent !== lineT) badgeEl.textContent = lineT;
          badgeEl.style.background = LINE_COLORS[cleanL] || "#444";
        }
      }

      // Badge-Form live setzen (auch wenn schon existiert)
      const badgeEl2 = rowEl.querySelector(".line-badge");
      if (badgeEl2) badgeEl2.style.borderRadius = `${badgeRadius}px`;

      rowEl.style.opacity = d.isGone ? "0.5" : "1";
      rowEl.style.borderLeftColor = isNow ? "#4caf50" : (d.isGone ? "#d32f2f" : "transparent");
      rowEl.style.animation = isNow ? "bB 2s infinite" : "none";

      const destText = rowEl.querySelector(".dest");
      if (destText) destText.style.textDecoration = d.isGone ? "line-through" : "none";
    });

    const activeIds = visibleRows.map(d => `r-${d.line}-${d.direction}-${d.scheduled}`.replace(/[^a-z0-9]/gi, ""));
    Array.from(container.children).forEach(child => {
      if (!activeIds.includes(child.getAttribute("data-id"))) container.removeChild(child);
    });
  }
}

customElements.define("linz-monitor-card", LinzMonitorCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "linz-monitor-card",
  description: "LinzAG Linien Abfahrtsmonitor (normal)",
  name: "Linz AG Monitor - V1 - Klassisch",
  preview: true
});
