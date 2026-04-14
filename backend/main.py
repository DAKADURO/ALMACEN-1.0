from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from routers import products, inventory, warehouses, dashboard, auth, boxes
import database
import models
from sqlalchemy import text

app = FastAPI(
    title="Almacen 3.0 API",
    description="API for Warehouse and Inventory Management",
    version="1.0.0"
)

def ensure_warehouses():
    """Ensure warehouses reflect the correct names on startup."""
    contexts = ["tuberia", "refacciones"]
    new_names = {1: "TIJUANA", 2: "HERMOSILLO"}
    
    for ctx in contexts:
        try:
            _, SessionLocal = database.get_engine(ctx)
            db = SessionLocal()
            # Update names for ID 1 and 2
            for w_id, name in new_names.items():
                db_warehouse = db.query(models.Warehouse).filter(models.Warehouse.id == w_id).first()
                if db_warehouse:
                    db_warehouse.name = name
                    db_warehouse.active = True
            
            # Deactivate ID 3 (QUERETARO) if it exists
            w3 = db.query(models.Warehouse).filter(models.Warehouse.id == 3).first()
            if w3:
                w3.active = False
                
            db.commit()
            db.close()
        except Exception as e:
            print(f"Error updating warehouses for {ctx}: {e}")

def ensure_views():
    """Ensure database views are up to date."""
    contexts = ["tuberia", "refacciones"]
    for ctx in contexts:
        try:
            _, SessionLocal = database.get_engine(ctx)
            db = SessionLocal()
            db.execute(text("DROP VIEW IF EXISTS v_inventory_summary"))
            create_view_sql = """
            CREATE VIEW v_inventory_summary AS
            SELECT 
                p.id as product_id,
                w.id as warehouse_id,
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
            WHERE w.active
            GROUP BY p.id, w.id, p.code, p.name, p.description, w.name
            """
            db.execute(text(create_view_sql))
            db.commit()
            db.close()
        except Exception as e:
            print(f"Error updating views for {ctx}: {e}")

@app.on_event("startup")
def startup_event():
    # Ensure tables are created for all contexts
    contexts = ["tuberia", "refacciones"]
    for ctx in contexts:
        try:
            engine, _ = database.get_engine(ctx)
            models.Base.metadata.create_all(bind=engine)
        except Exception as e:
            print(f"Error creating tables for {ctx}: {e}")
            
    ensure_warehouses()
    ensure_views()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https://fastapi.tiangolo.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none';"
    return response

# Include Routers
app.include_router(products.router)
app.include_router(inventory.router)
app.include_router(warehouses.router)
app.include_router(dashboard.router)
app.include_router(auth.router)
app.include_router(boxes.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Almacen 3.0 API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
