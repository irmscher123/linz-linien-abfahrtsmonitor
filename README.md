# 🚋 Linz Linien Abfahrtsmonitor

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![version](https://img.shields.io/badge/version-1.2-blue.svg?style=for-the-badge)]()
[![maintainer](https://img.shields.io/badge/maintainer-irmscher123-green.svg?style=for-the-badge)]()
[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/irmscher)



<img src="https://raw.githubusercontent.com/irmscher123/linz-linien-abfahrtsmonitor/main/pictures/logo2026.png" width="200" alt="Linz Linien Logo">

<img src="https://raw.githubusercontent.com/irmscher123/linz-linien-card/main/pictures/dashboards.png" width="800" alt="Linz Linien Dashboards">

**Der moderne Abfahrtsmonitor für Home Assistant.**  
Live‑Daten der Linz AG Linien, smarte Hybrid-Berechnung, einfache Einrichtung und hochgradig anpassbare Dashboard‑Karten.

---

## 🚀 NEU im Major Update (v1.0)
* **Hybrid-Engine (GTFS + Live):** Kombiniert den lokalen Offline-Fahrplan (GTFS) mit der Linz AG Echtzeit-API. So werden weit in die Zukunft reichende Fahrten angezeigt, ohne das API-Limit (40 Einträge) zu sprengen.
* **Vom Sensor zum "Gerät":** Pro Haltestelle wird nun ein echtes Home Assistant *Gerät (Device)* angelegt, das automatisch **5 übersichtliche Sensoren** für die nächsten 5 Abfahrten enthält.
* **Klartext-Anzeige:** Keine nackten Zahlen mehr! Sensoren zeigen direkt lesbaren Text (z.B. `1 Universität 14:30 (5 Min)` oder `3 Traun (Jetzt)`) – perfekt für Apple Watch oder kompakte Dashboards.
* **Saubere Namen & Duplikat-Filter:** Unerwünschte Zusätze wie *"Linz/Donau"* oder *"Leonding"* werden aus Zielen herausgefiltert. Die clevere Suche zeigt jede Haltestelle nur noch exakt einmal an.
* **10-Sekunden Live-Sync:** Ein zentraler DataCoordinator aktualisiert die Echtzeitdaten exakt alle 10 Sekunden schonend für alle Sensoren gleichzeitig.

---

## ✨ Features

- ⚡ Echtzeit‑Daten inkl. Verspätungen und Baustellen-Infos  
- 🔍 Smart Search für Haltestellen (kein Suchen nach kryptischen IDs)
- 🗄️ Automatisches, lokales Datenbank-Management (`VACUUM` für minimalen Speicherplatz)
- 🎨 Vier Design‑Varianten (Maxi, Midi, Mini, LED Wall) in einer einzigen flexiblen Karte zusammengeführt  
- 📱 Responsive: Perfekt für Tablets, Wallpanels & Smartphones  
- ⚙️ Komplette UI‑Konfiguration via Lovelace Editor

---

## ⚙️ Einrichtung — 1) Integration hinzufügen (wichtig: zuerst) 🚦

Bevor Sie Dashboard‑Karten nutzen, fügen Sie bitte zunächst die Integration hinzu.

1. Gehen Sie zu **Einstellungen** > **Geräte & Dienste** > **Integration hinzufügen**.  
2. Suchen Sie nach **Linz AG Monitor**.  
3. Geben Sie den Namen der Haltestelle ein (z. B. `Simonystraße`).  
4. Wählen Sie den korrekten Treffer aus der Liste.  
5. **Fertig:** Sie haben nun ein neues *Gerät*, das 5 Sensoren enthält (z.B. `sensor.simonystrasse_nachste_abfahrt`, `sensor.simonystrasse_abfahrt_2`, etc.).

> **WICHTIG für das Dashboard:** Der Sensor **"Nächste Abfahrt"** (`sensor.ihre_haltestelle_nachste_abfahrt`) enthält im Hintergrund die unsichtbaren `departureList`-Attribute für die Custom Cards. Wählen Sie in den Lovelace-Karten immer diesen ersten Sensor aus!

---

## 📥 Dashboard‑Karten (separates Repo) 🗂️

Die Dashboard‑Karten (UI/JS‑Dateien) werden für eine saubere Code-Basis in einem separaten Repository verwaltet:  
👉 **[github.com/irmscher123/linz-linien-card](https://github.com/irmscher123/linz-linien-card)**

**Installationsmöglichkeiten für die Dashboard‑Karten:**
- **Option 1 — HACS (empfohlen):**  
  Fügen Sie das UI‑Repo als "Custom Repository" in HACS hinzu (Kategorie: Lovelace / Frontend) und installieren Sie die Karte.  
- **Option 2 — Manuell (Download Raw):**  
  Laden Sie `linz-monitor-combined.js` herunter und speichern Sie die Datei in `/config/www/`. Fügen Sie sie in Lovelace unter Ressourcen als *JavaScript Module* hinzu (`/local/linz-monitor-combined.js`).  

*Hinweis zur Migration:* Falls Sie noch die alten separaten v1/v2/v3 JS-Dateien nutzen, entfernen Sie diese bitte aus Ihren Ressourcen und nutzen Sie ab sofort nur noch die neue `linz-monitor-combined.js`.

---

## 🖼️ Vorschau der Layouts

| Design V1 (Maxi) | Design V2 (Midi) | Design V3 (Mini) | LED-Wall |
| :---: | :---: | :---: | :---: |
| ![v1 Preview](https://raw.githubusercontent.com/irmscher123/linz-linien-card/main/pictures/v1.png) | ![v2 Preview](https://raw.githubusercontent.com/irmscher123/linz-linien-card/main/pictures/v2.png) | ![v3 Preview](https://raw.githubusercontent.com/irmscher123/linz-linien-card/main/pictures/v3.png) | ![led-wall Preview](https://raw.githubusercontent.com/irmscher123/linz-linien-card/main/pictures/ledwall.png) |

---

## ⚙️ Verwendung & Konfiguration im Dashboard

Eine Karte, vier Varianten! Sie können die Karte komplett grafisch im Home Assistant UI-Editor anpassen (inklusive dynamischer Linien- und Richtungs-Filter per Klick!). 

Falls Sie den YAML-Modus bevorzugen, hier ein Beispiel für das kompakte **Midi-Layout**:

```yaml
type: custom:linz-monitor-combined
entity: sensor.simonystrasse_nachste_abfahrt
layout: midi
anzahl: 8
row_height: 38
font_size: 20
dest_size: 18
filter: "1,2"
sortierung: "echtzeit"
