from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from datetime import datetime, timedelta
import models, database

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"]
)

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(database.get_db)):
    total_products = db.query(func.count(models.Product.id)).filter(models.Product.active == True).scalar() or 0

    # Valuation & Alerts logic
    total_valuation = 0.0
    low_stock_count = 0
    low_stock_items = []
    try:
        rows = db.execute(text("SELECT code, name, warehouse_name, current_stock FROM v_inventory_summary")).fetchall()
        # Pre-fetch all products to get cost and min_stock efficiently
        all_products = {p.code: p for p in db.query(models.Product).all()}
        
        # Track which products we've already counted for valuation (v_inventory_summary is per warehouse)
        # Actually we need sum per product across warehouses * cost_price
        # Or just sum(row.current_stock * all_products[row.code].cost_price)
        for row in rows:
            code, name, wh, stock = row[0], row[1], row[2], int(row[3])
            p = all_products.get(code)
            if p:
                total_valuation += (stock * (p.cost_price or 0.0))
                if p.min_stock > 0 and stock < int(p.min_stock):
                    low_stock_count += 1
                    low_stock_items.append({
                        "code": code,
                        "name": name,
                        "warehouse_name": wh,
                        "current_stock": stock,
                        "min_stock": int(p.min_stock),
                        "unit": p.unit_of_measure
                    })
    except Exception:
        pass

    # Movements today
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    movements_today = db.query(func.count(models.StockMovement.id)).filter(
        models.StockMovement.created_at >= today_start
    ).scalar() or 0

    # Recent movements (last 10)
    recent_movements = db.query(models.StockMovement).order_by(
        models.StockMovement.created_at.desc()
    ).limit(10).all()

    recent_list = []
    for m in recent_movements:
        product = db.query(models.Product).filter(models.Product.id == m.product_id).first()
        dest_wh = db.query(models.Warehouse).filter(models.Warehouse.id == m.destination_warehouse_id).first() if m.destination_warehouse_id else None
        origin_wh = db.query(models.Warehouse).filter(models.Warehouse.id == m.origin_warehouse_id).first() if m.origin_warehouse_id else None
        recent_list.append({
            "product_name": product.name if product else "Desconocido",
            "product_code": product.code if product else "",
            "quantity": int(m.quantity),
            "movement_type": m.movement_type,
            "destination": dest_wh.name if dest_wh else None,
            "origin": origin_wh.name if origin_wh else None,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "reference_doc": m.reference_doc,
            "notes": m.notes
        })

    # Active warehouses
    active_warehouses = db.query(func.count(models.Warehouse.id)).filter(models.Warehouse.active == True).scalar() or 0

    # Top products by rotation (last 30 days)
    thirty_days_ago = datetime.now() - timedelta(days=30)
    top_products_query = db.query(
        models.Product.code,
        models.Product.name,
        func.count(models.StockMovement.id).label("movement_count")
    ).join(models.StockMovement, models.Product.id == models.StockMovement.product_id)\
     .filter(models.StockMovement.created_at >= thirty_days_ago)\
     .group_by(models.Product.id, models.Product.code, models.Product.name)\
     .order_by(text("movement_count DESC"))\
     .limit(5).all()

    top_products_list = [
        {"code": row[0], "name": row[1], "count": row[2]}
        for row in top_products_query
    ]

    return {
        "total_products": total_products,
        "total_valuation": total_valuation,
        "low_stock_count": low_stock_count,
        "low_stock_items": low_stock_items,
        "movements_today": movements_today,
        "active_warehouses": active_warehouses,
        "recent_movements": recent_list,
        "top_products": top_products_list
    }
