# 🚋 Linz Linien Abfahrtsmonitor

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![version](https://img.shields.io/badge/version-0.0.1-blue.svg?style=for-the-badge)]()
[![maintainer](https://img.shields.io/badge/maintainer-irmscher123-green.svg?style=for-the-badge)]()

<p align="center">
  <img src="static/logo.png" width="200" alt="Linz Linien Logo">
</p>


  <b>Der moderne Abfahrtsmonitor für Home Assistant.</b><br>
  Live-Daten der Linz AG Linien, einfache Einrichtung und wunderschöne Dashboard-Karten.


---

## ✨ Features

* **⚡ Echtzeit-Daten:** Direkte Anbindung an die Schnittstelle der Linz AG.
* **🔍 Smart Search:** Suche einfach nach "Hauptplatz" oder "Goethekreuzung" – keine kryptischen IDs nötig!
* **🎨 2 Design-Varianten:** Wähle zwischen "Classic" (V1) und "Compact" (V2).
* **📱 Responsive:** Perfekt für Wall-Tablets und Smartphones.
* **⚙️ UI Config:** Vollständige Einrichtung über die Home Assistant Benutzeroberfläche.

---

## 🖼️ Vorschau

Die Integration kommt mit zwei vorgefertigten Designs für dein Dashboard:

| Design V1 (Classic) | Design V2 (Compact) |
| :---: | :---: |
| *Große Anzeige mit Linienfarben* | *Modern, platzsparend mit Lauftext* |
| ![V1 Preview](pictures/V1.png) | ![V2 Preview](pictures/V2.png) |

---

## 📥 Installation

### Option 1: Via HACS (Empfohlen)

1.  Öffne HACS in Home Assistant.
2.  Gehe zu **Integrationen** > **Menü (drei Punkte)** > **Benutzerdefinierte Repositories**.
3.  Füge diese URL ein:
    `https://github.com/irmscher123/linz-linien-abfahrtsmonitor`
4.  Wähle die Kategorie **Integration**.
5.  Klicke auf **Hinzufügen** und dann auf **Herunterladen**.
6.  **Start Home Assistant neu.**

### Option 2: Manuell

1.  Lade das Repository als ZIP herunter.
2.  Kopiere den Ordner `custom_components/linz_ag_monitor` in deinen `/config/custom_components/` Ordner.
3.  Starte Home Assistant neu.

---

## ⚙️ Einrichtung

### 1. Sensor hinzufügen
Gehe zu **Einstellungen** > **Geräte & Dienste** > **Integration hinzufügen** und suche nach **Linz Linien Abfahrtsmonitor**.

1.  Gib den Namen der Haltestelle ein (z.B. `Simonystraße`).
2.  Wähle den korrekten Treffer aus der Liste.
3.  Fertig! Du hast nun einen Sensor (z.B. `sensor.simonystrasse`).

---

## 2. 🛠️ Manuelle Einrichtung der Karten

*Hinweis: Dies ist meist nur nötig, wenn die Karten nach der Installation nicht automatisch erscheinen.*

**Schritt 2.1: Dateien kopieren**
1. Lade die Dateien `linz-monitor-card_v1.js` und `linz-monitor-card_v2.js` aus dem Ordner `dashboard-cards` dieses Repositories herunter.
2. Lade sie in deinen Home Assistant Ordner: `/config/www/` hoch.
   *(Hinweis: Wenn der Ordner `www` nicht existiert, erstelle ihn. Danach Home Assistant neu starten!)*

**Schritt 2.2: Ressource registrieren**
Damit Home Assistant die Dateien kennt:
1. Gehe zu **Einstellungen** > **Dashboards**.
2. Klicke oben rechts auf die drei Punkte `...` und wähle **Ressourcen**.
3. Klicke auf **Ressource hinzufügen**.
4. Trage folgendes ein (wiederhole es für beide Versionen):

| Einstellung | Wert für V1 | Wert für V2 |
| :--- | :--- | :--- |
| **URL** | `/local/linz-monitor-card_v1.js` | `/local/linz-monitor-card_v2.js` |
| **Art** | JavaScript Modul | JavaScript Modul |

5. Klicke auf **Erstellen**.

---

### 3. Dashboard Karte hinzufügen

Du musst keinen Code schreiben! Die Karten sind im Paket enthalten.

1.  Gehe auf dein Dashboard und klicke auf **Karte hinzufügen**.
2.  Suche oben in der Lupe nach "Linz".
3.  Wähle dein Design (**V1** oder **V2**), wie hier zu sehen:

![Karte hinzufügen](pictures/dashboard-hinzufuegen.png)

4.  Wähle im Editor deinen Sensor aus. Fertig!

### 🛠️ Karte bearbeiten (Editor)
Du kannst die Einstellungen (Titel, Sensor, etc.) ganz einfach über den visuellen Editor ändern:

| Editor V1 | Editor V2 |
| :---: | :---: |
| ![V1 Edit](pictures/V1edit.png) | ![V2 Edit](pictures/V2edit.png) |

---

## ⚖️ Disclaimer & Datenquelle

**Datenquelle:**
Die Abfahrtszeiten werden von der öffentlichen Schnittstelle der Linz Linien GmbH (`linzag.at/efa`) abgerufen.

**Haftungsausschluss:**
Dies ist ein privates, inoffizielles Projekt und steht in keiner Verbindung zur Linz AG.
Der Entwickler übernimmt **keine Gewährleistung** für die Richtigkeit, Vollständigkeit oder Aktualität der angezeigten Daten. Sollte die Schnittstelle der Linz AG geändert werden oder ausfallen, kann die Funktion der Integration nicht garantiert werden.

---

## 🛠️ Credits & Lizenz

Entwickelt von **@irmscher123**.

[Lizenz: MIT](LICENSE)
