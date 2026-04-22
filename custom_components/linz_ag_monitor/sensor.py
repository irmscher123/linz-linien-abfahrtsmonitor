import logging
import async_timeout
from datetime import datetime, timedelta
import homeassistant.util.dt as dt_util
from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_track_time_change

# Wir binden den GTFS Helper ein
from .gtfs_helper import GTFSHelper

_LOGGER = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "application/json"
}

async def async_setup_entry(hass, config_entry, async_add_entities):
    stop_id = config_entry.data.get("stop_id")
    name = config_entry.data.get("name")
    session = async_get_clientsession(hass)
    async_add_entities([LinzAGSensor(hass, session, stop_id, name, config_entry.entry_id)], True)

class LinzAGSensor(SensorEntity):
    def __init__(self, hass, session, stop_id, name, entry_id):
        self.hass = hass
        self._session = session
        self._stop_id = stop_id
        self._attr_name = name
        self._attr_unique_id = f"linz_ag_{stop_id}_{entry_id}"
        self._attr_has_entity_name = False
        self._attr_icon = "mdi:tram"
        self._state = None
        self._attr_extra_state_attributes = {}
        
        # Initialisiere den GTFS Helper
        self._gtfs_helper = GTFSHelper(self.hass, stop_id, name)
        
        self._url = "https://www.linzag.at/static/XML_DM_REQUEST"
        self._params = {
            "sessionID": "0",
            "locationServerActive": "1",
            "outputFormat": "rapidJSON",
            "depType": "stopEvents",
            "type_dm": "any",
            "name_dm": self._stop_id,
            "mode": "direct",
            "useRealtime": "1",
            "limit": "40"
        }

    async def async_added_to_hass(self):
        """Aktiviert das nächtliche GTFS-Update."""
        self.async_on_remove(
            async_track_time_change(self.hass, self._nightly_gtfs_update, hour=2, minute=0, second=0)
        )
        await self._gtfs_helper.update_database_if_needed()

    async def _nightly_gtfs_update(self, _now):
        _LOGGER.info("Starte nächtliches GTFS-Update...")
        await self._gtfs_helper._download_and_build_db()

    @property
    def state(self):
        return self._state

    def _clean_name(self, text):
        """Entfernt unerwünschte Ortszusätze, Kommas und Bindestriche."""
        if not text: return "Unbekannt"
        to_remove = ["Linz/Donau", "- Steyregg", "Steyregg", "- Leonding", "Leonding", "- Traun OÖ", "Traun OÖ", "- Bergham b.Linz", "Bergham b.Linz"]
        for r in to_remove:
            text = text.replace(r, "")
        return text.replace(",", "").strip("- ").strip()

    async def async_update(self):
        try:
            # 1. Lade den Fahrplan für die nächsten Stunden aus der GTFS-Datenbank
            await self._gtfs_helper.update_database_if_needed()
            departures = await self._gtfs_helper.get_next_departures(limit=150)
            
            # Jedem GTFS-Eintrag schon mal leere Infos mitgeben
            for entry in departures:
                entry["infos"] = ""
                entry["cancelled"] = False

            # 2. Lade deine perfekten Echtzeit-Daten inkl. infos und hints
            async with async_timeout.timeout(15):
                response = await self._session.get(self._url, params=self._params, headers=HEADERS, ssl=False)
                data = await response.json(content_type=None)

            events = data.get("stopEvents", [])
            now = dt_util.now()

            # 3. Verknüpfe Live-Daten mit dem GTFS-Fahrplan
            for event in events:
                trans = event.get("transportation", {})
                planned_str = event.get("departureTimePlanned")
                estimated_str = event.get("departureTimeEstimated", planned_str)

                if not planned_str: continue

                dt_planned = dt_util.parse_datetime(planned_str)
                dt_estimated = dt_util.parse_datetime(estimated_str)
                
                # Geplante Zeit als HH:MM für den Vergleich mit GTFS
                p_time = dt_util.as_local(dt_planned).strftime("%H:%M")
                l_line = trans.get("number", trans.get("disassembledName", "?"))
                delay = round((dt_estimated - dt_planned).total_seconds() / 60)

                # --- DEINE INFOS LOGIK ---
                collected_infos = []
                for hint in event.get("hints", []):
                    if content := hint.get("content"): collected_infos.append(content)
                for info in event.get("infos", []):
                    for link in info.get("infoLinks", []):
                        if text := (link.get("urlText") or link.get("subtitle")): collected_infos.append(text)
                info_string = " +++ ".join(collected_infos)

                # Jetzt suchen wir die Fahrt im GTFS-Fahrplan und aktualisieren sie
                for entry in departures:
                    if entry["line"] == l_line and entry["scheduled"] == p_time:
                        entry["is_realtime"] = True
                        entry["delay"] = max(0, delay)
                        entry["cancelled"] = event.get("isCancelled", False)
                        entry["infos"] = info_string
                        
                        # Wir übernehmen auch das exakte Ziel aus der Live-API (bereinigt)
                        raw_direction = trans.get("destination", {}).get("name", "Unbekannt")
                        entry["direction"] = self._clean_name(raw_direction)
                        break

            # 4. Countdowns für alle berechnen (sowohl GTFS als auch Echtzeit)
            for entry in departures:
                h, m = map(int, entry["scheduled"].split(":"))
                sched_ts = now.replace(hour=h, minute=m, second=0, microsecond=0)
                
                # Mitternachtssprung abfangen
                if sched_ts < now and now.hour > 12 and h < 12:
                    sched_ts += timedelta(days=1)
                
                diff = int((sched_ts - now).total_seconds() / 60) + entry.get("delay", 0)
                entry["countdown"] = max(0, diff)

            # Sortieren nach Countdown (die nächsten zuerst)
            departures.sort(key=lambda x: x["countdown"])

            self._state = len(departures)
            self._attr_extra_state_attributes = {
                "departureList": departures[:100],  # Limit für das Dashboard auf 100 erhöht
                "stop_id": self._stop_id,
                "stop_name": self._attr_name,
                "station": self._attr_name,
                "station_name": self._attr_name,
                "last_update": now.strftime("%H:%M:%S")
            }

        except Exception as e:
            _LOGGER.error("Linz AG Sensor Fehler: %s", e)
