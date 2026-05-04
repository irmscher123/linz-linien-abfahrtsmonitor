import sqlite3
import os
import logging
import aiohttp
import csv
import io
from datetime import datetime, timedelta

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
        """Prüft beim Start, ob die DB existiert und aktuell ist."""
        needs_update = True
        if os.path.exists(self.db_path):
            try:
                def check_db():
                    conn = sqlite3.connect(self.db_path)
                    cursor = conn.cursor()
                    # Version 2.2 erzwingt den Neubau für saubere Namen ohne '| '
                    cursor.execute("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='db_version_2_2'")
                    res = cursor.fetchone()[0]
                    conn.close()
                    return res > 0
                is_current = await self.hass.async_add_executor_job(check_db)
                if is_current: needs_update = False
            except Exception:
                pass

        if needs_update:
            _LOGGER.warning("Datenbank-Update (Version 2.2) wird durchgeführt...")
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
            stops = await self._fetch_csv(session, "stops.txt")
            stop_times = await self._fetch_csv(session, "stop_times.txt")
            calendar = await self._fetch_csv(session, "calendar.txt")
            calendar_dates = await self._fetch_csv(session, "calendar_dates.txt")

            if routes and trips and stop_times and stops:
                await self.hass.async_add_executor_job(
                    self._process, routes, trips, stops, stop_times, calendar, calendar_dates
                )

    def _clean_name(self, text):
        """Entfernt alles bis inklusive '| ' und bereinigt JKU-Reste."""
        if not text: return "Unbekannt"
        text = text.strip()
        if "|" in text:
            text = text.split("|")[-1].strip()
        text = text.replace("JKU", "").strip()
        prefixes = ["Linz/Donau, ", "Linz/Donau ", "Leonding ", "Steyregg ", "Traun OÖ ", "Traun ", "Bergham b.Linz ", "Linz "]
        for p in prefixes:
            if text.startswith(p):
                text = text[len(p):]
                break
        return text.replace(",", "").strip(" -")

    def _process(self, routes, trips, stops, stop_times, calendar, calendar_dates):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        for table in ["stop_times", "trips", "routes", "calendar", "calendar_dates", "stops", "db_version_2_1", "db_version_2_2"]:
            cursor.execute(f"DROP TABLE IF EXISTS {table}")
        
        cursor.execute("CREATE TABLE routes (route_id TEXT PRIMARY KEY, route_short_name TEXT)")
        cursor.execute("CREATE TABLE trips (trip_id TEXT PRIMARY KEY, route_id TEXT, service_id TEXT, trip_headsign TEXT)")
        cursor.execute("CREATE TABLE stops (stop_id TEXT PRIMARY KEY, stop_name TEXT)")
        cursor.execute("CREATE TABLE stop_times (trip_id TEXT, departure_time TEXT, stop_id TEXT)")
        cursor.execute("CREATE TABLE calendar (service_id TEXT, monday INT, tuesday INT, wednesday INT, thursday INT, friday INT, saturday INT, sunday INT, start_date TEXT, end_date TEXT)")
        cursor.execute("CREATE TABLE calendar_dates (service_id TEXT, date TEXT, exception_type TEXT)")
        cursor.execute("CREATE TABLE db_version_2_2 (version INT)")

        cursor.executemany("INSERT OR IGNORE INTO routes VALUES (?, ?)", [(r['route_id'], str(r.get('route_short_name', '?')).replace("*", "")) for r in routes])
        cursor.executemany("INSERT OR IGNORE INTO trips VALUES (?, ?, ?, ?)", [(t['trip_id'], t['route_id'], t['service_id'], self._clean_name(t.get('trip_headsign', 'Unbekannt'))) for t in trips])
        cursor.executemany("INSERT OR IGNORE INTO stops VALUES (?, ?)", [(s['stop_id'], s['stop_name']) for s in stops])
        cursor.executemany("INSERT INTO stop_times VALUES (?, ?, ?)", [(st['trip_id'], st['departure_time'], st['stop_id']) for st in stop_times])
        
        if calendar:
            cursor.executemany("INSERT INTO calendar VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [(c['service_id'], c['monday'], c['tuesday'], c['wednesday'], c['thursday'], c['friday'], c['saturday'], c['sunday'], c['start_date'], c['end_date']) for c in calendar])
        if calendar_dates:
            cursor.executemany("INSERT INTO calendar_dates VALUES (?, ?, ?)", [(cd['service_id'], cd['date'], cd['exception_type']) for cd in calendar_dates])

        cursor.execute("CREATE INDEX idx_st_stop ON stop_times (stop_id)")
        cursor.execute("CREATE INDEX idx_st_time ON stop_times (departure_time)")
        conn.commit()
        conn.close()

    async def get_next_departures(self, stop_name, limit=50):
        if not os.path.exists(self.db_path): return []
        now = datetime.now()
        now_str = now.strftime("%H:%M:%S")
        query_date = now - timedelta(days=1) if now.hour < 4 else now
        if now.hour < 4: now_str = f"{now.hour + 24:02d}:{now.strftime('%M:%S')}"
        today_str = query_date.strftime("%Y%m%d")
        today_weekday = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][query_date.weekday()]
        
        def _query():
            conn = sqlite3.connect(self.db_path)
            valid_services = [row[0] for row in conn.execute(f"SELECT service_id FROM calendar WHERE {today_weekday} = 1 AND start_date <= ? AND end_date >= ?", (today_str, today_str))]
            for row in conn.execute("SELECT service_id, exception_type FROM calendar_dates WHERE date = ?", (today_str,)):
                if row[1] == '1': valid_services.append(row[0])
                elif row[1] == '2' and row[0] in valid_services: valid_services.remove(row[0])
            if not valid_services:
                conn.close()
                return []
            qs = ",".join("?" * len(valid_services))
            query = f"""
                SELECT r.route_short_name, t.trip_headsign, s.departure_time 
                FROM stop_times s 
                JOIN trips t ON s.trip_id = t.trip_id 
                JOIN routes r ON t.route_id = r.route_id 
                JOIN stops st ON s.stop_id = st.stop_id
                WHERE st.stop_name LIKE ? AND s.departure_time >= ? 
                AND t.service_id IN ({qs})
                GROUP BY r.route_short_name, t.trip_headsign, s.departure_time
                ORDER BY s.departure_time ASC LIMIT ?
            """
            res = conn.execute(query, [f"%{stop_name}%", now_str] + list(set(valid_services)) + [limit]).fetchall()
            conn.close()
            return res

        rows = await self.hass.async_add_executor_job(_query)
        return [{"line": str(r[0]), "direction": r[1], "scheduled": f"{int(r[2].split(':')[0])%24:02d}:{r[2].split(':')[1]}", "countdown": 0, "delay": 0, "is_realtime": False, "cancelled": False} for r in rows]
