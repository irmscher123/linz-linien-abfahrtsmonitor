import logging
from pathlib import Path
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.components.http import StaticPathConfig

_LOGGER = logging.getLogger(__name__)

DOMAIN = "linz_ag_monitor"
PLATFORMS = ["sensor"]

URL_BASE = "/linz_ag_monitor"

async def async_setup(hass: HomeAssistant, config: dict):
    """Set up the Linz AG Monitor component."""
    frontend_path = Path(__file__).parent / "frontend"
    
    if frontend_path.exists():
        await hass.http.async_register_static_paths([
            StaticPathConfig(
                URL_BASE,
                str(frontend_path),
                cache_headers=True
            )
        ])
        _LOGGER.debug("Linz AG Monitor Frontend-Ressourcen registriert unter: %s", URL_BASE)
    
    return True

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    return await hass.config_entries.async_forward_entry_unload(entry, "sensor")
