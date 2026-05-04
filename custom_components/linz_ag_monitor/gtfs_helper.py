import os
import sqlite3
import csv
import io
import aiohttp
from datetime import datetime, timedelta

class GTFSHelper:
    def __init__(self, hass, stop_id, stop_name):
        self.hass = hass
        self.stop_id = stop_id
        self.stop_name = stop_name
        self.db_path = os.path.join(self.hass.config.path("linz_ag_gtfs"), f"gtfs_{stop_id}.sqlite")

    def _clean_name(self, text):
        if not text: return "Unbekannt"
        text = text.strip()
        if "|" in text: text = text.split("|")[-1].strip()
        prefixes = ["Linz/Donau, ", "Linz/Donau ", "Leonding, ", "Leonding ", "Steyregg, ", "Steyregg ", "Traun OÖ, ", "Traun OÖ ", "Bergham b.Linz, ", "Linz, ", "Linz "]
        for p in prefixes:
            if text.startswith(p):
                text = text[len(p):]
                break
        return text.strip(" ,-")

    async def update_database_if_needed(self):
        # Wird nur aufgerufen, wenn Datei fehlt
        if not os.path.exists(self.db_path):
            # Hier müsste dein _download_and_build_db Aufruf hin
            pass

    async def get_next_departures(self, limit=150):
        if not os.path.exists(self.db_path): return []
        # ... Rest deiner originalen get_next_departures Logik ...
        return []
