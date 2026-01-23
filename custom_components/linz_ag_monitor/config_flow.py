import voluptuous as vol
import logging
from homeassistant import config_entries
from homeassistant.helpers.aiohttp_client import async_get_clientsession

DOMAIN = "linz_ag_monitor"
_LOGGER = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "application/json"
}

class LinzAGFlowHandler(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    def __init__(self):
        self.found_stops = {}

    async def async_step_user(self, user_input=None):
        errors = {}
        
        if user_input is not None:
            search_term = user_input["search_term"]
            session = async_get_clientsession(self.hass)
            
            # Basis-URL
            url = "https://www.linzag.at/static/XML_STOPFINDER_REQUEST"
            
            params = {
                "sessionID": "0",
                "locationServerActive": "1",
                "type_sf": "any",  # 'any' ist zwingend für Straßennamen wie 'Rudolfstraße'
                "name_sf": search_term,
                "outputFormat": "JSON",
                "coordOutputFormat": "WGS84[dd.ddddd]", # Verbessert die Objekterkennung
                "limit": "60"
            }

            try:
                async with session.get(url, params=params, headers=HEADERS, ssl=False, timeout=15) as response:
                    if response.status != 200:
                        _LOGGER.error("Linz AG API Fehler: HTTP %s", response.status)
                        errors["base"] = "cannot_connect"
                    else:
                        data = await response.json(content_type=None)
                        # Die Struktur der API kann variieren
                        finder = data.get("stopFinder", {})
                        points = finder.get("points", [])
                        
                        # Falls nur ein Punkt gefunden wurde, liefert die API ein Dict statt einer Liste
                        if isinstance(points, dict):
                            points = [points]

                        self.found_stops = {}
                        for p in points:
                            # Wir nehmen nur Einträge, die eine ID haben und vom Typ 'stop' oder 'poi' sind
                            # 'stateless' ist die stabilste ID für Custom Cards
                            stop_id = p.get("stateless") or p.get("id")
                            stop_name = p.get("name")
                            
                            # Filter: Wir wollen keine reinen Adressen ohne Haltestellen-ID
                            if stop_id and stop_name:
                                # Bereinigung der Präfixe für die Auswahl
                                clean_name = stop_name.replace("Linz/Donau, ", "").replace("Leonding, ", "").replace("Linz ", "").replace("Leonding ", "").strip()
                                
                                # Manchmal gibt die API doppelte IDs zurück, wir nehmen den Namen mit der besten Übereinstimmung
                                self.found_stops[stop_id] = clean_name

                        if not self.found_stops:
                            _LOGGER.warning("Keine Haltestellen für '%s' gefunden. API Antwort: %s", search_term, data)
                            errors["base"] = "no_stops_found"
                        else:
                            return await self.async_step_select()
                            
            except Exception as e:
                _LOGGER.error("Linz AG Verbindungsfehler: %s", e)
                errors["base"] = "cannot_connect"

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({
                vol.Required("search_term"): str,
            }),
            errors=errors,
        )

    async def async_step_select(self, user_input=None):
        if user_input is not None:
            stop_id = user_input["stop_id"]
            stop_name = self.found_stops[stop_id]
            return self.async_create_entry(
                title=stop_name,
                data={"stop_id": stop_id, "name": stop_name}
            )

        # Sortierung für eine schöne Liste
        sorted_stops = dict(sorted(self.found_stops.items(), key=lambda item: item[1]))

        return self.async_show_form(
            step_id="select",
            data_schema=vol.Schema({
                vol.Required("stop_id"): vol.In(sorted_stops),
            }),
        )