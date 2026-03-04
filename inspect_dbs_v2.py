import sqlite3
import os

dbs = [
    r"h:\DBAIRPIPE.db",
    r"h:\airpipe-cotizador-api\airpipe.db",
    r"h:\airpipe-cotizador-api\productos.db"
]

output_file = r"h:\ALMACEN 1.0\db_inspection_results.txt"

with open(output_file, "w", encoding="utf-8") as f:
    for db_path in dbs:
        f.write(f"\n{'='*20}\nInspecting: {db_path}\n{'='*20}\n")
        if not os.path.exists(db_path):
            f.write("File does not exist.\n")
            continue
        
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [t[0] for t in cursor.fetchall()]
            f.write(f"Tables: {tables}\n")
            
            for table_name in tables:
                f.write(f"\nTable: {table_name}\n")
                cursor.execute(f"PRAGMA table_info('{table_name}');")
                columns = cursor.fetchall()
                for col in columns:
                    f.write(f"  {col[1]} ({col[2]})\n")
                
                try:
                    cursor.execute(f"SELECT * FROM '{table_name}' LIMIT 5;")
                    samples = cursor.fetchall()
                    for s in samples:
                        f.write(f"  {s}\n")
                except Exception as e:
                    f.write(f"  Error reading sample: {e}\n")
                    
            conn.close()
        except Exception as e:
            f.write(f"Error connecting/querying: {e}\n")

print(f"Results saved to {output_file}")
