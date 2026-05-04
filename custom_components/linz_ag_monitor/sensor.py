import logging
import async_timeout
import asyncio
import random
from datetime import datetime, timedelta
import homeassistant.util.dt as dt_util
from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_track_time_change
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, CoordinatorEntity, UpdateFailed

_LOGGER = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "application/json"
}

async def async_setup_entry(hass, config_entry, async_add_entities):
    stop_id = config_entry.data.get("stop_id")[cite: 5]
    name = config_entry.data.get("name")[cite: 5]
    session = async_get_clientsession(hass)[cite: 5]
    
    # Nutzt den Helper aus der __init__.py
    from .gtfs_helper import GTFSHelper
    coordinator = LinzAGCoordinator(hass, session, stop_id, name)[cite: 5]
    
    await asyncio.sleep(random.uniform(1, 5))[cite: 5]
    await coordinator.async_config_entry_first_refresh()[cite: 5]

    entities = [LinzAGDepartureSensor(coordinator, stop_id, name, config_entry.entry_id, i) for i in range(5)][cite: 5]
    async_add_entities(entities, False)[cite: 5]

class LinzAGCoordinator(DataUpdateCoordinator):
    def __init__(self, hass, session, stop_id, name):
        super().__init__(hass, _LOGGER, name=f"LinzAG {name}", update_interval=timedelta(seconds=30))[cite: 5]
        self._session, self._stop_id, self.stop_name = session, stop_id, name[cite: 5]
        self._gtfs_helper = GTFSHelper(hass, stop_id, name)[cite: 5]
        self._url = "https://www.linzag.at/static/XML_DM_REQUEST"[cite: 5]

    def _clean_name(self, text):
        if not text: return "Unbekannt"[cite: 5]
        text = text.strip()[cite: 5]
        # STERNE-FIX: JKU und Trenner konsequent entfernen
        if "|" in text:
            text = text.split("|")[-1].strip()
        prefixes = ["Linz/Donau, ", "Linz/Donau ", "Leonding, ", "Steyregg, ", "Traun OÖ, ", "Traun OÖ ", "Bergham b.Linz, ", "Linz, ", "Linz "]
        for p in prefixes:
            if text.startswith(p):
                text = text[len(p):]
                break
        return text.strip(" ,-")[cite: 5]

    async def _nightly_gtfs_update(self, _now):
        await self._gtfs_helper._download_and_build_db()[cite: 5]

    async def _async_update_data(self):
        try:
            await self._gtfs_helper.update_database_if_needed()[cite: 5]
            departures = await self._gtfs_helper.get_next_departures(limit=150)[cite: 5]
            now = dt_util.now()
            max_api_horizon = 0 # Für Phantom-Filter

            async with async_timeout.timeout(15):
                params = {"sessionID": "0", "outputFormat": "rapidJSON", "depType": "stopEvents", "type_dm": "any", "name_dm": self._stop_id, "useRealtime": "1", "limit": "40"}
                response = await self._session.get(self._url, params=params, headers=HEADERS, ssl=False)[cite: 5]
                data = await response.json(content_type=None)[cite: 5]

            events = data.get("stopEvents", [])[cite: 5]
            for event in events:
                trans = event.get("transportation", {})[cite: 5]
                planned_str = event.get("departureTimePlanned")[cite: 5]
                if not planned_str: continue

                dt_planned = dt_util.parse_datetime(planned_str)[cite: 5]
                p_time = dt_util.as_local(dt_planned).strftime("%H:%M")[cite: 5]
                l_line = str(trans.get("number", "?")).replace("*", "") # STERNE-FIX
                
                # Horizont für Phantom-Filter ermitteln
                max_api_horizon = max(max_api_horizon, int((dt_planned - now).total_seconds() / 60))

                for entry in departures:
                    if entry["line"] == l_line and entry["scheduled"] == p_time:
                        entry["is_realtime"] = True[cite: 5]
                        entry["direction"] = self._clean_name(trans.get("destination", {}).get("name", "Unbekannt"))[cite: 5]
                        break

            # PHANTOM-FILTER & STATION-FILTER
            my_station_clean = self._clean_name(self.stop_name).lower()[cite: 5]
            final_list = []
            for entry in departures:
                h, m = map(int, entry["scheduled"].split(":"))
                sched_ts = now.replace(hour=h, minute=m, second=0, microsecond=0)
                if sched_ts < now and now.hour > 12 and h < 12: sched_ts += timedelta(days=1)
                
                diff = int((sched_ts - now).total_seconds() / 60)
                
                # PHANTOM-FILTER: In API-Zeitfenster, aber nicht von API bestätigt? -> Löschen
                if diff < (max_api_horizon - 2) and not entry["is_realtime"]:
                    continue

                entry["countdown"] = max(0, diff)[cite: 5]
                if entry["direction"].lower() != my_station_clean:[cite: 5]
                    final_list.append(entry)[cite: 5]

            return sorted(final_list, key=lambda x: x["countdown"])[cite: 5]
        except Exception as e:
            _LOGGER.error("Linz AG Sensor Fehler: %s", e)
            raise UpdateFailed(f"Fehler: {e}")[cite: 5]

class LinzAGDepartureSensor(CoordinatorEntity, SensorEntity):
    def __init__(self, coordinator, stop_id, name, entry_id, index):
        super().__init__(coordinator)[cite: 5]
        self._index, self._stop_id, self._name = index, stop_id, name[cite: 5]
        self._attr_name = "Nächste Abfahrt" if index == 0 else f"Abfahrt {index + 1}"[cite: 5]
        self._attr_unique_id = f"linz_ag_{stop_id}_{entry_id}_{index}"[cite: 5]

    @property
    def state(self):
        deps = self.coordinator.data[cite: 5]
        if not deps or len(deps) <= self._index: return "Keine Abfahrt"[cite: 5]
        d = deps[self._index][cite: 5]
        return f"{d['line']} {d['direction']} {d['scheduled']} ({d['countdown']} Min)"[cite: 5]

    @property
    def extra_state_attributes(self):
        if self._index == 0 and self.coordinator.data:
            return {"departureList": self.coordinator.data[:100], "station_name": self._name}[cite: 5]
        return {}
