import logging
import asyncio
import aiohttp
import random
from datetime import timedelta
import homeassistant.util.dt as dt_util
from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, CoordinatorEntity, UpdateFailed

_LOGGER = logging.getLogger(__name__)

# Temperatur am Ort der Haltestelle (Open-Meteo, frei ohne Schlüssel)
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
WEATHER_INTERVAL = timedelta(minutes=10)
FALLBACK_COORD = (48.3059, 14.2862)   # Linz Zentrum, falls die Haltestelle keine Koordinaten liefert

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
    # SPAMSCHUTZ: Warteschlange beim Start 
    # Verhindert, dass alle Haltestellen zeitgleich feuern
    # ---------------------------------------------------------
    await asyncio.sleep(random.uniform(1, 15))
    
    await coordinator.async_config_entry_first_refresh()

    entities = []
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
            update_interval=timedelta(seconds=60) # Erhöht auf 60s wegen API Limits bei vielen Sensoren
        )
        self._session = session
        # Zertifikat wird geprüft. Nur falls die Linz AG ein fehlerhaftes
        # Zertifikat ausliefert, wird (mit Warnung im Log) ohne Prüfung weitergemacht.
        self._ssl_verify = True
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
            "coordOutputFormat": "EPSG:4326",
            "limit": "40"
        }
        self.temperature = None
        self._coord = None
        self._weather_next = None

    async def _fetch(self):
        """Ein Abruf der Abfahrten, Antwort wird sauber freigegeben."""
        async with asyncio.timeout(15):
            async with self._session.get(
                self._url, params=self._params, headers=HEADERS, ssl=self._ssl_verify
            ) as response:
                if response.status != 200:
                    raise UpdateFailed(f"API antwortet mit Status {response.status}")
                try:
                    return await response.json(content_type=None)
                except Exception:
                    raise UpdateFailed("API blockiert / liefert kein gültiges JSON (Spamschutz aktiv)")

    @staticmethod
    def _stop_coord(data):
        """Koordinaten (lat, lon) der Haltestelle aus der Antwort – nur plausible Werte in Österreich."""
        cands = []
        locs = data.get("locations") or []
        if locs and isinstance(locs[0], dict):
            cands.append(locs[0].get("coord"))
        events = data.get("stopEvents") or []
        if events and isinstance(events[0], dict):
            loc = events[0].get("location") or {}
            cands += [loc.get("coord"), (loc.get("parent") or {}).get("coord")]
        for c in cands:
            if not isinstance(c, (list, tuple)) or len(c) < 2:
                continue
            try:
                a, b = float(c[0]), float(c[1])
            except (TypeError, ValueError):
                continue
            if 46 < a < 49.5 and 9 < b < 17.5:
                return (a, b)
            if 46 < b < 49.5 and 9 < a < 17.5:
                return (b, a)
        return None

    async def _update_temperature(self):
        """Temperatur am Ort der Haltestelle, alle 10 Minuten. Fehler ändern nichts an den Abfahrten."""
        now = dt_util.utcnow()
        if self._weather_next and now < self._weather_next:
            return
        self._weather_next = now + WEATHER_INTERVAL
        lat, lon = self._coord or FALLBACK_COORD
        params = {"latitude": f"{lat:.2f}", "longitude": f"{lon:.2f}",
                  "current": "temperature_2m", "timezone": "Europe/Vienna"}
        try:
            async with asyncio.timeout(10):
                async with self._session.get(WEATHER_URL, params=params) as response:
                    if response.status != 200:
                        return
                    data = await response.json(content_type=None)
            value = (data.get("current") or {}).get("temperature_2m")
            if isinstance(value, (int, float)):
                self.temperature = round(float(value), 1)
        except Exception as err:   # Wetter ist nur Zusatz – letzter Wert bleibt stehen
            _LOGGER.debug("Linz AG: Temperatur nicht abrufbar: %s", err)

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
        
        # --- KORREKTUR FÜR JKU ---
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
            try:
                data = await self._fetch()
            except aiohttp.ClientConnectorCertificateError as err:
                if not self._ssl_verify:
                    raise
                _LOGGER.warning(
                    "Linz AG: SSL-Zertifikat ungültig (%s) – Abfrage erfolgt ab jetzt ohne Zertifikatsprüfung", err
                )
                self._ssl_verify = False
                data = await self._fetch()

            events = data.get("stopEvents", [])
            if self._coord is None:
                self._coord = self._stop_coord(data)
            await self._update_temperature()
            now = dt_util.now()
            departures = []
            my_station_clean = self._clean_name(self.stop_name).lower()

            for event in events:
                if not isinstance(event, dict):
                    continue
                trans = event.get("transportation", {})
                planned_str = event.get("departureTimePlanned")
                estimated_str = event.get("departureTimeEstimated", planned_str)

                if not planned_str:
                    continue

                dt_planned = dt_util.parse_datetime(planned_str)
                dt_estimated = dt_util.parse_datetime(estimated_str) or dt_planned
                if dt_planned is None:
                    continue
                
                p_time = dt_util.as_local(dt_planned).strftime("%H:%M")
                l_line = trans.get("number", trans.get("disassembledName", "?"))
                delay = round((dt_estimated - dt_planned).total_seconds() / 60)
                
                raw_direction = trans.get("destination", {}).get("name", "Unbekannt")
                direction_clean = self._clean_name(raw_direction)

                # Eigene Haltestelle als Richtung herausfiltern
                if direction_clean.lower() == my_station_clean:
                    continue

                # Infos und Störungsmeldungen sammeln
                collected_infos = []
                for hint in event.get("hints", []):
                    if content := hint.get("content"):
                        collected_infos.append(content)
                for info in event.get("infos", []):
                    for link in info.get("infoLinks", []):
                        if text := (link.get("urlText") or link.get("subtitle")):
                            collected_infos.append(text)
                info_string = " +++ ".join(collected_infos)

                # Countdown basierend auf geschätzter Live-Zeit berechnen
                cd_minutes = int((dt_estimated - now).total_seconds() / 60)
                
                # Abfahrten, die bereits über 1 Minute in der Vergangenheit liegen, ignorieren
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

            # Sortieren nach echter Wartezeit
            departures.sort(key=lambda x: x["countdown"])
            return departures

        except UpdateFailed:
            raise
        except Exception as e:
            _LOGGER.error("Linz AG Sensor Fehler: %s", e)
            raise UpdateFailed(f"Fehler beim Abrufen der Daten: {e}")


class LinzAGDepartureSensor(CoordinatorEntity, SensorEntity):
    # Die große Abfahrtsliste nicht in die Recorder-Datenbank schreiben
    # (bis zu 100 Einträge, ändert sich jede Minute -> bläht die DB auf).
    _unrecorded_attributes = frozenset({"departureList", "last_update", "temperature"})
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

    @property
    def native_value(self):
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
                "last_update": dt_util.now().strftime("%H:%M:%S"),
                "temperature": self.coordinator.temperature,
            }
        return {}
