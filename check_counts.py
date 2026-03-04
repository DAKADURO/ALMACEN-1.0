import sqlite3
import os

dbs = ["backend/almacen_tuberia.db", "backend/almacen_refacciones.db", "backend/almacen.db"]

for db_path in dbs:
    print(f"\n--- Checking {db_path} ---")
    if not os.path.exists(db_path):
        print("File not found.")
        continue
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT count(*) FROM products")
        print(f"Products: {cursor.fetchone()[0]}")
        
        cursor.execute("SELECT count(*) FROM warehouses")
        print(f"Warehouses: {cursor.fetchone()[0]}")
        
        cursor.execute("SELECT count(*) FROM stock_movements")
        print(f"Movements: {cursor.fetchone()[0]}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
