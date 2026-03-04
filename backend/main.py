from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from routers import products, inventory, warehouses, dashboard, auth

app = FastAPI(
    title="Almacen 1.0 API",
    description="API for Warehouse and Inventory Management",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Adjust for production
    allow_credentials=True,
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
    uvicorn.run(app, host="0.0.0.0", port=8000)
