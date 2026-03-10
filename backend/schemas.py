from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class ProductBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    family: Optional[str] = None
    brand: Optional[str] = None
    unit_of_measure: str = "PIEZA"
    min_stock: int = 0
    cost_price: float = 0.0
    active: bool = True

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class WarehouseBase(BaseModel):
    name: str
    description: Optional[str] = None
    location_type: str = "FIXED"
    active: bool = True

class WarehouseCreate(WarehouseBase):
    pass

class Warehouse(WarehouseBase):
    id: int

    class Config:
        from_attributes = True

class MovementBase(BaseModel):
    product_id: int
    origin_warehouse_id: Optional[int] = None
    destination_warehouse_id: Optional[int] = None
    quantity: int
    movement_type: str
    reference_doc: Optional[str] = None
    notes: Optional[str] = None
    created_by: Optional[str] = None

class MovementCreate(MovementBase):
    pass

class Movement(MovementBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class BulkMovementCreate(BaseModel):
    movements: List[MovementCreate]

class AdjustmentCreate(BaseModel):
    product_id: int
    warehouse_id: int
    new_quantity: int
    reference_doc: Optional[str] = None
    notes: Optional[str] = None
    created_by: Optional[str] = None

class InventorySummary(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    warehouse_name: str
    current_stock: int

class BOMItemCheck(BaseModel):
    description: str
    quantity: float

# --- Authentication Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    role: str = "user"
    active: bool = True

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
