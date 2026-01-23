import logging
import async_timeout
import homeassistant.util.dt as dt_util
from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.aiohttp_client import async_get_clientsession

_LOGGER = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "application/json"
}

async def async_setup_entry(hass, config_entry, async_add_entities):
    stop_id = config_entry.data.get("stop_id")
    name = config_entry.data.get("name")
    session = async_get_clientsession(hass)
    async_add_entities([LinzAGSensor(session, stop_id, name, config_entry.entry_id)], True)

class LinzAGSensor(SensorEntity):
    def __init__(self, session, stop_id, name, entry_id):
        self._session = session
        self._stop_id = stop_id
        self._attr_name = name
        self._attr_unique_id = f"linz_ag_{stop_id}_{entry_id}"
        self._attr_has_entity_name = False 
        self._attr_icon = "mdi:tram"
        self._state = None
        self._attr_extra_state_attributes = {}
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

    @property
    def state(self):
        return self._state

    async def async_update(self):
        try:
            async with async_timeout.timeout(15):
                response = await self._session.get(self._url, params=self._params, headers=HEADERS, ssl=False)
                data = await response.json(content_type=None)

            events = data.get("stopEvents", [])
            parsed = []
            now = dt_util.now()

            for event in events:
                trans = event.get("transportation", {})
                planned_str = event.get("departureTimePlanned")
                estimated_str = event.get("departureTimeEstimated", planned_str)
                
                if not planned_str: continue

                dt_planned = dt_util.parse_datetime(planned_str)
                dt_estimated = dt_util.parse_datetime(estimated_str)
                
                countdown = round((dt_estimated - now).total_seconds() / 60)
                delay = round((dt_estimated - dt_planned).total_seconds() / 60)

                # --- NEU: LOGIK AUS PROXY.PHP NACHGEBAUT ---
                collected_infos = []

                # 1. HINTS (Echtzeit-Kurzmeldungen)
                hints = event.get("hints", [])
                for hint in hints:
                    content = hint.get("content")
                    if content: collected_infos.append(content)

                # 2. INFOS (Bauarbeiten / Längere Meldungen)
                infos = event.get("infos", [])
                for info in infos:
                    # Die Texte liegen oft tief in 'infoLinks'
                    links = info.get("infoLinks", [])
                    for link in links:
                        # Priorität: urlText -> subtitle
                        text = link.get("urlText") or link.get("subtitle")
                        if text: collected_infos.append(text)

                # Alles zu einem String verbinden
                info_string = " +++ ".join(collected_infos)

                parsed.append({
                    "line": trans.get("number", trans.get("disassembledName", "?")),
                    "direction": trans.get("destination", {}).get("name", "Unbekannt"),
                    "countdown": max(0, countdown),
                    "scheduled": dt_util.as_local(dt_planned).strftime("%H:%M"),
                    "delay": max(0, delay),
                    "cancelled": event.get("isCancelled", False),
                    "infos": info_string # Dieses Feld wird nun zuverlässig befüllt
                })

            parsed.sort(key=lambda x: x["countdown"])
            self._state = len(parsed)
            self._attr_extra_state_attributes = {
                "departureList": parsed,
                "stop_id": self._stop_id,
                "stop_name": self._attr_name,
                "last_update": now.strftime("%H:%M:%S")
            }

        except Exception as e:
            _LOGGER.error("Linz AG Sensor Fehler: %s", e)