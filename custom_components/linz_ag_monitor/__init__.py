from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from .gtfs_helper import GTFSHelper

DOMAIN = "linz_ag_monitor"
PLATFORMS = ["sensor"]

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Setup Linz AG Monitor aus einem Config Entry."""
    # Holt die Daten aus deiner Konfiguration
    stop_id = entry.data.get("stop_id")[cite: 2]
    name = entry.data.get("name")[cite: 2]
    
    # Initialisiert deinen GTFSHelper korrekt mit 2 Argumenten[cite: 3]
    helper = GTFSHelper(hass, stop_id, name)[cite: 3]
    await helper.update_database_if_needed()[cite: 3]
    
    # Speichert den Helper, damit der Sensor darauf zugreifen kann
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = helper

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)[cite: 1]
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Entlade einen Eintrag."""
    return await hass.config_entries.async_forward_entry_unload(entry, "sensor")[cite: 1]
