import sqlite3
import os
import logging
from datetime import datetime, timedelta

_LOGGER = logging.getLogger(__name__)

class GTFSHelper:
    def __init__(self, hass):
        self.hass = hass
        self.db_path = os.path.join(self.hass.config.path("linz_ag_gtfs"), "linzag_global.sqlite")

    async def get_next_departures(self, stop_name, limit=50):
        if not os.path.exists(self.db_path): return []
        
        now = datetime.now()
        now_str = now.strftime("%H:%M:%S")
        # Logik für Fahrten nach Mitternacht
        query_date = now - timedelta(days=1) if now.hour < 4 else now
        if now.hour < 4: now_str = f"{now.hour + 24:02d}:{now.strftime('%M:%S')}"
            
        today_str = query_date.strftime("%Y%m%d")
        today_weekday = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][query_date.weekday()]
        
        def _query():
            conn = sqlite3.connect(self.db_path)
            # 1. Valide Services für heute finden
            valid_services = [row[0] for row in conn.execute(f"SELECT service_id FROM calendar WHERE {today_weekday} = 1 AND start_date <= ? AND end_date >= ?", (today_str, today_str))]
            for row in conn.execute("SELECT service_id, exception_type FROM calendar_dates WHERE date = ?", (today_str,)):
                if row[1] == '1': valid_services.append(row[0])
                elif row[1] == '2' and row[0] in valid_services: valid_services.remove(row[0])

            if not valid_services:
                conn.close()
                return []

            # 2. Abfahrten holen - Wir bereinigen hier schon die Liniennummern!
            qs = ",".join("?" * len(valid_services))
            query = f"""
                SELECT REPLACE(r.route_short_name, '*', ''), t.trip_headsign, s.departure_time 
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
