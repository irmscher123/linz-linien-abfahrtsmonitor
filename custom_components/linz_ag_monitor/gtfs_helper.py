import aiohttp
import os
import sqlite3
import logging
from datetime import datetime, timedelta
import csv
import io

_LOGGER = logging.getLogger(__name__)

BASE_GTFS_URL = "https://www.irmscher.at/linzag/live/gtfs"

class GTFSHelper:
    def __init__(self, hass):
        self.hass = hass
        self.db_dir = self.hass.config.path("linz_ag_gtfs")
        
        if not os.path.exists(self.db_dir):
            os.makedirs(self.db_dir)
            
        self.db_path = os.path.join(self.db_dir, "linzag_global.sqlite")

    async def update_database_if_needed(self):
        needs_update = True
        if os.path.exists(self.db_path):
            try:
                def check_db():
                    conn = sqlite3.connect(self.db_path)
                    cursor = conn.cursor()
                    # Versions-Check 1.7: Erzwingt ein sauberes Update ohne Altlasten
                    cursor.execute("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='db_version_1_7'")
                    res = cursor.fetchone()[0]
                    conn.close()
                    return res > 0
                
                is_current = await self.hass.async_add_executor_job(check_db)
                if is_current:
                    needs_update = False
            except Exception:
                pass

        if needs_update:
            _LOGGER.warning("Datenbank-Update (Version 1.7) wird im Hintergrund durchgeführt...")
            await self.download_and_build_db()

    async def _fetch_csv(self, session, filename):
        try:
            async with session.get(f"{BASE_GTFS_URL}/{filename}") as response:
                if response.status == 200:
                    text = await response.text(encoding='utf-8-sig')
                    return list(csv.DictReader(io.StringIO(text)))
        except Exception as e:
            _LOGGER.error("Fehler beim Download von %s: %s", filename, e)
        return []

    async def download_and_build_db(self):
        async with aiohttp.ClientSession() as session:
            routes = await self._fetch_csv(session, "routes.txt")
            trips = await self._fetch_csv(session, "trips.txt")
            stop_times = await self._fetch_csv(session, "stop_times.txt")
            calendar = await self._fetch_csv(session, "calendar.txt")
            calendar_dates = await self._fetch_csv(session, "calendar_dates.txt")

            if routes and trips and stop_times:
                await self.hass.async_add_executor_job(
                    self._process, routes, trips, stop_times, calendar, calendar_dates
                )

    def _clean_name(self, text):
        if not text: return "Unbekannt"
        text = text.strip()
        
        if text.startswith("JKU |"):
            if text.strip() == "JKU |": text = "Universität"
            else: text = text[len("JKU | "):]
        elif "|" in text:
            parts = [part.strip() for part in text.split("|")]
            text = parts[-1]
            
        prefixes = [
            "Linz/Donau, ", "Linz/Donau ", "Leonding, ", "Leonding ",
            "Steyregg, ", "Steyregg ", "Traun OÖ, ", "Traun OÖ ", 
            "Traun, ", "Traun ", "Bergham b.Linz, ", "Bergham b.Linz ",
            "Linz, ", "Linz "
        ]
        for p in prefixes:
            if text.startswith(p):
                text = text[len(p):]
                break
                
        suffixes = [" - Traun OÖ", " - Steyregg", " - Bergham b.Linz", " - Leonding"]
        for s in suffixes:
            text = text.replace(s, "")
            
        if text == "Linz/Donau": text = "Linz"
        if text == "Traun OÖ": text = "Traun"
        return text.strip(" ,-")

    def _process(self, routes, trips, stop_times, calendar, calendar_dates):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for table in ["stop_times", "trips", "routes", "calendar", "calendar_dates", "stops", "db_version_1_6", "db_version_1_7"]:
            cursor.execute(f"DROP TABLE IF EXISTS {table}")
        
        cursor.execute("CREATE TABLE routes (route_id TEXT PRIMARY KEY, route_short_name TEXT)")
        cursor.execute("CREATE TABLE trips (trip_id TEXT PRIMARY KEY, route_id TEXT, service_id TEXT, trip_headsign TEXT)")
        cursor.execute("CREATE TABLE stop_times (trip_id TEXT, departure_time TEXT, stop_id TEXT)")
        cursor.execute("CREATE TABLE calendar (service_id TEXT, monday INT, tuesday INT, wednesday INT, thursday INT, friday INT, saturday INT, sunday INT, start_date TEXT, end_date TEXT)")
        cursor.execute("CREATE TABLE calendar_dates (service_id TEXT, date TEXT, exception_type TEXT)")
        cursor.execute("CREATE TABLE db_version_1_7 (version INT)")

        cursor.executemany("INSERT OR IGNORE INTO routes VALUES (?, ?)", [(r['route_id'], r.get('route_short_name', '?')) for r in routes])
        cursor.executemany("INSERT OR IGNORE INTO trips VALUES (?, ?, ?, ?)", [(t['trip_id'], t['route_id'], t['service_id'], self._clean_name(t.get('trip_headsign', 'Unbekannt'))) for t in trips])
        cursor.executemany("INSERT INTO stop_times VALUES (?, ?, ?)", [(st['trip_id'], st['departure_time'], st['stop_id']) for st in stop_times])
        
        if calendar:
            cursor.executemany("INSERT INTO calendar VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [(c['service_id'], c['monday'], c['tuesday'], c['wednesday'], c['thursday'], c['friday'], c['saturday'], c['sunday'], c['start_date'], c['end_date']) for c in calendar])
        if calendar_dates:
            cursor.executemany("INSERT INTO calendar_dates VALUES (?, ?, ?)", [(cd['service_id'], cd['date'], cd['exception_type']) for cd in calendar_dates])

        cursor.execute("CREATE INDEX idx_st_stop ON stop_times (stop_id)")
        cursor.execute("CREATE INDEX idx_st_time ON stop_times (departure_time)")
        
        conn.commit()
        conn.execute("VACUUM")
        conn.close()

    # Parameter hier auf stop_id geändert
    async def get_next_departures(self, stop_id, limit=30):
        if not os.path.exists(self.db_path):
            return []
        
        now = datetime.now()
        now_str = now.strftime("%H:%M:%S")
        query_date = now
        
        if now.hour < 4: 
            now_str = f"{now.hour + 24:02d}:{now.strftime('%M:%S')}"
            query_date = now - timedelta(days=1)
            
        today_str = query_date.strftime("%Y%m%d")
        weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        today_weekday = weekdays[query_date.weekday()]
        
        def _query():
            conn = sqlite3.connect(self.db_path)
            valid_services = set()
            
            try:
                c = conn.execute(f"SELECT service_id FROM calendar WHERE {today_weekday} = 1 AND start_date <= ? AND end_date >= ?", (today_str, today_str))
                for row in c: valid_services.add(row[0])
            except Exception: pass
            
            try:
                c = conn.execute("SELECT service_id, exception_type FROM calendar_dates WHERE date = ?", (today_str,))
                for row in c:
                    if row[1] == '1': valid_services.add(row[0])
                    elif row[1] == '2' and row[0] in valid_services: valid_services.remove(row[0])
            except Exception: pass

            if not valid_services:
                conn.close()
                return []

            qs = ",".join("?" * len(valid_services))
            
            # WICHTIG: Suche über stop_id mit LIKE, um Steige wie 4300301 zu erwischen!
            # GROUP BY eliminiert weiterhin Duplikate.
            query = f"""
                SELECT r.route_short_name, t.trip_headsign, s.departure_time 
                FROM stop_times s 
                JOIN trips t ON s.trip_id = t.trip_id 
                JOIN routes r ON t.route_id = r.route_id 
                WHERE s.stop_id LIKE ? AND s.departure_time >= ? 
                AND t.service_id IN ({qs})
                GROUP BY r.route_short_name, t.trip_headsign, s.departure_time
                ORDER BY s.departure_time ASC LIMIT ?
            """
            params = [f"%{stop_id}%", now_str] + list(valid_services) + [limit]
            res = conn.execute(query, params).fetchall()
            conn.close()
            return res

        rows = await self.hass.async_add_executor_job(_query)
        return [
            {
                # STERNCHEN-KILLER für die GTFS Daten
                "line": str(r[0]).replace("*", ""),
                "direction": r[1],
                "scheduled": f"{int(r[2].split(':')[0])%24:02d}:{r[2].split(':')[1]}",
                "countdown": 0,
                "delay": 0,
                "is_realtime": False,
                "cancelled": False,
                "infos": ""
            }
            for r in rows
        ]
