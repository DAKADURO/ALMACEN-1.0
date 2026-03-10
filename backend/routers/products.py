from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import models, schemas, database
import pandas as pd
import io

router = APIRouter(
    prefix="/products",
    tags=["products"]
)

@router.get("/", response_model=List[schemas.Product])
def read_products(skip: int = 0, limit: int = 5000, db: Session = Depends(database.get_db)):
    products = db.query(models.Product).offset(skip).limit(limit).all()
    return products

@router.post("/", response_model=schemas.Product)
def create_product(product: schemas.ProductCreate, db: Session = Depends(database.get_db)):
    db_product = db.query(models.Product).filter(models.Product.code == product.code).first()
    if db_product:
        raise HTTPException(status_code=400, detail="Product code already registered")
    
    new_product = models.Product(**product.dict())
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@router.get("/{product_id}", response_model=schemas.Product)
def read_product(product_id: int, db: Session = Depends(database.get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return db_product

@router.put("/{product_id}", response_model=schemas.Product)
def update_product(product_id: int, product: schemas.ProductCreate, db: Session = Depends(database.get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Check for duplicate code (excluding current product)
    existing = db.query(models.Product).filter(
        models.Product.code == product.code,
        models.Product.id != product_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ese código ya está registrado en otro producto")
    
    for key, value in product.dict().items():
        setattr(db_product, key, value)
    
    db.commit()
    db.refresh(db_product)
    return db_product

@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(database.get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Logical delete: deactivate instead of hard delete to preserve history
    db_product.active = False
    db.commit()
    return {"detail": "Producto desactivado correctamente"}

@router.post("/upload")
async def upload_products(
    file: UploadFile = File(...),
    warehouse_id: int = None,
    db: Session = Depends(database.get_db)
):
    contents = await file.read()
    df = None
    
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Formato de archivo no soportado. Use CSV o Excel.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al leer el archivo: {str(e)}")

    # Normalize columns to lowercase and strip spaces
    df.columns = [c.lower().strip() for c in df.columns]
    
    # Header Mapping for flexibility — supports both English and Spanish headers
    HEADER_MAPPING = {
        # Code
        'item': 'code', 'codigo': 'code', 'pn': 'code', 'part number': 'code', 'code': 'code',
        # Name
        'name': 'name', 'nombre': 'name',
        # Description
        'descripcion': 'description', 'description': 'description',
        # Brand
        'marca': 'brand', 'brand': 'brand',
        # Initial stock
        'total en existencia': 'initial_stock', 'existencia': 'initial_stock',
        'stock': 'initial_stock', 'cantidad': 'initial_stock',
        # Comments/notes
        'comentarios': 'comments', 'comments': 'comments', 'notas': 'comments', 'notes': 'comments',
        # Price
        'price list usd': 'cost_price', 'costo': 'cost_price', 'precio': 'cost_price', 'cost': 'cost_price',
        # Category/Family
        'category': 'family', 'categoria': 'family', 'familia': 'family',
        # Unit
        'unidad': 'unit_of_measure', 'unit': 'unit_of_measure',
        # Min stock
        'min_stock': 'min_stock', 'stock_min': 'min_stock'
    }

    # Find which mapped fields we have in the dataframe
    mapped_df = pd.DataFrame()
    for col in df.columns:
        if col in HEADER_MAPPING:
            target = HEADER_MAPPING[col]
            # Only map if we haven't already mapped a higher-priority column to the same target
            if target not in mapped_df.columns:
                mapped_df[target] = df[col]

    if 'code' not in mapped_df.columns:
        raise HTTPException(
            status_code=400, 
            detail="Falta la columna de código. El archivo debe tener una columna CODIGO, ITEM, o PN."
        )

    # Validate warehouse if stock data is present
    warehouse = None
    if 'initial_stock' in mapped_df.columns and warehouse_id:
        warehouse = db.query(models.Warehouse).filter(models.Warehouse.id == warehouse_id).first()
        if not warehouse:
            raise HTTPException(status_code=404, detail="Almacén no encontrado.")

    added_count = 0
    skipped_count = 0
    stock_count = 0
    
    for _, row in mapped_df.iterrows():
        code = str(row['code']).strip()
        
        # Skip if code is empty
        if not code or code == 'nan':
            continue

        # Name: from mapped 'name' column, fallback to code
        name = str(row.get('name', '')).strip() if 'name' in mapped_df.columns else ''
        if not name or name == 'nan':
            name = code
            
        # Check if exists
        existing = db.query(models.Product).filter(models.Product.code == code).first()
            
        # Brand
        brand = str(row.get('brand', '')).strip() if 'brand' in mapped_df.columns else None
        if brand == 'nan': brand = None
        
        # Description & Comments
        description = str(row.get('description', '')).strip() if 'description' in mapped_df.columns else ''
        if description == 'nan': description = ''
        
        comments = str(row.get('comments', '')).strip() if 'comments' in mapped_df.columns else ''
        if comments == 'nan': comments = ''
        
        final_desc = None
        if description and comments:
            final_desc = f"{description} | Notas: {comments}"
        elif description:
            final_desc = description
        elif comments:
            final_desc = comments
        
        # Family
        family = str(row.get('family', '')).strip() if 'family' in mapped_df.columns else 'REFACCIONES'
        if family == 'nan': family = 'REFACCIONES'
        
        # Unit
        unit = str(row.get('unit_of_measure', 'PIEZA')).strip() if 'unit_of_measure' in mapped_df.columns else "PIEZA"
        if unit == 'nan': unit = "PIEZA"
        
        # Cost price
        cost_price = 0.0
        if 'cost_price' in mapped_df.columns:
            val = str(row['cost_price']).replace('$', '').replace(',', '').strip()
            try:
                cost_price = float(val)
            except:
                cost_price = 0.0

        # Min stock
        min_stock = 0
        if 'min_stock' in mapped_df.columns:
            try:
                min_stock = int(row['min_stock'])
            except:
                min_stock = 0
        
        if existing:
            # Update existing product
            if name and name != code: existing.name = name
            if final_desc: existing.description = final_desc
            if family: existing.family = family
            if brand: existing.brand = brand
            if unit: existing.unit_of_measure = unit
            if 'min_stock' in mapped_df.columns: existing.min_stock = min_stock
            if 'cost_price' in mapped_df.columns: existing.cost_price = cost_price
            
            db.flush()
            new_prod = existing
            skipped_count += 1 # We count it as 'updated' but use skipped_count variable for simplicity
        else:
            new_prod = models.Product(
                code=code,
                name=name,
                description=final_desc,
                family=family,
                brand=brand,
                unit_of_measure=unit,
                min_stock=min_stock,
                cost_price=cost_price,
                active=True
            )
            db.add(new_prod)
            db.flush()  # Get the product ID before creating stock movement
            added_count += 1
        
        # Create initial stock movement if stock data and warehouse are available
        if warehouse and 'initial_stock' in mapped_df.columns:
            try:
                qty = int(float(str(row['initial_stock']).replace(',', '').strip()))
                if qty > 0:
                    movement = models.StockMovement(
                        product_id=new_prod.id,
                        destination_warehouse_id=warehouse_id,
                        quantity=qty,
                        movement_type="ENTRADA_INITIAL",
                        notes="Stock inicial desde carga Excel"
                    )
                    db.add(movement)
                    stock_count += 1
            except:
                pass  # Skip invalid stock values
        
        # We don't increment added_count here because it's handled above depending on new/existing

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar en base de datos: {str(e)}")

    detail_parts = [f"Nuevos agregados: {added_count}", f"Existentes actualizados: {skipped_count}"]
    if stock_count > 0:
        detail_parts.append(f"Con stock inicial: {stock_count}")

    return {
        "detail": f"Carga completada. {', '.join(detail_parts)}",
        "added": added_count,
        "skipped": skipped_count,
        "stock_created": stock_count
    }

