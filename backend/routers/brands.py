from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, database

router = APIRouter(
    prefix="/brands",
    tags=["brands"]
)

@router.get("/", response_model=List[schemas.Brand])
def read_brands(db: Session = Depends(database.get_db)):
    return db.query(models.Brand).all()

@router.post("/", response_model=schemas.Brand)
def create_brand(brand: schemas.BrandCreate, db: Session = Depends(database.get_db)):
    db_brand = db.query(models.Brand).filter(models.Brand.name == brand.name).first()
    if db_brand:
        return db_brand # Return existing if name matches to avoid duplicates
    
    new_brand = models.Brand(name=brand.name.strip())
    db.add(new_brand)
    db.commit()
    db.refresh(new_brand)
    return new_brand
