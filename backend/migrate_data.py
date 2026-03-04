import sqlite3
import pandas as pd
import os
import sys

# Paths to existing data
sqlite_db = r"h:\DBAIRPIPE.db"
excel_file = r"h:\Quote-Platform\server\products.xlsx"

def migrate():
    print("--- Starting Migration ---")
    
    # 1. Load from SQLite (AIRpipe)
    if os.path.exists(sqlite_db):
        try:
            conn = sqlite3.connect(sqlite_db)
            # Confirmed columns: Codigo, espanol, Categoria, Tipo
            query = "SELECT Codigo as code, espanol as name, Categoria as category, Tipo as type FROM DBAIRPIPE"
            df_airpipe = pd.read_sql_query(query, conn)
            print(f"Loaded {len(df_airpipe)} products from AIRpipe DB")
            conn.close()
        except Exception as e:
            print(f"Error reading SQLite: {e}")
            df_airpipe = pd.DataFrame()
    else:
        print(f"SQLite DB not found at {sqlite_db}")
        df_airpipe = pd.DataFrame()

    # 2. Add sample Warehouses
    warehouses = [
        {"name": "ALMACEN CENTRAL", "description": "Bodega principal Proair", "location_type": "FIXED"},
        {"name": "UNIDAD MOVIL 01", "description": "Vehículo técnico Juan", "location_type": "VEHICLE"},
        {"name": "UNIDAD MOVIL 02", "description": "Vehículo técnico Pedro", "location_type": "VEHICLE"}
    ]
    
    # Here we would send this data to the Almacen API or directly to the DB
    # Since the API is not running yet, we just print the plan
    print(f"Plan: Import {len(df_airpipe)} products and {len(warehouses)} warehouses.")

if __name__ == "__main__":
    migrate()
