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
    product_id: int
    warehouse_id: int
    code: str
    name: str
    description: Optional[str] = None
    warehouse_name: str
    current_stock: int

class BOMItemCheck(BaseModel):
    description: str
    quantity: float

# --- Box Schemas ---
class BoxItemBase(BaseModel):
    product_id: int
    quantity: int

class BoxItemCreate(BoxItemBase):
    pass

class BoxItem(BoxItemBase):
    id: int
    box_id: int
    product: Optional[Product] = None

    class Config:
        from_attributes = True

class BoxBase(BaseModel):
    code: str
    description: Optional[str] = None
    warehouse_id: int
    active: bool = True

class BoxCreate(BoxBase):
    pass

class Box(BoxBase):
    id: int
    created_at: datetime
    items: List[BoxItem] = []

    class Config:
        from_attributes = True

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

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    active: Optional[bool] = None
    warehouse_ids: Optional[List[int]] = None

class User(UserBase):
    id: int
    created_at: datetime
    warehouses: List[Warehouse] = []

    class Config:
        from_attributes = True

# --- Audit Schemas ---
class AuditItemBase(BaseModel):
    product_id: int
    counted_stock: Optional[int] = None
    notes: Optional[str] = None

class AuditItem(AuditItemBase):
    id: int
    audit_id: int
    system_stock: int
    product: Product

    class Config:
        from_attributes = True

class AuditBase(BaseModel):
    warehouse_id: int

class AuditCreate(AuditBase):
    pass

class Audit(AuditBase):
    id: int
    status: str
    created_by: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    items: List[AuditItem] = []
    warehouse: Optional[Warehouse] = None

    class Config:
        from_attributes = True

# --- Brand Schemas ---
class BrandBase(BaseModel):
    name: str

class BrandCreate(BrandBase):
    pass

class Brand(BrandBase):
    id: int

    class Config:
        from_attributes = True

# --- Project Schemas ---
class ProjectBase(BaseModel):
    name: str

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: int
    requesters: List["ProjectRequester"] = []

    class Config:
        from_attributes = True

# --- ProjectRequester Schemas ---
class ProjectRequesterBase(BaseModel):
    name: str
    project_id: int

class ProjectRequesterCreate(ProjectRequesterBase):
    pass

class ProjectRequester(ProjectRequesterBase):
    id: int

    class Config:
        from_attributes = True
