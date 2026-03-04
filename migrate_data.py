import sqlite3
import os

source_db = "backend/almacen.db"
target_db = "backend/almacen_tuberia.db"

if not os.path.exists(source_db):
    print(f"Source database {source_db} not found.")
    exit(1)

if not os.path.exists(target_db):
    print(f"Target database {target_db} not found.")
    exit(1)

def migrate():
    s_conn = sqlite3.connect(source_db)
    t_conn = sqlite3.connect(target_db)
    
    s_cursor = s_conn.cursor()
    t_cursor = t_conn.cursor()
    
    print("Migrating Warehouses...")
    s_cursor.execute("SELECT name, description, location_type, active FROM warehouses")
    warehouses = s_cursor.fetchall()
    for w in warehouses:
        t_cursor.execute(
            "INSERT OR IGNORE INTO warehouses (name, description, location_type, active) VALUES (?, ?, ?, ?)",
            w
        )
    
    print("Migrating Products...")
    s_cursor.execute("SELECT code, name, description, category, family, unit_of_measure, min_stock, cost_price, active FROM products")
    products = s_cursor.fetchall()
    for p in products:
        t_cursor.execute(
            "INSERT OR IGNORE INTO products (code, name, description, category, family, unit_of_measure, min_stock, cost_price, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            p
        )
    
    t_conn.commit()
    print(f"Migration completed. {len(warehouses)} warehouses and {len(products)} products processed.")
    
    s_conn.close()
    t_conn.close()

if __name__ == "__main__":
    migrate()
