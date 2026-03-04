from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    role = Column(String(20), default="user") # admin, user
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    family = Column(String(100))
    brand = Column(String(100))
    unit_of_measure = Column(String(20), default='PIEZA')
    min_stock = Column(Integer, default=0)
    cost_price = Column(Float, default=0.0)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    movements = relationship("StockMovement", back_populates="product", primaryjoin="or_(Product.id==StockMovement.product_id)")

class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text)
    location_type = Column(String(50), default='FIXED')
    active = Column(Boolean, default=True)

class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    origin_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    destination_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    movement_type = Column(String(50), nullable=False)
    reference_doc = Column(String(100))
    notes = Column(Text)
    created_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="movements")
