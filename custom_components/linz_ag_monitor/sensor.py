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

async def async_setup_entry(hass, config_entry, async_add_entities):
    stop_id = config_entry.data.get("stop_id")
    name = config_entry.data.get("name")
    session = async_get_clientsession(hass)
    
    # Nutzt den Helper, der in der __init__.py angelegt wurde
    from . import DOMAIN
    helper = hass.data[DOMAIN][config_entry.entry_id]
    
    coordinator = LinzAGCoordinator(hass, session, stop_id, name, helper)
    await asyncio.sleep(random.uniform(1, 5))
    await coordinator.async_config_entry_first_refresh()

    entities = [LinzAGDepartureSensor(coordinator, stop_id, name, config_entry.entry_id, i) for i in range(5)]
    async_add_entities(entities, False)

class LinzAGCoordinator(DataUpdateCoordinator):
    def __init__(self, hass, session, stop_id, name, helper):
        super().__init__(hass, _LOGGER, name=f"LinzAG {name}", update_interval=timedelta(seconds=30))
        self._session, self._stop_id, self.stop_name, self._gtfs_helper = session, stop_id, name, helper

    def _clean_name(self, text):
        if not text: return "Unbekannt"
        text = text.strip()
        if "|" in text: text = text.split("|")[-1].strip()
        prefixes = ["Linz/Donau, ", "Linz/Donau ", "Leonding, ", "Leonding ", "Steyregg, ", "Steyregg ", "Traun OÖ, ", "Traun OÖ ", "Bergham b.Linz, ", "Linz, ", "Linz "]
        for p in prefixes:
            if text.startswith(p):
                text = text[len(p):]
                break
        return text.strip(" ,-")

    async def _async_update_data(self):
        try:
            await self._gtfs_helper.update_database_if_needed()
            departures = await self._gtfs_helper.get_next_departures(limit=150)
            now = dt_util.now()
            max_api_horizon = 0

            async with async_timeout.timeout(15):
                params = {"sessionID": "0", "outputFormat": "rapidJSON", "depType": "stopEvents", "type_dm": "any", "name_dm": self._stop_id, "useRealtime": "1", "limit": "40"}
                response = await self._session.get("https://www.linzag.at/static/XML_DM_REQUEST", params=params, ssl=False)
                data = await response.json(content_type=None)

            events = data.get("stopEvents", [])
            for event in events:
                planned_str = event.get("departureTimePlanned")
                if not planned_str: continue
                
                dt_p = dt_util.as_local(dt_util.parse_datetime(planned_str))
                p_time = dt_p.strftime("%H:%M")
                l_line = str(event["transportation"].get("number", "?")).replace("*", "")
                delay = round((dt_util.parse_datetime(event.get("departureTimeEstimated", planned_str)) - dt_util.parse_datetime(planned_str)).total_seconds() / 60)
                
                max_api_horizon = max(max_api_horizon, int((dt_p - now).total_seconds() / 60))
                
                infos = [h.get("content") for h in event.get("hints", []) if h.get("content")]
                for info in event.get("infos", []):
                    for link in info.get("infoLinks", []):
                        if txt := (link.get("urlText") or link.get("subtitle")): infos.append(txt)

                for entry in departures:
                    if entry["line"] == l_line and entry["scheduled"] == p_time:
                        entry.update({"is_realtime": True, "delay": max(0, delay), "cancelled": event.get("isCancelled", False), "infos": " +++ ".join(infos)})
                        entry["direction"] = self._clean_name(event["transportation"].get("destination", {}).get("name", "Unbekannt"))
                        break

            my_station_clean = self._clean_name(self.stop_name).lower()
            final_list = []
            for entry in departures:
                h, m = map(int, entry["scheduled"].split(":"))
                sched_ts = now.replace(hour=h, minute=m, second=0, microsecond=0)
                if sched_ts < now and now.hour > 12 and h < 12: sched_ts += timedelta(days=1)
                
                diff = int((sched_ts - now).total_seconds() / 60)
                if diff < (max_api_horizon - 2) and not entry["is_realtime"]: continue

                entry["countdown"] = max(0, diff + entry.get("delay", 0))
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
        if d.get("cancelled"): return f"{d['line']} {d['direction']} (Fällt aus)"
        return f"{d['line']} {d['direction']} {d['scheduled']} ({d['countdown']} Min)"

    @property
    def extra_state_attributes(self):
        if self._index == 0 and self.coordinator.data:
            return {"departureList": self.coordinator.data[:100], "station_name": self._name}
        return {}
