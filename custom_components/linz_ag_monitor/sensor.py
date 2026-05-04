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
    
    coordinator = LinzAGCoordinator(hass, session, stop_id, name)
    
    await asyncio.sleep(random.uniform(1, 5))
    await coordinator.async_config_entry_first_refresh()

    entities = [LinzAGDepartureSensor(coordinator, stop_id, name, config_entry.entry_id, i) for i in range(5)]
    async_add_entities(entities, False)

class LinzAGCoordinator(DataUpdateCoordinator):
    def __init__(self, hass, session, stop_id, name):
        super().__init__(hass, _LOGGER, name=f"LinzAG {name}", update_interval=timedelta(seconds=30))
        self._session, self._stop_id, self.stop_name = session, stop_id, name
        self._gtfs_helper = GTFSHelper(hass, stop_id, name)
        self._url = "https://www.linzag.at/static/XML_DM_REQUEST"

    def _clean_name(self, text):
        if not text: return "Unbekannt"
        text = text.strip()
        # Fix für Sterne: Alles vor/inklusive | wegschneiden
        if "|" in text:
            text = text.split("|")[-1].strip()
            
        prefixes = ["Linz/Donau, ", "Linz/Donau ", "Leonding, ", "Steyregg, ", "Traun OÖ, ", "Traun OÖ ", "Bergham b.Linz, ", "Linz, ", "Linz "]
        for p in prefixes:
            if text.startswith(p):
                text = text[len(p):]
                break
        return text.strip(" ,-")

    async def _nightly_gtfs_update(self, _now):
        await self._gtfs_helper._download_and_build_db()

    async def _async_update_data(self):
        try:
            await self._gtfs_helper.update_database_if_needed()
            departures = await self._gtfs_helper.get_next_departures(limit=150)
            now = dt_util.now()
            max_api_horizon = 0

            async with async_timeout.timeout(15):
                params = {"sessionID": "0", "outputFormat": "rapidJSON", "depType": "stopEvents", "type_dm": "any", "name_dm": self._stop_id, "useRealtime": "1", "limit": "40"}
                response = await self._session.get(self._url, params=params, headers=HEADERS, ssl=False)
                data = await response.json(content_type=None)

            events = data.get("stopEvents", [])
            for event in events:
                trans = event.get("transportation", {})
                planned_str = event.get("departureTimePlanned")
                if not planned_str: continue

                dt_planned = dt_util.parse_datetime(planned_str)
                p_time = dt_util.as_local(dt_planned).strftime("%H:%M")
                l_line = str(trans.get("number", "?")).replace("*", "")
                
                # Zeitfenster der Live-API tracken
                max_api_horizon = max(max_api_horizon, int((dt_planned - now).total_seconds() / 60))

                for entry in departures:
                    if entry["line"] == l_line and entry["scheduled"] == p_time:
                        entry["is_realtime"] = True
                        entry["direction"] = self._clean_name(trans.get("destination", {}).get("name", "Unbekannt"))
                        break

            my_station_clean = self._clean_name(self.stop_name).lower()
            final_list = []
            for entry in departures:
                h, m = map(int, entry["scheduled"].split(":"))
                sched_ts = now.replace(hour=h, minute=m, second=0, microsecond=0)
                if sched_ts < now and now.hour > 12 and h < 12: sched_ts += timedelta(days=1)
                
                diff = int((sched_ts - now).total_seconds() / 60)
                
                # Phantom-Filter: In API-Zeitfenster, aber nicht von API bestätigt? -> Löschen
                if diff < (max_api_horizon - 2) and not entry["is_realtime"]:
                    continue

                entry["countdown"] = max(0, diff)
                if entry["direction"].lower() != my_station_clean:
                    final_list.append(entry)

            return sorted(final_list, key=lambda x: x["countdown"])
        except Exception as e:
            _LOGGER.error("Linz AG Sensor Fehler: %s", e)
            raise UpdateFailed(f"Fehler: {e}")

class LinzAGDepartureSensor(CoordinatorEntity, SensorEntity):
    def __init__(self, coordinator, stop_id, name, entry_id, index):
        super().__init__(coordinator)
        self._index, self._stop_id, self._name = index, stop_id, name
        self._attr_name = "Nächste Abfahrt" if index == 0 else f"Abfahrt {index + 1}"
        self._attr_unique_id = f"linz_ag_{stop_id}_{entry_id}_{index}"

    @property
    def state(self):
        deps = self.coordinator.data
        if not deps or len(deps) <= self._index: return "Keine Abfahrt"
        d = deps[self._index]
        return f"{d['line']} {d['direction']} {d['scheduled']} ({d['countdown']} Min)"

    @property
    def extra_state_attributes(self):
        if self._index == 0 and self.coordinator.data:
            return {"departureList": self.coordinator.data[:100], "station_name": self._name}
        return {}
