from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime
import models, schemas, database

router = APIRouter(
    prefix="/inventory",
    tags=["inventory"]
)

def validate_and_create_movement(movement: schemas.MovementCreate, db: Session):
    product = db.query(models.Product).filter(models.Product.id == movement.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Producto con ID {movement.product_id} no encontrado")
    
    # Validate stock for EXIT and TRANSFER
    if movement.movement_type in ("EXIT", "TRANSFER") and movement.origin_warehouse_id:
        incoming = db.query(func.coalesce(func.sum(models.StockMovement.quantity), 0)).filter(
            models.StockMovement.product_id == movement.product_id,
            models.StockMovement.destination_warehouse_id == movement.origin_warehouse_id
        ).scalar()
        outgoing = db.query(func.coalesce(func.sum(models.StockMovement.quantity), 0)).filter(
            models.StockMovement.product_id == movement.product_id,
            models.StockMovement.origin_warehouse_id == movement.origin_warehouse_id
        ).scalar()
        current_stock = int(incoming) - int(outgoing)
        
        if int(movement.quantity) > current_stock:
            raise HTTPException(
                status_code=400, 
                detail=f"Stock insuficiente para {product.name}. Disponible: {current_stock}, Solicitado: {movement.quantity}"
            )
    
    return models.StockMovement(**movement.dict())

@router.post("/move", response_model=schemas.Movement)
def record_movement(movement: schemas.MovementCreate, db: Session = Depends(database.get_db)):
    db_movement = validate_and_create_movement(movement, db)
    db.add(db_movement)
    db.commit()
    db.refresh(db_movement)
    return db_movement

@router.post("/move-bulk")
def record_bulk_movements(bulk: schemas.BulkMovementCreate, db: Session = Depends(database.get_db)):
    db_movements = []
    for m in bulk.movements:
        db_movements.append(validate_and_create_movement(m, db))
    
    for db_m in db_movements:
        db.add(db_m)
    
    db.commit()
    return {"detail": f"Se registraron {len(db_movements)} movimientos exitosamente"}

@router.post("/adjust")
def record_adjustment(adjustment: schemas.AdjustmentCreate, db: Session = Depends(database.get_db)):
    product = db.query(models.Product).filter(models.Product.id == adjustment.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Calculate current stock in that warehouse
    incoming = db.query(func.coalesce(func.sum(models.StockMovement.quantity), 0)).filter(
        models.StockMovement.product_id == adjustment.product_id,
        models.StockMovement.destination_warehouse_id == adjustment.warehouse_id
    ).scalar()
    outgoing = db.query(func.coalesce(func.sum(models.StockMovement.quantity), 0)).filter(
        models.StockMovement.product_id == adjustment.product_id,
        models.StockMovement.origin_warehouse_id == adjustment.warehouse_id
    ).scalar()
    current_stock = int(incoming) - int(outgoing)
    
    diff = adjustment.new_quantity - current_stock
    if diff == 0:
        return {"detail": "No se requiere ajuste, la cantidad es la misma"}
    
    # Create the correction movement
    movement = models.StockMovement(
        product_id=adjustment.product_id,
        quantity=abs(diff),
        movement_type="ADJUSTMENT",
        reference_doc=adjustment.reference_doc or "AUDITORIA",
        notes=f"Ajuste de inventario. Stock anterior: {current_stock}, Nuevo stock: {adjustment.new_quantity}. {adjustment.notes or ''}".strip(),
        created_by=adjustment.created_by
    )
    
    if diff > 0:
        movement.destination_warehouse_id = adjustment.warehouse_id
    else:
        movement.origin_warehouse_id = adjustment.warehouse_id
        
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return {"detail": "Ajuste realizado con éxito", "current_stock": adjustment.new_quantity}

@router.get("/summary", response_model=List[schemas.InventorySummary])
def get_inventory_summary(db: Session = Depends(database.get_db)):
    """Compute inventory summary dynamically using ORM (no SQL view dependency)."""
    # Get all active warehouses
    warehouses = db.query(models.Warehouse).filter(models.Warehouse.active == True).all()
    # Get all products
    products = db.query(models.Product).filter(models.Product.active == True).all()

    results = []
    for product in products:
        for warehouse in warehouses:
            incoming = db.query(func.coalesce(func.sum(models.StockMovement.quantity), 0)).filter(
                models.StockMovement.product_id == product.id,
                models.StockMovement.destination_warehouse_id == warehouse.id
            ).scalar()
            outgoing = db.query(func.coalesce(func.sum(models.StockMovement.quantity), 0)).filter(
                models.StockMovement.product_id == product.id,
                models.StockMovement.origin_warehouse_id == warehouse.id
            ).scalar()
            current_stock = int(incoming) - int(outgoing)

            if current_stock > 0:
                results.append(
                    schemas.InventorySummary(
                        code=product.code,
                        name=product.name,
                        description=product.description or product.name,
                        warehouse_name=warehouse.name,
                        current_stock=current_stock
                    )
                )

    return results

@router.get("/movements", response_model=List[schemas.Movement])
def get_movements(
    product_id: int = None, 
    warehouse_id: int = None,
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(database.get_db)
):
    query = db.query(models.StockMovement)
    
    if product_id:
        query = query.filter(models.StockMovement.product_id == product_id)
    
    if warehouse_id:
        # Filter movements where either origin or destination is the warehouse
        query = query.filter(
            (models.StockMovement.origin_warehouse_id == warehouse_id) | 
            (models.StockMovement.destination_warehouse_id == warehouse_id)
        )
        
    if start_date:
        query = query.filter(models.StockMovement.created_at >= start_date)
    
    if end_date:
        query = query.filter(models.StockMovement.created_at <= end_date)
        
    return query.order_by(models.StockMovement.created_at.desc()).all()

@router.get("/next-folio")
def get_next_folio(prefix: str, db: Session = Depends(database.get_db)):
    """
    Suggests the next folio for a given prefix (e.g., TJ, HE, TJ>HE).
    Format: PREFIX-YYMMDD-NN (where NN is a sequential number)
    """
    today_str = datetime.now().strftime("%y%m%d")
    pattern = f"{prefix}-{today_str}-%"
    
    # Search for the highest correlative used today for this prefix
    last_movement = db.query(models.StockMovement).filter(
        models.StockMovement.reference_doc.like(pattern)
    ).order_by(models.StockMovement.reference_doc.desc()).first()
    
    next_num = 1
    if last_movement:
        try:
            # Extract the last two digits and increment
            last_folio = last_movement.reference_doc
            last_num_str = last_folio.split("-")[-1]
            next_num = int(last_num_str) + 1
        except (ValueError, IndexError):
            next_num = 1
            
    return {"folio": f"{prefix}-{today_str}-{str(next_num).zfill(2)}"}

# ── Diccionario de traducción BOM (español) → Catálogo Almacén (inglés) ──
# Cada entrada mapea una palabra clave del BOM a los términos de búsqueda equivalentes en la DB
BOM_TRANSLATION_MAP = [
    # Tuberías
    {"bom_keywords": ["tubería aluminio", "tuberia aluminio"], "db_search": "Aluminum pipe"},
    {"bom_keywords": ["tramos de tubería", "tramos de tuberia", "tramo tubería"], "db_search": "Aluminum pipe"},
    # Codos
    {"bom_keywords": ["codo 90"], "db_search": "Equal 90 elbow"},
    {"bom_keywords": ["codo 45"], "db_search": "Equal 45 elbow"},
    # Uniones / Coples
    {"bom_keywords": ["unión recta", "union recta", "cople"], "db_search": "Pipe-to-pipe connector"},
    # Tapones
    {"bom_keywords": ["tapón final", "tapon final", "tapón", "tapon"], "db_search": "end cap"},
    # Tees
    {"bom_keywords": ["te ", "tee "], "db_search": "tee"},
    {"bom_keywords": ["te reductora", "tee reductora"], "db_search": "Reducing tee"},
    # Válvulas
    {"bom_keywords": ["válvula", "valvula"], "db_search": "valve"},
    # Wye
    {"bom_keywords": ["ye ", "wye "], "db_search": "wye"},
    # Soportes
    {"bom_keywords": ["soporte", "abrazadera"], "db_search": "pipe hanger"},
    # Quick drops
    {"bom_keywords": ["bajada rápida", "bajada rapida", "quick drop"], "db_search": "quick drop"},
]

def translate_bom_description(description: str) -> str:
    """Traduce una descripción del BOM (español) a un término de búsqueda para la DB (inglés)."""
    desc_lower = description.lower()
    for entry in BOM_TRANSLATION_MAP:
        for kw in entry["bom_keywords"]:
            if kw in desc_lower:
                return entry["db_search"]
    return description  # Devolver original si no hay traducción

@router.post("/check-bom")
def check_bom_availability(items: List[schemas.BOMItemCheck], db: Session = Depends(database.get_db)):
    """
    Verifica la disponibilidad de una lista de materiales contra el inventario actual.
    Traduce las descripciones del BOM (español) a los nombres del catálogo (inglés)
    y busca coincidencias parciales.
    """
    results = []
    
    for item in items:
        # Traducir la descripción del BOM al idioma del catálogo
        translated = translate_bom_description(item.description)
        search_term = f"%{translated}%"
        
        # Buscar producto por nombre traducido o por la descripción original
        product = db.query(models.Product).filter(
            (models.Product.name.ilike(search_term)) |
            (models.Product.code.ilike(f"%{item.description}%"))
        ).first()
        
        status = "No encontrado"
        current_stock = 0
        product_code = "N/A"
        matched_name = ""
        
        if product:
            product_code = product.code
            matched_name = product.name
            # Calcular stock total (entradas - salidas)
            incoming = db.query(func.coalesce(func.sum(models.StockMovement.quantity), 0)).filter(
                models.StockMovement.product_id == product.id,
                models.StockMovement.destination_warehouse_id.isnot(None)
            ).scalar()
            
            outgoing = db.query(func.coalesce(func.sum(models.StockMovement.quantity), 0)).filter(
                models.StockMovement.product_id == product.id,
                models.StockMovement.origin_warehouse_id.isnot(None)
            ).scalar()
            
            current_stock = int(incoming) - int(outgoing)
            
            if current_stock >= item.quantity:
                status = "Disponible"
            elif current_stock > 0:
                status = "Parcial"
            else:
                status = "Sin stock"
        
        results.append({
            "original_description": item.description,
            "matched_code": product_code,
            "matched_name": matched_name,
            "requested_quantity": item.quantity,
            "current_stock": current_stock,
            "status": status
        })
        
    return results
