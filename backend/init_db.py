from sqlalchemy import text
from database import get_engine, Base
import models

def init_db():
    contexts = ["tuberia", "refacciones"]
    
    for ctx in contexts:
        print(f"Initializing database for context: {ctx}...")
        engine, _ = get_engine(ctx)
        
        # Create tables
        Base.metadata.create_all(bind=engine)
        
        # Create the inventory summary view
        view_sql = """
        CREATE VIEW IF NOT EXISTS v_inventory_summary AS
        SELECT 
            p.code, 
            p.name, 
            w.name as warehouse_name, 
            CAST(SUM(CASE 
                WHEN m.destination_warehouse_id = w.id THEN m.quantity 
                WHEN m.origin_warehouse_id = w.id THEN -m.quantity 
                ELSE 0 
            END) AS INTEGER) as current_stock
        FROM products p
        CROSS JOIN warehouses w
        LEFT JOIN stock_movements m ON p.id = m.product_id
        GROUP BY p.code, p.name, w.name
        HAVING current_stock != 0;
        """
        with engine.connect() as conn:
            conn.execute(text(view_sql))
            conn.commit()
            print(f"Inventory summary view created for {ctx}.")

    print("All databases initialization complete.")

if __name__ == "__main__":
    init_db()
