# 🚋 Linz Linien Abfahrtsmonitor

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![version](https://img.shields.io/badge/version-0.3a-blue.svg?style=for-the-badge)]()
[![maintainer](https://img.shields.io/badge/maintainer-irmscher123-green.svg?style=for-the-badge)]()


<img src="pictures/logo.png" width="200" alt="Linz Linien Logo">

<img src="pictures/dashboards.png" width="800" alt="Linz Linien Dashboards">

**Der moderne Abfahrtsmonitor für Home Assistant.**  
Live‑Daten der Linz AG Linien, einfache Einrichtung und wunderschöne Dashboard‑Karten.

---

## ✨ Features

- ⚡ Echtzeit‑Daten
- 🔍 Smart Search
- 🎨 Drei Design‑Varianten (Mini / Midi / Maxi) — jetzt als eine kombinierte Karte
- 📱 Responsive für Tablets & Smartphones
- ⚙️ UI‑Konfiguration via Lovelace Editor

---

## 🆕 WICHTIG: Änderung — Alle Dashboard‑Varianten kombiniert

Ab Version 0.3a sind die bisherigen drei separaten Dashboard‑Skripte (linz-monitor-card_v1.js, _v2.js, _v3.js) in einer einzigen, kombinierten Datei zusammengeführt:  

- Neue Datei: `linz-monitor-combined.js`  
- Vorteil: Nur noch eine Ressource zu laden, zentralisierte Konfiguration, einfache Wartung.  
- Die alten Dateien sind veraltet. Bitte entfernen Sie in Ihren Dashboards / Ressourcen alle Verweise auf `/local/linz-monitor-card_v1.js`, `/local/linz-monitor-card_v2.js` und `/local/linz-monitor-card_v3.js`.

---

## 🖼️ Vorschau

| Design V1 (Maxi) | Design V2 (Midi) | Design V3 (Mini) |
| :---: | :---: | :---: |
| ![v1 Preview](pictures/v1.png) | ![v2 Preview](pictures/v2.png) | ![v3 Preview](pictures/v3.png) |

---

## 📥 Installation

### Option A — Über HACS (Empfohlen)
1. Repository in HACS als Custom Repository hinzufügen:
   - URL: `https://github.com/irmscher123/linz-linien-abfahrtsmonitor`
   - Kategorie: `Lovelace`
2. In HACS → Frontend suchen Sie die Karte und installieren Sie sie.
3. Starten Sie Home Assistant neu.
4. Die Ressource wird automatisch registriert (falls HACS dies nicht automatisch macht: siehe manueller Schritt unten).

### Option B — Manuell
1. Datei `linz-monitor-combined.js` in `/config/www/` hochladen.
2. Lovelace → Einstellungen → Dashboards → Ressourcen → Ressource hinzufügen:
   - URL: `/local/linz-monitor-combined.js`
   - Typ: JavaScript Module
3. Lovelace Cache leeren (Strg+F5) / Home Assistant neu starten.

---

## ⚙️ Verwendung & Konfiguration

Eine Karte, drei Varianten — wählen Sie per `version` welche Variante dargestellt wird. Alle Varianten nutzen dieselbe Resource.

Beispiel (v2 = Midi):
```yaml
type: custom:linz-monitor-card
version: v2
v2:
  entity: sensor.linz_ag_monitor
  anzahl: 8
  row_height: 38
  font_size: 20
  dest_size: 18
  filter: "1,2"
  sortierung: "echtzeit"
