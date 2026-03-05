from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, database

router = APIRouter(
    prefix="/warehouses",
    tags=["warehouses"]
)

@router.get("/", response_model=List[schemas.Warehouse])
def read_warehouses(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    warehouses = db.query(models.Warehouse).filter(models.Warehouse.active == True).offset(skip).limit(limit).all()
    return warehouses

@router.post("/", response_model=schemas.Warehouse)
def create_warehouse(warehouse: schemas.WarehouseCreate, db: Session = Depends(database.get_db)):
    db_warehouse = db.query(models.Warehouse).filter(models.Warehouse.name == warehouse.name).first()
    if db_warehouse:
        raise HTTPException(status_code=400, detail="Warehouse name already exists")
    
    new_warehouse = models.Warehouse(**warehouse.dict())
    db.add(new_warehouse)
    db.commit()
    db.refresh(new_warehouse)
    return new_warehouse
