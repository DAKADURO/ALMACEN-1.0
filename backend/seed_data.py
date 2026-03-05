from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
from auth import get_password_hash

def seed_users():
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            admin = models.User(
                username="admin",
                hashed_password=get_password_hash("proair2026"),
                full_name="Administrador Proair",
                role="admin"
            )
            db.add(admin)
            db.commit()
            print("Admin user created.")
    finally:
        db.close()

def seed_data():
    db = SessionLocal()
    # 1. Seed Warehouses
    if not db.query(models.Warehouse).first():
        wh1 = models.Warehouse(name="TIJUANA", description="Almacén Tijuana", location_type="FIXED")
        wh2 = models.Warehouse(name="HERMOSILLO", description="Almacén Hermosillo", location_type="FIXED")
        db.add_all([wh1, wh2])
        db.commit()
    
    # 2. Seed some Products
    if not db.query(models.Product).first():
        p1 = models.Product(code="AC-001", name="ACEITE COMPRESORES SAE 30", category="Aceite", unit_of_measure="GALON", min_stock=10)
        p2 = models.Product(code="A921", name="Conector reductor 200mm a 150mm", category="Tubería", unit_of_measure="PIEZA")
        db.add_all([p1, p2])
        db.commit()

        # 3. Seed Initial Movements
        m1 = models.StockMovement(product_id=p1.id, destination_warehouse_id=1, quantity=50, movement_type="INITIAL_ENTRY", notes="Carga inicial")
        m2 = models.StockMovement(product_id=p2.id, destination_warehouse_id=1, quantity=20, movement_type="PURCHASE")
        db.add_all([m1, m2])
        db.commit()

    db.close()
    print("Seeding completed.")

if __name__ == "__main__":
    seed_users()
    seed_data()
