# 🚋 Linz Linien Abfahrtsmonitor

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![version](https://img.shields.io/badge/version-1.5.7-blue.svg?style=for-the-badge)]()
[![maintainer](https://img.shields.io/badge/maintainer-irmscher123-green.svg?style=for-the-badge)]()
[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/irmscher)

<img src="https://raw.githubusercontent.com/irmscher123/linz-linien-abfahrtsmonitor/main/pictures/logo2026.png" width="200" alt="Linz Linien Logo">

<img src="https://raw.githubusercontent.com/irmscher123/linz-linien-abfahrtsmonitor/main/pictures/dashboards.png" width="800" alt="Linz Linien Dashboards">

**Der moderne Abfahrtsmonitor für Home Assistant.**  
Live‑Daten der Linz AG Linien, smarte Einrichtung per Text- oder Kartensuche und hochgradig anpassbare Dashboard‑Karten.

---

## 🚀 NEU in dieser Version
* **100% Live-API & Kartensuche:** Kein lokaler GTFS-Datenbank-Ballast mehr! Die Integration läuft nun komplett über die direkte Linz AG API, was sie extrem schnell und ressourcenschonend macht. Haltestellen können jetzt auch bequem über eine interaktive Umkreissuche (Karte) gefunden werden.
* **Vom Sensor zum "Gerät":** Pro Haltestelle wird nun ein echtes Home Assistant *Gerät (Device)* angelegt, das automatisch **5 übersichtliche Sensoren** für die nächsten 5 Abfahrten enthält.
* **Klartext-Anzeige:** Keine nackten Zahlen mehr! Sensoren zeigen direkt lesbaren Text (z.B. `1 Universität 14:30 (5 Min)` oder `3 Traun (Jetzt)`) – perfekt für Apple Watch oder kompakte Dashboards.
* **Saubere Namen & Duplikat-Filter:** Unerwünschte Zusätze wie *"Linz/Donau"* oder *"Leonding"* werden aus Zielen herausgefiltert. Die clevere Suche zeigt jede Haltestelle nur noch exakt einmal an.
* **Smartes Live-Sync:** Ein zentraler DataCoordinator aktualisiert die Echtzeitdaten exakt alle 60 Sekunden schonend für alle Sensoren gleichzeitig, ohne das API-Limit zu sprengen.

---

## ✨ Features

- ⚡ 100% Echtzeit‑Daten inkl. Verspätungen und Baustellen-Infos  
- 🔍 Smart Search für Haltestellen (Textsuche oder interaktive GPS-Umkreissuche)
- 🎨 Vier Design‑Varianten (Maxi, Midi, Mini, LED Wall) in einer einzigen flexiblen Karte zusammengeführt  
- 📱 Responsive: Perfekt für Tablets, Wallpanels & Smartphones  
- ⚙️ Komplette UI‑Konfiguration via Lovelace Editor

---

## ⚙️ Einrichtung — 1) Integration hinzufügen (wichtig: zuerst) 🚦

Bevor Sie Dashboard‑Karten nutzen, fügen Sie bitte zunächst die Integration hinzu.

1. Gehen Sie zu **Einstellungen** > **Geräte & Dienste** > **Integration hinzufügen**.  
2. Suchen Sie nach **Linz AG Monitor**.  
3. Wählen Sie zwischen der **klassischen Textsuche** oder der **interaktiven Kartensuche**.
4. Wählen Sie den korrekten Treffer aus dem Dropdown-Menü aus.  
5. **Fertig:** Sie haben nun ein neues *Gerät*, das 5 Sensoren enthält (z.B. `sensor.haltestelle_hauptbahnhof_nachste_abfahrt`, `sensor.haltestelle_hauptbahnhof_abfahrt_2`, etc.).

> **WICHTIG für das Dashboard:** Der Sensor **"Nächste Abfahrt"** (`sensor.haltestelle_ihre_station_nachste_abfahrt`) enthält im Hintergrund die unsichtbaren `departureList`-Attribute für die Custom Cards. Wählen Sie in den Lovelace-Karten immer diesen ersten Sensor aus!

---

## 📥 Dashboard‑Karten (Integriert) 🗂️

Die Custom Lovelace Card (`linz-linien-combined.js`) ist jetzt direkt in dieser Integration enthalten und wird **automatisch** geladen. Eine manuelle Installation der Karte oder ein separates Repository ist nicht mehr erforderlich!

*Hinweis zur Migration:* Falls Sie noch die alten separaten v1/v2/v3 JS-Dateien nutzen, entfernen Sie diese bitte aus Ihren Ressourcen und nutzen Sie ab sofort nur noch die neue kombinierte Karte.

---

## 🖼️ Vorschau der Layouts

| Design V1 (Maxi) | Design V2 (Midi) | Design V3 (Mini) | LED-Wall |
| :---: | :---: | :---: | :---: |
| ![v1 Preview](https://raw.githubusercontent.com/irmscher123/linz-linien-abfahrtsmonitor/main/pictures/v1.png) | ![v2 Preview](https://raw.githubusercontent.com/irmscher123/linz-linien-abfahrtsmonitor/main/pictures/v2.png) | ![v3 Preview](https://raw.githubusercontent.com/irmscher123/linz-linien-abfahrtsmonitor/main/pictures/v3.png) | ![led-wall Preview](https://raw.githubusercontent.com/irmscher123/linz-linien-abfahrtsmonitor/main/pictures/ledwall.png) |

---

## ⚙️ Verwendung & Konfiguration im Dashboard

Eine Karte, vier Varianten! Sie können die Karte komplett grafisch im Home Assistant UI-Editor anpassen (inklusive dynamischer Linien- und Richtungs-Filter per Klick!). 

Falls Sie den YAML-Modus bevorzugen, hier ein Beispiel für das kompakte **Midi-Layout**:

```yaml
type: custom:linz-monitor-combined
entity: sensor.haltestelle_hauptbahnhof_nachste_abfahrt
layout: midi
anzahl: 8
row_height: 38
font_size: 20
dest_size: 18
filter: "1,2"
sortierung: "echtzeit"
