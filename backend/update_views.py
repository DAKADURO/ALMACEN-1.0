from sqlalchemy import text
from database import get_engine, SessionLocals

def update_views():
    print("Updating database views...")
    for context in ["tuberia", "refacciones"]:
        print(f"Processing context: {context}")
        try:
            engine, SessionLocal = get_engine(context)
            db = SessionLocal()
            
            # Drop the old view
            db.execute(text("DROP VIEW IF EXISTS v_inventory_summary"))
            
            # Create the new view including description
            create_view_sql = """
            CREATE VIEW v_inventory_summary AS
            SELECT 
                p.code,
                p.name,
                p.description,
                w.name as warehouse_name,
                COALESCE(SUM(
                    CASE 
                        WHEN sm.destination_warehouse_id = w.id THEN sm.quantity
                        WHEN sm.origin_warehouse_id = w.id THEN -sm.quantity
                        ELSE 0
                    END
                ), 0) as current_stock
            FROM products p
            CROSS JOIN warehouses w
            LEFT JOIN stock_movements sm ON p.id = sm.product_id 
                AND (sm.destination_warehouse_id = w.id OR sm.origin_warehouse_id = w.id)
            WHERE w.active = 1
            GROUP BY p.id, p.code, p.name, p.description, w.id, w.name
            """
            
            db.execute(text(create_view_sql))
            db.commit()
            db.close()
            print(f"  ✓ View updated for {context}")
        except Exception as e:
            print(f"  ❌ Error updating view for {context}: {e}")

if __name__ == "__main__":
    update_views()
