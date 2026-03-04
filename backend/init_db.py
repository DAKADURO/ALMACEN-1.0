import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from database import Base
import models
from auth import get_password_hash

def seed_schema(engine):
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        # 1. Seed Admin User
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            admin = models.User(
                username="admin",
                hashed_password=get_password_hash("proair2026"),
                full_name="Administrador Proair",
                role="admin"
            )
            db.add(admin)
            print(f"Admin user created in current schema.")
        
        # 2. Seed Initial Warehouses if empty
        if not db.query(models.Warehouse).first():
            wh1 = models.Warehouse(name="ALMACEN CENTRAL", description="Bodega principal", location_type="FIXED")
            wh2 = models.Warehouse(name="UNIDAD MOVIL 01", description="Vehículo Juan", location_type="VEHICLE")
            db.add_all([wh1, wh2])
            print(f"Initial warehouses created.")
            
        # 3. Create v_inventory_summary view if not exists
        # We use DROP VIEW IF EXISTS to ensure it's updated if the schema changed
        view_sql = """
        CREATE OR REPLACE VIEW v_inventory_summary AS
        SELECT 
            p.code,
            p.name,
            w.name as warehouse_name,
            SUM(
                CASE 
                    WHEN sm.destination_warehouse_id = w.id THEN sm.quantity
                    WHEN sm.origin_warehouse_id = w.id THEN -sm.quantity
                    ELSE 0
                END
            ) as current_stock
        FROM products p
        CROSS JOIN warehouses w
        LEFT JOIN stock_movements sm ON (sm.product_id = p.id AND (sm.origin_warehouse_id = w.id OR sm.destination_warehouse_id = w.id))
        GROUP BY p.code, p.name, w.name;
        """
        # For SQLite, "CREATE OR REPLACE VIEW" doesn't exist, we must drop first
        if "postgresql" not in str(engine.url):
            db.execute(text("DROP VIEW IF EXISTS v_inventory_summary"))
            view_sql = view_sql.replace("CREATE OR REPLACE VIEW", "CREATE VIEW")
            
        db.execute(text(view_sql))
        print(f"View v_inventory_summary updated.")
            
        db.commit()
    except Exception as e:
        print(f"Error seeding schema: {e}")
        db.rollback()
    finally:
        db.close()

def init_db():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not set, skipping DB init")
        return

    if db_url.startswith("postgresql"):
        print("Initializing PostgreSQL database...")
        engine = create_engine(db_url)
        with engine.connect() as conn:
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS tuberia"))
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS refacciones"))
            conn.commit()

        for schema in ["tuberia", "refacciones"]:
            schema_engine = create_engine(
                db_url,
                connect_args={"options": f"-csearch_path={schema}"}
            )
            Base.metadata.create_all(bind=schema_engine)
            seed_schema(schema_engine)
            print(f"Tables and seed data initialized in schema: {schema}")
    else:
        for context in ["tuberia", "refacciones"]:
            from database import get_engine
            engine, _ = get_engine(context)
            Base.metadata.create_all(bind=engine)
            seed_schema(engine)
            print(f"Tables and seed data initialized for SQLite context: {context}")

if __name__ == "__main__":
    init_db()
