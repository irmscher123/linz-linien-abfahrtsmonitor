import logging
import asyncio
import random
from datetime import timedelta
import homeassistant.util.dt as dt_util
from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, CoordinatorEntity, UpdateFailed

_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(hass, config_entry, async_add_entities):
    stop_id = config_entry.data.get("stop_id")
    name = config_entry.data.get("name")
    session = async_get_clientsession(hass)
    
    # Jede Haltestelle wartet beim Start zufällig (verhindert 4096 Fehler)
    await asyncio.sleep(random.uniform(5, 30))
    
    coordinator = LinzAGCoordinator(hass, session, stop_id, name)
    await coordinator.async_config_entry_first_refresh()

    entities = [LinzAGDepartureSensor(coordinator, stop_id, name, config_entry.entry_id, i) for i in range(19)]
    async_add_entities(entities, False)

class LinzAGCoordinator(DataUpdateCoordinator):
    def __init__(self, hass, session, stop_id, name):
        super().__init__(hass, _LOGGER, name=f"LinzAG {name}", update_interval=timedelta(seconds=60))
        self._session, self._stop_id, self.stop_name = session, stop_id, name

    def _clean_name(self, text):
        if not text: return "Unbekannt"
        text = text.strip()
        if "|" in text: text = text.split("|")[-1].strip()
        # Expliziter Fix für LinzDonau und JKU
        text = text.replace("LinzDonau", "").replace("JKU", "").strip()
        prefixes = ["Linz/Donau, ", "Linz/Donau ", "Leonding, ", "Leonding ", "Steyregg, ", "Steyregg ", "Traun OÖ, ", "Traun OÖ ", "Bergham b.Linz, ", "Linz, ", "Linz "]
        for p in prefixes:
            if text.startswith(p):
                text = text[len(p):]
                break
        return text.strip(" ,-")

    async def _async_update_data(self):
        now = dt_util.now()
        url = "https://www.linzag.at/static/XML_DM_REQUEST"
        params = {"sessionID": "0", "outputFormat": "rapidJSON", "depType": "stopEvents", "type_dm": "any", "name_dm": self._stop_id, "useRealtime": "1", "limit": "20"}
        
        try:
            async with asyncio.timeout(15):
                response = await self._session.get(url, params=params, ssl=False)
                data = await response.json(content_type=None)
            
            final = []
            for event in data.get("stopEvents", []):
                planned = event.get("departureTimePlanned")
                if not planned: continue
                
                dt_p = dt_util.as_local(dt_util.parse_datetime(planned))
                l_line = str(event["transportation"].get("number", "?")).replace("*", "")
                dest = self._clean_name(event["transportation"].get("destination", {}).get("name", "Unbekannt"))
                
                # Verspätung berechnen
                est = event.get("departureTimeEstimated", planned)
                delay = round((dt_util.parse_datetime(est) - dt_util.parse_datetime(planned)).total_seconds() / 60)
                
                diff = int((dt_p - now).total_seconds() / 60) + delay
                if diff >= -1:
                    final.append({
                        "line": l_line,
                        "direction": dest,
                        "scheduled": dt_p.strftime("%H:%M"),
                        "countdown": max(0, diff),
                        "delay": delay,
                        "infos": ""
                    })
            return sorted(final, key=lambda x: x["countdown"])
        except Exception as e:
            _LOGGER.error("Fehler für %s: %s", self.stop_name, e)
            return []

class LinzAGDepartureSensor(CoordinatorEntity, SensorEntity):
    def __init__(self, coordinator, stop_id, name, entry_id, index):
        super().__init__(coordinator)
        self._index, self._stop_id, self._name = index, stop_id, name
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
            return {"departureList": self.coordinator.data, "station_name": self._name}
        return {}
