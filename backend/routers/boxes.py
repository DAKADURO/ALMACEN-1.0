from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db

router = APIRouter(
    prefix="/boxes",
    tags=["boxes"]
)

@router.get("/", response_model=List[schemas.Box])
def get_boxes(db: Session = Depends(get_db)):
    return db.query(models.Box).filter(models.Box.active == True).all()

@router.post("/", response_model=schemas.Box)
def create_box(box: schemas.BoxCreate, db: Session = Depends(get_db)):
    db_box = models.Box(**box.dict())
    db.add(db_box)
    try:
        db.commit()
        db.refresh(db_box)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return db_box

@router.get("/{box_id}", response_model=schemas.Box)
def get_box(box_id: int, db: Session = Depends(get_db)):
    db_box = db.query(models.Box).filter(models.Box.id == box_id).first()
    if not db_box:
        raise HTTPException(status_code=404, detail="Caja no encontrada")
    return db_box

@router.get("/code/{code}", response_model=schemas.Box)
def get_box_by_code(code: str, db: Session = Depends(get_db)):
    db_box = db.query(models.Box).filter(models.Box.code == code).first()
    if not db_box:
        raise HTTPException(status_code=404, detail="Caja no encontrada")
    return db_box

@router.post("/{box_id}/items", response_model=schemas.BoxItem)
def add_item_to_box(box_id: int, item: schemas.BoxItemCreate, db: Session = Depends(get_db)):
    # Verify box exists
    db_box = db.query(models.Box).filter(models.Box.id == box_id).first()
    if not db_box:
        raise HTTPException(status_code=404, detail="Caja no encontrada")
    
    # Check if product is already in box
    db_item = db.query(models.BoxItem).filter(
        models.BoxItem.box_id == box_id,
        models.BoxItem.product_id == item.product_id
    ).first()
    
    if db_item:
        db_item.quantity += item.quantity
    else:
        db_item = models.BoxItem(**item.dict(), box_id=box_id)
        db.add(db_item)
    
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{box_id}/items/{product_id}")
def remove_item_from_box(box_id: int, product_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.BoxItem).filter(
        models.BoxItem.box_id == box_id,
        models.BoxItem.product_id == product_id
    ).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Producto no encontrado en la caja")
    
    db.delete(db_item)
    db.commit()
    return {"message": "Producto eliminado de la caja"}
