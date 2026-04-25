import voluptuous as vol
import logging
from homeassistant import config_entries
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers import selector

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

    def _clean_name(self, text):
        """Entfernt lästige Präfixe sicher, ohne echte Straßennamen zu beschädigen."""
        if not text: return "Unbekannt"
        
        to_remove = ["Linz/Donau, ", "Linz/Donau", "Leonding, ", "Leonding", "Steyregg, ", "- Steyregg", "Steyregg", "Traun OÖ, ", "- Traun OÖ", "Traun OÖ", "Bergham b.Linz, ", "- Bergham b.Linz", "Bergham b.Linz"]
        for r in to_remove:
            text = text.replace(r, "")
            
        # 'Linz ' nur am Anfang entfernen, damit z.B. 'Linzer Straße' nicht kaputt geht
        if text.startswith("Linz "):
            text = text[5:]
            
        return text.replace(",", "").strip("- ").strip()

    async def async_step_user(self, user_input=None):
        """Erster Schritt: Auswahl zwischen Text- und Kartensuche."""
        return self.async_show_menu(
            step_id="user",
            menu_options=["text_search", "map_search"]
        )

    async def _search_api(self, params):
        """Zentrale Funktion, um die API für beide Suchmethoden abzufragen."""
        session = async_get_clientsession(self.hass)
        url = "https://www.linzag.at/static/XML_STOPFINDER_REQUEST"
        
        try:
            async with session.get(url, params=params, headers=HEADERS, ssl=False, timeout=15) as response:
                if response.status != 200:
                    return "cannot_connect"
                
                data = await response.json(content_type=None)
                points = data.get("stopFinder", {}).get("points", [])
                
                if isinstance(points, dict):
                    points = [points]

                self.found_stops = {}
                seen_names = set()
                
                for p in points:
                    stop_id = p.get("stateless") or p.get("id")
                    stop_name = p.get("name")
                    
                    if stop_id and stop_name:
                        clean_name = self._clean_name(stop_name)
                        if clean_name and clean_name not in seen_names:
                            seen_names.add(clean_name)
                            self.found_stops[stop_id] = clean_name

                if not self.found_stops:
                    return "no_stops_found"
                return None
                
        except Exception as e:
            _LOGGER.error("Linz AG Verbindungsfehler: %s", e)
            return "cannot_connect"

    async def async_step_text_search(self, user_input=None):
        """Schritt 2a: Klassische Textsuche."""
        errors = {}
        if user_input is not None:
            params = {
                "sessionID": "0",
                "locationServerActive": "1",
                "type_sf": "any",
                "name_sf": user_input["search_term"],
                "outputFormat": "JSON",
                "coordOutputFormat": "WGS84[dd.ddddd]",
                "limit": "60"
            }
            error = await self._search_api(params)
            if error:
                errors["base"] = error
            else:
                return await self.async_step_select()

        return self.async_show_form(
            step_id="text_search",
            data_schema=vol.Schema({
                vol.Required("search_term"): str,
            }),
            errors=errors,
        )

    async def async_step_map_search(self, user_input=None):
        """Schritt 2b: Die neue Suche über die interaktive Karte."""
        errors = {}
        if user_input is not None:
            lat = user_input["location"]["latitude"]
            lon = user_input["location"]["longitude"]
            
            # Die Linz AG API erwartet die Koordinaten im Format: longitude:latitude:WGS84
            params = {
                "sessionID": "0",
                "locationServerActive": "1",
                "type_sf": "coord",
                "name_sf": f"{lon}:{lat}:WGS84[dd.ddddd]",
                "outputFormat": "JSON",
                "coordOutputFormat": "WGS84[dd.ddddd]",
                "limit": "40" # Sucht die nächsten 40 Haltestellen im Umkreis
            }
            error = await self._search_api(params)
            if error:
                errors["base"] = error
            else:
                return await self.async_step_select()

        return self.async_show_form(
            step_id="map_search",
            data_schema=vol.Schema({
                vol.Required("location"): selector.LocationSelector(
                    selector.LocationSelectorConfig(radius=True, icon="mdi:map-marker-radius")
                ),
            }),
            errors=errors,
        )

    async def async_step_select(self, user_input=None):
        """Schritt 3: Das Dropdown-Menü mit den gefundenen Haltestellen."""
        if user_input is not None:
            stop_id = user_input["stop_id"]
            stop_name = self.found_stops[stop_id]
            return self.async_create_entry(
                title=stop_name,
                data={"stop_id": stop_id, "name": stop_name}
            )

        # Alphabetische Sortierung für das Dropdown
        sorted_stops = dict(sorted(self.found_stops.items(), key=lambda item: item[1]))

        return self.async_show_form(
            step_id="select",
            data_schema=vol.Schema({
                vol.Required("stop_id"): vol.In(sorted_stops),
            }),
        )
