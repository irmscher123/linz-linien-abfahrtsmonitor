import logging
from datetime import timedelta
import homeassistant.util.dt as dt_util
from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, CoordinatorEntity, UpdateFailed

from . import DOMAIN

_LOGGER = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "application/json"
}

async def async_setup_entry(hass, config_entry, async_add_entities):
    stop_id = config_entry.data.get("stop_id")
    name = config_entry.data.get("name")
    session = async_get_clientsession(hass)
    gtfs_helper = hass.data[DOMAIN].get("gtfs_helper")
    coordinator = LinzAGCoordinator(hass, session, stop_id, name, gtfs_helper)
    await coordinator.async_config_entry_first_refresh()
    entities = [LinzAGDepartureSensor(coordinator, stop_id, name, config_entry.entry_id, i) for i in range(5)]
    async_add_entities(entities, False)

class LinzAGCoordinator(DataUpdateCoordinator):
    def __init__(self, hass, session, stop_id, name, gtfs_helper):
        super().__init__(hass, _LOGGER, name=f"LinzAG {name}", update_interval=timedelta(seconds=60))
        self._session = session
        self._stop_id = stop_id
        self.stop_name = name
        self._gtfs_helper = gtfs_helper
        self._url = "https://www.linzag.at/static/XML_DM_REQUEST"
        self._params = {
            "sessionID": "0", "locationServerActive": "1", "outputFormat": "rapidJSON",
            "depType": "stopEvents", "type_dm": "any", "name_dm": self._stop_id,
            "mode": "direct", "useRealtime": "1", "limit": "40"
        }

    def _clean_name(self, text):
        if not text: return "Unbekannt"
        text = text.strip()
        if text.startswith("JKU |"):
            if text.strip() == "JKU |": text = "Universität"
            else: text = text[len("JKU | "):]
        elif "|" in text:
            parts = [part.strip() for part in text.split("|")]
            text = parts[-1]
            
        prefixes = [
            "Linz/Donau, ", "Linz/Donau ", "Leonding, ", "Leonding ",
            "Steyregg, ", "Steyregg ", "Traun OÖ, ", "Traun OÖ ", 
            "Traun, ", "Traun ", "Bergham b.Linz, ", "Bergham b.Linz ",
            "Linz, ", "Linz "
        ]
        for p in prefixes:
            if text.startswith(p):
                text = text[len(p):]
                break
                
        suffixes = [" - Traun OÖ", " - Steyregg", " - Bergham b.Linz", " - Leonding"]
        for s in suffixes: text = text.replace(s, "")
            
        if text == "Linz/Donau": text = "Linz"
        if text == "Traun OÖ": text = "Traun"
        return text.strip(" ,-")

    async def _async_update_data(self):
        try:
            # Zurück zum NAMEN, da IDs nicht matchen!
            departures = await self._gtfs_helper.get_next_departures(self.stop_name, limit=50)
            now = dt_util.now()
            
            max_api_horizon = 0 # Verfolgt, wie weit die API in die Zukunft sieht
            
            response = await self._session.get(self._url, params=self._params, headers=HEADERS, ssl=False, timeout=15)
            if response.status == 200:
                try:
                    data = await response.json(content_type=None)
                    events = data.get("stopEvents", [])
                    
                    for event in events:
                        trans = event.get("transportation", {})
                        planned_str = event.get("departureTimePlanned")
                        estimated_str = event.get("departureTimeEstimated", planned_str)

                        if not planned_str: continue

                        dt_planned = dt_util.parse_datetime(planned_str)
                        dt_estimated = dt_util.parse_datetime(estimated_str)
                        p_time = dt_util.as_local(dt_planned).strftime("%H:%M")
                        
                        # Horizont berechnen
                        plan_cd = int((dt_planned - now).total_seconds() / 60)
                        if plan_cd > max_api_horizon:
                            max_api_horizon = plan_cd

                        # Sternchen killen
                        l_line = str(trans.get("number", trans.get("disassembledName", "?"))).replace("*", "")
                        delay = round((dt_estimated - dt_planned).total_seconds() / 60)
                        
                        infos = [hint.get("content") for hint in event.get("hints", []) if hint.get("content")]
                        for info in event.get("infos", []):
                            for link in info.get("infoLinks", []):
                                if text := (link.get("urlText") or link.get("subtitle")): infos.append(text)

                        for entry in departures:
                            if entry["line"] == l_line and entry["scheduled"] == p_time:
                                entry["is_realtime"] = True
                                entry["delay"] = max(0, delay)
                                entry["cancelled"] = event.get("isCancelled", False)
                                entry["infos"] = " +++ ".join(infos)
                                break
                except Exception:
                    pass

            my_station_clean = self._clean_name(self.stop_name).lower()
            final_departures = []
            
            for entry in departures:
                if entry["direction"].lower() == my_station_clean: continue
                    
                h, m = map(int, entry["scheduled"].split(":"))
                sched_ts = now.replace(hour=h, minute=m, second=0, microsecond=0)
                if sched_ts < now and now.hour > 12 and h < 12:
                    sched_ts += timedelta(days=1)
                
                diff = int((sched_ts - now).total_seconds() / 60)
                
                # DER PHANTOM-KILLER: Wenn GTFS eine Fahrt innerhalb des API-Horizonts anzeigt,
                # die Live-API sie aber nicht bestätigt hat (is_realtime=False), wird sie ignoriert!
                if diff < (max_api_horizon - 2) and not entry.get("is_realtime"):
                    continue
                
                cd = diff + entry.get("delay", 0)
                if cd >= -1:
                    entry["countdown"] = max(0, cd)
                    final_departures.append(entry)

            final_departures.sort(key=lambda x: x["countdown"])
            return final_departures

        except Exception as e:
            _LOGGER.error("Linz AG Sensor Fehler: %s", e)
            raise UpdateFailed(f"Fehler beim Abrufen der Daten: {e}")

class LinzAGDepartureSensor(CoordinatorEntity, SensorEntity):
    def __init__(self, coordinator, stop_id, name, entry_id, index):
        super().__init__(coordinator)
        self._index = index
        self._stop_id = stop_id
        self._name = name
        self._attr_device_info = {"identifiers": {("linz_ag_monitor", stop_id)}, "name": name, "manufacturer": "Linz AG Monitor"}
        self._attr_has_entity_name = True
        self._attr_name = "Nächste Abfahrt" if index == 0 else f"Abfahrt {index + 1}"
        self._attr_unique_id = f"linz_ag_{stop_id}_{entry_id}_{index}"
        self._attr_icon = "mdi:tram"

    @property
    def state(self):
        deps = self.coordinator.data
        if not deps or len(deps) <= self._index: return "Keine Abfahrt"
        dep = deps[self._index]
        if dep.get("cancelled"): return f"{dep['line']} {dep['direction']} (Ausfall)"
        if dep['countdown'] == 0: return f"{dep['line']} {dep['direction']} (Jetzt)"
        return f"{dep['line']} {dep['direction']} {dep['scheduled']} ({dep['countdown']} Min)"

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
