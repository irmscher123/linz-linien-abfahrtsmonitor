from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from .gtfs_helper import GTFSHelper

DOMAIN = "linz_ag_monitor"
PLATFORMS = ["sensor"]

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Setup Linz AG Monitor aus einem Config Entry."""
    stop_id = entry.data.get("stop_id")
    name = entry.data.get("name")
    
    # Initialisiert den Helper korrekt (2 Argumente laut deiner gtfs_helper.py)
    helper = GTFSHelper(hass, stop_id, name)
    await helper.update_database_if_needed()
    
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Entlade einen Eintrag."""
    return await hass.config_entries.async_forward_entry_unload(entry, "sensor")
