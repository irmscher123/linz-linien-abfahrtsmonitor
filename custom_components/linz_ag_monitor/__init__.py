from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from .gtfs_helper import GTFSHelper

DOMAIN = "linz_ag_monitor"
PLATFORMS = ["sensor"]

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    stop_id = entry.data.get("stop_id")
    name = entry.data.get("name")
    
    helper = GTFSHelper(hass, stop_id, name)
    await helper.update_database_if_needed()
    
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = helper

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    return await hass.config_entries.async_forward_entry_unload(entry, "sensor")
