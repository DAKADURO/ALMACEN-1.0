import sqlite3
import os

dbs = [
    r"h:\DBAIRPIPE.db",
    r"h:\airpipe-cotizador-api\airpipe.db",
    r"h:\airpipe-cotizador-api\productos.db"
]

for db_path in dbs:
    print(f"\n--- Inspecting {db_path} ---")
    if not os.path.exists(db_path):
        print("File does not exist.")
        continue
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"Tables: {[t[0] for t in tables]}")
        
        for table in tables:
            table_name = table[0]
            print(f"\nTable: {table_name}")
            cursor.execute(f"PRAGMA table_info({table_name});")
            columns = cursor.fetchall()
            for col in columns:
                print(f"  {col[1]} ({col[2]})")
            
            # Get sample data
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 2;")
            sample = cursor.fetchall()
            print(f"  Sample: {sample}")
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")
