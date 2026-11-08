import logging
from pathlib import Path
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.helpers import config_validation as cv

DOMAIN = "linz_ag_monitor"
PLATFORMS = ["sensor"]
VERSION = "1.8.10"

URL_BASE = "/linz_ag_monitor"
CARD_FILE = "linz-linien-combined.js"

# Integration wird nur per UI (Config Entry) eingerichtet
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

_LOGGER = logging.getLogger(__name__)

async def async_setup(hass: HomeAssistant, config: dict):
    """Set up the Linz AG component."""
    hass.data.setdefault(DOMAIN, {})

    # Dashboard-Karte bereitstellen und automatisch im Frontend laden.
    # ?v=... erzwingt nach Updates das Neuladen trotz Browser-Cache.
    frontend_path = Path(__file__).parent / "frontend"
    if frontend_path.exists():
        await hass.http.async_register_static_paths([
            StaticPathConfig(URL_BASE, str(frontend_path), cache_headers=True)
        ])
        add_extra_js_url(hass, f"{URL_BASE}/{CARD_FILE}?v={VERSION}")
        _LOGGER.debug("Linz AG Monitor Karte registriert unter: %s", URL_BASE)

    return True

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry):
    """Set up Linz AG from a config entry."""
    hass.data[DOMAIN][entry.entry_id] = entry.data
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry):
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unload_ok
