import logging
import async_timeout
import asyncio
import random
from datetime import timedelta
import homeassistant.util.dt as dt_util
from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, CoordinatorEntity, UpdateFailed

_LOGGER = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "application/json"
}

async def async_setup_entry(hass, config_entry, async_add_entities):
    stop_id = config_entry.data.get("stop_id")
    name = config_entry.data.get("name")
    session = async_get_clientsession(hass)
    
    coordinator = LinzAGCoordinator(hass, session, stop_id, name)
    
    # Spamschutz beim Start
    await asyncio.sleep(random.uniform(1, 15))
    await coordinator.async_config_entry_first_refresh()

    entities = []
    # Generiert exakt 5 Entitäten
    for i in range(5):
        entities.append(LinzAGDepartureSensor(coordinator, stop_id, name, config_entry.entry_id, i))
        
    async_add_entities(entities, False)

class LinzAGCoordinator(DataUpdateCoordinator):
    def __init__(self, hass, session, stop_id, name):
        
        # --- API ID KORREKTUR ---
        api_stop_id = str(stop_id)
        if "L=" in api_stop_id:
            for part in api_stop_id.split("@"):
                if part.startswith("L="):
                    api_stop_id = part[2:]
                    break
        if ":" in api_stop_id:
            api_stop_id = api_stop_id.split(":")[-1]
            
        super().__init__(
            hass,
            _LOGGER,
            name=f"LinzAG {name}",
            update_interval=timedelta(seconds=60)
        )
        self._session = session
        self._stop_id = stop_id
        self.stop_name = name
        self._url = "https://www.linzag.at/static/XML_DM_REQUEST"
        self._params = {
            "sessionID": "0",
            "locationServerActive": "1",
            "outputFormat": "rapidJSON",
            "depType": "stopEvents",
            "type_dm": "any",
            "name_dm": api_stop_id, 
            "mode": "direct",
            "useRealtime": "1",
            "limit": "40"
        }

    def _clean_name(self, text):
        if not text:
            return "Unbekannt"
        
        text = text.strip()
        prefixes = [
            "Linz/Donau, ", "Linz/Donau ",
            "Leonding, ", "Rufling, ",
            "Steyregg, ",
            "Traun OÖ, ", "Traun OÖ ",
            "Bergham b.Linz, ",
            "Linz, ", "Linz "
        ]
        
        for p in prefixes:
            if text.startswith(p):
                text = text[len(p):]
                break
                
        text = text.replace(" - Traun OÖ", "").replace(" - Steyregg", "").replace(" - Bergham b.Linz", "")
        
        # --- DEINE KORREKTUR FÜR JKU ---
        if text.startswith("JKU | "):
            if text.strip() == "JKU |":
                text = "Universität"
            else:
                text = text[len("JKU | "):]
        
        if text == "Linz/Donau":
            text = "Linz"
        if text == "Traun OÖ":
            text = "Traun"
        
        return text.strip(" ,-")

    async def _async_update_data(self):
        try:
            async with async_timeout.timeout(15):
                response = await self._session.get(self._url, params=self._params, headers=HEADERS, ssl=False)
                
                if response.status != 200:
                    raise UpdateFailed(f"API antwortet mit Status {response.status}")
                
                try:
                    data = await response.json(content_type=None)
                except Exception:
                    raise UpdateFailed("API blockiert / liefert kein gültiges JSON")

            events = data.get("stopEvents", [])
            now = dt_util.now()
            departures = []
            my_station_clean = self._clean_name(self.stop_name).lower()

            for event in events:
                trans = event.get("transportation", {})
                planned_str = event.get("departureTimePlanned")
                estimated_str = event.get("departureTimeEstimated", planned_str)

                if not planned_str:
                    continue

                dt_planned = dt_util.parse_datetime(planned_str)
                dt_estimated = dt_util.parse_datetime(estimated_str)
                
                p_time = dt_util.as_local(dt_planned).strftime("%H:%M")
                l_line = trans.get("number", trans.get("disassembledName", "?"))
                delay = round((dt_estimated - dt_planned).total_seconds() / 60)
                
                raw_direction = trans.get("destination", {}).get("name", "Unbekannt")
                direction_clean = self._clean_name(raw_direction)

                if direction_clean.lower() == my_station_clean:
                    continue

                collected_infos = []
                for hint in event.get("hints", []):
                    if content := hint.get("content"):
                        collected_infos.append(content)
                for info in event.get("infos", []):
                    for link in info.get("infoLinks", []):
                        if text := (link.get("urlText") or link.get("subtitle")):
                            collected_infos.append(text)
                info_string = " +++ ".join(collected_infos)

                cd_minutes = int((dt_estimated - now).total_seconds() / 60)
                
                if cd_minutes < -1:
                    continue

                departures.append({
                    "line": l_line,
                    "direction": direction_clean,
                    "scheduled": p_time,
                    "countdown": max(0, cd_minutes),
                    "delay": max(0, delay),
                    "is_realtime": "departureTimeEstimated" in event,
                    "cancelled": event.get("isCancelled", False),
                    "infos": info_string
                })

            departures.sort(key=lambda x: x["countdown"])
            return departures

        except UpdateFailed:
            raise
        except Exception as e:
            _LOGGER.error("Linz AG Sensor Fehler: %s", e)
            raise UpdateFailed(f"Fehler beim Abrufen der Daten: {e}")

class LinzAGDepartureSensor(CoordinatorEntity, SensorEntity):
    def __init__(self, coordinator, stop_id, name, entry_id, index):
        super().__init__(coordinator)
        self._index = index
        self._stop_id = stop_id
        self._name = name
        
        self._attr_device_info = {
            "identifiers": {("linz_ag_monitor", stop_id)},
            "name": f"Haltestelle {name}",
            "manufacturer": "Linz AG Monitor",
            "model": "Abfahrtsmonitor"
        }
        
        self._attr_has_entity_name = True
        
        # Bereinigt den Namen für die Entity ID (z.B. "Hauptbahnhof" -> "hauptbahnhof")
        clean_id_name = name.lower().replace(" ", "_").replace("-", "_").replace("/", "_").replace(".", "").replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
        
        # Erzwingt die exakte Namensgebung in Home Assistant
        if index == 0:
            self._attr_name = "Nächste Abfahrt"
            self.entity_id = f"sensor.haltestelle_{clean_id_name}_nachste_abfahrt"
        else:
            self._attr_name = f"Abfahrt {index + 1}"
            self.entity_id = f"sensor.haltestelle_{clean_id_name}_abfahrt_{index + 1}"
            
        self._attr_unique_id = f"linz_ag_{stop_id}_{index}"
        self._attr_icon = "mdi:tram"

    @property
    def state(self):
        departures = self.coordinator.data
        if not departures or len(departures) <= self._index:
            return "Keine Abfahrt"
            
        dep = departures[self._index]
        line = dep["line"]
        direction = dep["direction"]
        sched = dep["scheduled"]
        cd = dep["countdown"]
        
        if dep.get("cancelled"):
            return f"{line} {direction} (Fällt aus)"
        elif cd == 0:
            return f"{line} {direction} (Jetzt)"
        else:
            return f"{line} {direction} {sched} ({cd} Min)"

    @property
    def extra_state_attributes(self):
        if self._index == 0 and self.coordinator.data:
            return {
                "departureList": self.coordinator.data[:100], 
                "stop_id": self._stop_id,
                "stop_name": self._name,
                "station": self._name,
                "station_name": self._name,
                "last_update": dt_util.now().strftime("%H:%M:%S")
            }
        return {}
