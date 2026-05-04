import logging
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_track_time_change
from .gtfs_helper import GTFSHelper

DOMAIN = "linz_ag_monitor"
PLATFORMS = ["sensor"]
_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    # Erstelle den globalen Speicherplatz für die Integration
    hass.data.setdefault(DOMAIN, {})

    # Starte den GTFS-Manager nur, wenn er noch nicht läuft
    if "gtfs_helper" not in hass.data[DOMAIN]:
        _LOGGER.info("Initialisiere zentralen Linz AG GTFS Manager")
        helper = GTFSHelper(hass)
        hass.data[DOMAIN]["gtfs_helper"] = helper

        # Beim allerersten Start: Datenbank sofort bauen
        await helper.update_database_if_needed()

        # Nächtliches Update um 03:00 Uhr einrichten
        async def _nightly_update(_now):
            _LOGGER.info("Starte nächtlichen Download der Fahrplandaten...")
            await helper.download_and_build_db()

        async_track_time_change(hass, _nightly_update, hour=3, minute=0, second=0)

    # Sensoren starten
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    return await hass.config_entries.async_forward_entry_unload(entry, "sensor")
