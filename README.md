# 🚋 Linz Linien Abfahrtsmonitor

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![version](https://img.shields.io/badge/version-0.3a-blue.svg?style=for-the-badge)]()
[![maintainer](https://img.shields.io/badge/maintainer-irmscher123-green.svg?style=for-the-badge)]()


<img src="pictures/logo.png" width="200" alt="Linz Linien Logo">

<img src="pictures/dashboards.png" width="800" alt="Linz Linien Dashboards">

**Der moderne Abfahrtsmonitor für Home Assistant.**  
Live-Daten der Linz AG Linien, einfache Einrichtung und wunderschöne Dashboard-Karten.

---

## ✨ Features

* **⚡ Echtzeit-Daten:** Direkte Anbindung an die Schnittstelle der Linz AG.  
* **🔍 Smart Search:** Suche einfach nach "Hauptplatz" oder "Goethekreuzung" – keine kryptischen IDs nötig!  
* **🎨 3 Design-Varianten:** Wähle zwischen "Mini", "Midi" und "Maxi".  
* **📱 Responsive:** Perfekt für Wall-Tablets und Smartphones.  
* **⚙️ UI Config:** Vollständige Einrichtung über die Home Assistant Benutzeroberfläche.

---

## ⚙️ Einrichtung — 1) Sensor hinzufügen (wichtig: zuerst)

Bevor Sie Dashboard‑Karten nutzen, fügen Sie bitte zunächst die Integration hinzu und erzeugen den Sensor mit departureList‑Attributen.

1. Gehe zu **Einstellungen** > **Geräte & Dienste** > **Integration hinzufügen**.  
2. Suche nach **Linz Linien Abfahrtsmonitor**.  
3. Gib den Namen der Haltestelle ein (z. B. `Simonystraße`).  
4. Wähle den korrekten Treffer aus der Liste.  
5. Fertig — du hast nun einen Sensor (z. B. `sensor.simonystrasse`), den du in den Dashboard‑Karten auswählst.

> Hinweis: Falls Sie die Karte ohne Sensor hinzufügen, zeigt sie keine Abfahrten an — daher zuerst Integration/Sensor anlegen.

---

## 🖼️ Vorschau

Die Integration kommt mit drei vorgefertigten Designs für dein Dashboard:

| Design V1 (Maxi) | Design V2 (Midi) | Design V3 (Mini) |
| :---: | :---: | :---: |
| *Maxiversion* | *Midiversion* | *Miniversion* |
| ![v1 Preview](pictures/v1.png) | ![v2 Preview](pictures/v2.png) | ![v3 Preview](pictures/v3.png) |

---

## 📥 Installation

### Option 1: Via HACS (Empfohlen)

1. Öffne HACS in Home Assistant.  
2. Gehe zu **Integrationen** > **Menü (drei Punkte)** > **Benutzerdefinierte Repositories**.  
3. Füge diese URL ein: `https://github.com/irmscher123/linz-linien-abfahrtsmonitor`  
4. Wähle die Kategorie **Integration**.  
5. Klicke auf **Hinzufügen** und dann auf **Herunterladen**.  
6. **Starte Home Assistant neu.**

### Option 2: Manuell

1. Lade das Repository als ZIP herunter.  
2. Kopiere den Ordner `custom_components/linz_ag_monitor` in deinen `/config/custom_components/` Ordner.  
3. Starte Home Assistant neu.

---

## 🆕 WICHTIG — Kombinierte Dashboard‑Karte

Ab Version **0.3a** sind die bisherigen drei separaten Dashboard‑Skripte (linz-monitor-card_v1.js, linz-monitor-card_v2.js, linz-monitor-card_v3.js) in einer einzigen Datei zusammengeführt:

- Neue Datei: `linz-monitor-combined.js`  
- Pfad im Repo (empfohlen): `dashboard-cards/linz-monitor-combined.js`  
- Rohlink (Beispiel):  
  `https://github.com/irmscher123/linz-linien-abfahrtsmonitor/blob/main/dashboard-cards/linz-monitor-combined.js`

Vorteile:
- Nur eine Ressource → weniger Fehlerquellen  
- Alle drei Layouts per config wählbar (version: v1|v2|v3)  
- Einfachere Pflege & Updates via HACS

---

## 2. 🛠️ Manuelle Einrichtung der Karten (Dashboard)

*Hinweis: Dies ist meist nur nötig, wenn die Karten nach der Installation nicht automatisch erscheinen.*

**Schritt 2.1: Dateien kopieren**
1. Lade die Datei `linz-monitor-combined.js` aus `dashboard-cards/` dieses Repositories herunter.  
2. Lade sie in deinen Home Assistant Ordner: `/config/www/` hoch.  
*(Hinweis: Wenn der Ordner `www` nicht existiert, erstelle ihn. Danach Home Assistant neu starten!)*

**Schritt 2.2: Ressource registrieren**
Damit Home Assistant die Datei kennt:
1. Gehe zu **Einstellungen** > **Dashboards**.  
2. Klicke oben rechts auf die drei Punkte `...` und wähle **Ressourcen**.  
3. Klicke auf **Ressource hinzufügen**.  
4. Trage folgendes ein:
   - **URL**: `/local/linz-monitor-combined.js`  
   - **Art**: JavaScript Modul  
5. Klicke auf **Erstellen**.

**Migration (falls vorherige V1/V2/V3 genutzt wurden)**
- Entferne alte Ressourcen‑Einträge:
  - `/local/linz-monitor-card_v1.js`
  - `/local/linz-monitor-card_v2.js`
  - `/local/linz-monitor-card_v3.js`
- Optional: alte Dateien in `deprecated/` verschieben, aber nicht parallel laden (vermeidet Namenskonflikte).

---

### 3. Dashboard Karte hinzufügen

Du musst keinen Code schreiben! Die Karte ist im Paket enthalten.

1. Gehe auf dein Dashboard und klicke auf **Karte hinzufügen**.  
2. Suche oben in der Lupe nach "Linz".  
3. Wähle dein Design (**V1**, **V2** oder **V3**) bzw. nutze YAML (Beispiele unten).  
4. Wähle im Editor deinen Sensor (z. B. `sensor.simonystrasse`). Fertig!

### 🛠️ Karte bearbeiten (Editor)
Du kannst die Einstellungen (Titel, Sensor, etc.) ganz einfach über den visuellen Editor ändern.

---

## ⚙️ Verwendung & Konfiguration (Beispiele)

Eine Karte, drei Varianten — wählen Sie per `version`, welche Variante dargestellt wird.

Beispiel — Midi (v2):
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
