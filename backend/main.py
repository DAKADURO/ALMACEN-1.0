from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from routers import products, inventory, warehouses, dashboard, auth
import database
import models

app = FastAPI(
    title="Almacen 1.0 API",
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

@app.on_event("startup")
def startup_event():
    ensure_warehouses()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(products.router)
app.include_router(inventory.router)
app.include_router(warehouses.router)
app.include_router(dashboard.router)
app.include_router(auth.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Almacen 1.0 API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
