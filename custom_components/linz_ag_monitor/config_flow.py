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
        """Entfernt Orts-Präfixe nur am Anfang, lässt sie am Ende stehen."""
        if not text: return "Unbekannt"
        
        text = text.strip()
        
        # Ort-Präfixe (Stadt + Komma/Leerzeichen) NUR am ANFANG entfernen
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
                
        # Eigene Behandlung für „JKU | “
        if text.startswith("JKU | "):
            if text.strip() == "JKU |":
                text = "Universität"
            else:
                text = text[len("JKU | "):]
        
        # Störende Suffixe bei Fahrtrichtungen entfernen
        text = text.replace(" - Traun OÖ", "").replace(" - Steyregg", "").replace(" - Bergham b.Linz", "")
        
        if text == "Linz/Donau": text = "Linz"
        if text == "Traun OÖ": text = "Traun"
        
        return text.strip(" ,-")

    def _extract_stop_id(self, p):
        """Extrahiert die echte numerische ID (z.B. 60400001) aus dem API-Salat."""
        raw_id = p.get("id", "")
        stop_id = raw_id
        # Sucht im String A=1@...L=60400001@... nach der eigentlichen ID
        if "L=" in raw_id:
            for part in raw_id.split("@"):
                if part.startswith("L="):
                    stop_id = part[2:]
                    break
        
        if not stop_id:
            stop_id = p.get("stateless")
            
        return stop_id

    async def async_step_user(self, user_input=None):
        """Erster Schritt: Auswahl zwischen Text- und Kartensuche."""
        return self.async_show_menu(
            step_id="user",
            menu_options=["text_search", "map_search"]
        )

    async def _search_api_text(self, search_term):
        """Sucht über den klassischen Namen."""
        session = async_get_clientsession(self.hass)
        url = "https://www.linzag.at/static/XML_STOPFINDER_REQUEST"
        params = {
            "sessionID": "0",
            "locationServerActive": "1",
            "type_sf": "any",
            "name_sf": search_term,
            "outputFormat": "JSON",
            "coordOutputFormat": "WGS84[dd.ddddd]",
            "limit": "60"
        }
        
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
                    # Hier wird nun die saubere, 8-stellige ID geholt!
                    stop_id = self._extract_stop_id(p)
                    stop_name = p.get("name")
                    
                    if stop_id and stop_name:
                        clean_name = self._clean_name(stop_name)
                        if clean_name and clean_name not in seen_names:
                            seen_names.add(clean_name)
                            self.found_stops[stop_id] = {
                                "display": clean_name,
                                "clean": clean_name
                            }

                if not self.found_stops:
                    return "no_stops_found"
                return None
                
        except Exception as e:
            _LOGGER.error("Linz AG Textsuche Fehler: %s", e)
            return "cannot_connect"

    async def _search_api_coords(self, lat, lon, radius):
        """Sucht über die GPS Umkreissuche der Linz AG."""
        session = async_get_clientsession(self.hass)
        url = "https://www.linzag.at/static/XML_COORD_REQUEST"
        params = {
            "sessionID": "0",
            "locationServerActive": "1",
            "outputFormat": "JSON",
            "coord": f"{lon}:{lat}:WGS84[dd.ddddd]",
            "max": "50",
            "inclFilter": "1",
            "type_1": "STOP",
            "radius_1": str(int(radius))
        }
        
        try:
            async with session.get(url, params=params, headers=HEADERS, ssl=False, timeout=15) as response:
                if response.status != 200:
                    return "cannot_connect"
                
                data = await response.json(content_type=None)
                pins = data.get("pins", [])
                
                if isinstance(pins, dict):
                    pins = [pins]

                self.found_stops = {}
                seen_names = set()
                
                for p in pins:
                    if str(p.get("type", "")).upper() == "STOP":
                        # Hier wird nun die saubere, 8-stellige ID geholt!
                        stop_id = self._extract_stop_id(p)
                        stop_name = p.get("desc") or p.get("name")
                        
                        if stop_id and stop_name:
                            clean_name = self._clean_name(stop_name)
                            if clean_name and clean_name not in seen_names:
                                seen_names.add(clean_name)
                                
                                dist = p.get("distance")
                                display_name = f"{clean_name} ({dist}m)" if dist else clean_name
                                
                                self.found_stops[stop_id] = {
                                    "display": display_name,
                                    "clean": clean_name
                                }

                if not self.found_stops:
                    return "no_stops_found"
                return None
                
        except Exception as e:
            _LOGGER.error("Linz AG Umkreissuche Fehler: %s", e)
            return "cannot_connect"

    async def async_step_text_search(self, user_input=None):
        """Schritt 2a: Klassische Textsuche."""
        errors = {}
        if user_input is not None:
            error = await self._search_api_text(user_input["search_term"])
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
            radius = user_input["location"]["radius"]
            
            error = await self._search_api_coords(lat, lon, radius)
            if error:
                errors["base"] = error
            else:
                return await self.async_step_select()

        default_loc = {
            "latitude": self.hass.config.latitude,
            "longitude": self.hass.config.longitude,
            "radius": 500
        }

        return self.async_show_form(
            step_id="map_search",
            data_schema=vol.Schema({
                vol.Required("location", default=default_loc): selector.LocationSelector(
                    selector.LocationSelectorConfig(radius=True, icon="mdi:map-marker-radius")
                ),
            }),
            errors=errors,
        )

    async def async_step_select(self, user_input=None):
        """Schritt 3: Das Dropdown-Menü mit den gefundenen Haltestellen."""
        if user_input is not None:
            stop_id = user_input["stop_id"]
            stop_info = self.found_stops[stop_id]
            
            return self.async_create_entry(
                title=stop_info["clean"],
                data={"stop_id": stop_id, "name": stop_info["clean"]}
            )

        dropdown_options = {
            stop_id: info["display"] for stop_id, info in self.found_stops.items()
        }
        sorted_stops = dict(sorted(dropdown_options.items(), key=lambda item: item[1]))

        return self.async_show_form(
            step_id="select",
            data_schema=vol.Schema({
                vol.Required("stop_id"): vol.In(sorted_stops),
            }),
        )
