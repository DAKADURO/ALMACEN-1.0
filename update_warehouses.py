import sqlite3
import os

dbs = ["backend/almacen_tuberia.db", "backend/almacen_refacciones.db"]

new_names = ["TIJUANA", "HERMOSILLO"]

def update_warehouses():
    for db_path in dbs:
        print(f"\n--- Updating {db_path} ---")
        if not os.path.exists(db_path):
            print("File not found.")
            continue
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        try:
            # Get existing warehouses
            cursor.execute("SELECT id, name FROM warehouses ORDER BY id")
            existing = cursor.fetchall()
            
            # Rename existing ones or add if needed
            for i, name in enumerate(new_names):
                if i < len(existing):
                    w_id = existing[i][0]
                    old_name = existing[i][1]
                    print(f"Renaming ID {w_id}: {old_name} -> {name}, setting active=1")
                    cursor.execute("UPDATE warehouses SET name = ?, active = 1 WHERE id = ?", (name, w_id))
                else:
                    # Add new ones if they don't exist
                    print(f"Adding new warehouse: {name}")
                    cursor.execute("INSERT INTO warehouses (name, description, location_type, active) VALUES (?, ?, 'FIXED', 1)", (name, f"Almacén {name}"))
            
            # Deactivate any others
            if len(existing) > len(new_names):
                for i in range(len(new_names), len(existing)):
                    w_id = existing[i][0]
                    old_name = existing[i][1]
                    print(f"Deactivating ID {w_id}: {old_name}")
                    cursor.execute("UPDATE warehouses SET active = 0 WHERE id = ?", (w_id,))
            
            conn.commit()
            print("Done.")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            conn.close()

if __name__ == "__main__":
    update_warehouses()
