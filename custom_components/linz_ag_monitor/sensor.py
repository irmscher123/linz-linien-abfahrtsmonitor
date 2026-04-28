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
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "application/json"
}


async def async_setup_entry(hass, config_entry, async_add_entities):
    stop_id = config_entry.data.get("stop_id")
    name = config_entry.data.get("name")
    session = async_get_clientsession(hass)
    
    coordinator = LinzAGCoordinator(hass, session, stop_id, name)
    
    # ---------------------------------------------------------
    # SPAMSCHUTZ: Warteschlange beim Start (Thundering Herd Protection)
    # Verhindert, dass bei 20 Haltestellen alle in der selben 
    # Millisekunde feuern und die Firewall der Linz AG auslösen.
    # ---------------------------------------------------------
    await asyncio.sleep(random.uniform(1, 15))
    
    await coordinator.async_config_entry_first_refresh()

    entities = []
    for i in range(5):
        entities.append(LinzAGDepartureSensor(coordinator, stop_id, name, config_entry.entry_id, i))
        
    async_add_entities(entities, False)


class LinzAGCoordinator(DataUpdateCoordinator):
    def __init__(self, hass, session, stop_id, name):
        super().__init__(
            hass,
            _LOGGER,
            name=f"LinzAG {name}",
            update_interval=timedelta(seconds=30)
        )
        self._session = session
        self._stop_id = stop_id
        self.stop_name = name
        self._gtfs_helper = GTFSHelper(hass, stop_id, name)
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

    def _clean_name(self, text):
        """Entfernt Orts-Präfixe nur am Anfang, lässt sie am Ende stehen."""
        if not text:
            return "Unbekannt"
        
        text = text.strip()
        
        prefixes = [
            "Linz/Donau, ", "Linz/Donau ",
            "Leonding, ",
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
        
        if text == "Linz/Donau":
            text = "Linz"
        if text == "Traun OÖ":
            text = "Traun"
        
        return text.strip(" ,-")

    async def _nightly_gtfs_update(self, _now):
        _LOGGER.info("Starte nächtliches GTFS-Update für %s...", self.stop_name)
        await self._gtfs_helper._download_and_build_db()

    async def _async_update_data(self):
        try:
            await self._gtfs_helper.update_database_if_needed()
            departures = await self._gtfs_helper.get_next_departures(limit=150)
            
            for entry in departures:
                entry["infos"] = ""
                entry["cancelled"] = False

            async with async_timeout.timeout(15):
                response = await self._session.get(self._url, params=self._params, headers=HEADERS, ssl=False)
                
                if response.status != 200:
                    raise UpdateFailed(f"API antwortet mit Status {response.status}")
                
                try:
                    data = await response.json(content_type=None)
                except Exception:
                    raise UpdateFailed("API blockiert / liefert kein gültiges JSON (Spamschutz aktiv)")

            events = data.get("stopEvents", [])
            now = dt_util.now()

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

                collected_infos = []
                for hint in event.get("hints", []):
                    if content := hint.get("content"):
                        collected_infos.append(content)
                for info in event.get("infos", []):
                    for link in info.get("infoLinks", []):
                        if text := (link.get("urlText") or link.get("subtitle")):
                            collected_infos.append(text)
                info_string = " +++ ".join(collected_infos)

                for entry in departures:
                    if entry["line"] == l_line and entry["scheduled"] == p_time:
                        entry["is_realtime"] = True
                        entry["delay"] = max(0, delay)
                        entry["cancelled"] = event.get("isCancelled", False)
                        entry["infos"] = info_string
                        
                        raw_direction = trans.get("destination", {}).get("name", "Unbekannt")
                        entry["direction"] = self._clean_name(raw_direction)
                        break

            my_station_clean = self._clean_name(self.stop_name).lower()
            filtered_departures = []
            
            for entry in departures:
                h, m = map(int, entry["scheduled"].split(":"))
                sched_ts = now.replace(hour=h, minute=m, second=0, microsecond=0)
                
                if sched_ts < now and now.hour > 12 and h < 12:
                    sched_ts += timedelta(days=1)
                
                diff = int((sched_ts - now).total_seconds() / 60) + entry.get("delay", 0)
                entry["countdown"] = max(0, diff)
                
                dest_clean = entry["direction"].lower()
                if dest_clean == my_station_clean:
                    continue
                    
                filtered_departures.append(entry)

            filtered_departures.sort(key=lambda x: x["countdown"])
            return filtered_departures

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
            "name": name,
            "manufacturer": "Linz AG Monitor",
            "model": "Haltestelle"
        }
        
        self._attr_has_entity_name = True
        
        if index == 0:
            self._attr_name = "Nächste Abfahrt"
        else:
            self._attr_name = f"Abfahrt {index + 1}"
            
        self._attr_unique_id = f"linz_ag_{stop_id}_{entry_id}_{index}"
        self._attr_icon = "mdi:tram"

    async def async_added_to_hass(self):
        await super().async_added_to_hass()
        if self._index == 0:
            self.async_on_remove(
                async_track_time_change(
                    self.hass, 
                    self.coordinator._nightly_gtfs_update, 
                    hour=2, minute=0, second=0
                )
            )

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
