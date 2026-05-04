import logging
import asyncio
from datetime import timedelta
import homeassistant.util.dt as dt_util
from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, CoordinatorEntity, UpdateFailed

from . import DOMAIN

_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(hass, config_entry, async_add_entities):
    stop_id = config_entry.data.get("stop_id")
    name = config_entry.data.get("name")
    gtfs_helper = hass.data[DOMAIN].get("gtfs_helper")
    coordinator = LinzAGCoordinator(hass, async_get_clientsession(hass), stop_id, name, gtfs_helper)
    await coordinator.async_config_entry_first_refresh()
    # Wir erstellen 19 Sensoren (oder so viele wie in der Config stehen)
    entities = [LinzAGDepartureSensor(coordinator, stop_id, name, config_entry.entry_id, i) for i in range(19)]
    async_add_entities(entities, False)

class LinzAGCoordinator(DataUpdateCoordinator):
    def __init__(self, hass, session, stop_id, name, gtfs_helper):
        super().__init__(hass, _LOGGER, name=f"LinzAG {name}", update_interval=timedelta(seconds=60))
        self._session, self._stop_id, self.stop_name, self._gtfs_helper = session, stop_id, name, gtfs_helper

    async def _async_update_data(self):
        # 1. Fahrplandaten als Basis laden
        departures = await self._gtfs_helper.get_next_departures(self.stop_name, limit=100)
        now = dt_util.now()
        
        # 2. Live-Daten von der API holen
        try:
            params = {"sessionID": "0", "outputFormat": "rapidJSON", "depType": "stopEvents", "type_dm": "any", "name_dm": self._stop_id, "useRealtime": "1", "limit": "40"}
            async with asyncio.timeout(10):
                response = await self._session.get("https://www.linzag.at/static/XML_DM_REQUEST", params=params, ssl=False)
                if response.status == 200:
                    data = await response.json(content_type=None)
                    for event in data.get("stopEvents", []):
                        planned = event.get("departureTimePlanned")
                        if not planned: continue
                        
                        dt_p = dt_util.as_local(dt_util.parse_datetime(planned))
                        p_time = dt_p.strftime("%H:%M")
                        l_line = str(event["transportation"].get("number", "?")).replace("*", "")
                        delay = round((dt_util.parse_datetime(event.get("departureTimeEstimated", planned)) - dt_util.parse_datetime(planned)).total_seconds() / 60)

                        # Match finden und Echtzeit-Status setzen
                        for entry in departures:
                            if entry["line"] == l_line and entry["scheduled"] == p_time:
                                entry.update({"is_realtime": True, "delay": max(0, delay), "cancelled": event.get("isCancelled", False)})
                                break
        except Exception as e:
            _LOGGER.debug("API nicht erreichbar, nutze nur GTFS: %s", e)

        # 3. Berechnen und Sortieren
        final = []
        for d in departures:
            h, m = map(int, d["scheduled"].split(":"))
            sched_ts = now.replace(hour=h, minute=m, second=0, microsecond=0)
            if sched_ts < now and h < 4: sched_ts += timedelta(days=1)
            
            diff = int((sched_ts - now).total_seconds() / 60) + d.get("delay", 0)
            if diff >= -1:
                d["countdown"] = max(0, diff)
                final.append(d)
        
        return sorted(final, key=lambda x: x["countdown"])

class LinzAGDepartureSensor(CoordinatorEntity, SensorEntity):
    def __init__(self, coordinator, stop_id, name, entry_id, index):
        super().__init__(coordinator)
        self._index, self._stop_id, self._name = index, stop_id, name
        self._attr_unique_id = f"linz_ag_{stop_id}_{entry_id}_{index}"
        self._attr_name = f"Abfahrt {index + 1}"

    @property
    def state(self):
        deps = self.coordinator.data
        if not deps or len(deps) <= self._index: return "Keine Abfahrt"
        d = deps[self._index]
        return f"{d['line']} {d['direction']} {d['scheduled']} ({d['countdown']} Min)"

    @property
    def extra_state_attributes(self):
        if self._index == 0:
            return {"departureList": self.coordinator.data, "stop_name": self._name, "station_name": self._name}
        return {}
