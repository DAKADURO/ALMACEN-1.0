-- Database Schema for Warehouse and Inventory Management System (Almacen 1.0)

-- 0. Users (Authentication and Roles)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user', -- admin, user
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1. Product Catalog (Source of truth for inventory properties)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL, -- Part Number / Codigo
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- Tubería, Refacción, Aceite, Consumible
    family VARCHAR(100),
    unit_of_measure VARCHAR(20) DEFAULT 'PIEZA', -- PIEZA, METRO, GALON, etc.
    min_stock DECIMAL(12,2) DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Warehouses (Locations)
CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'ALMACEN CENTRAL', 'UNIDAD MOVIL 01'
    description TEXT,
    location_type VARCHAR(50) DEFAULT 'FIXED', -- FIXED, VEHICLE, VIRTUAL
    active BOOLEAN DEFAULT TRUE
);

-- 3. Stock Movements (The immutable Kardex)
CREATE TABLE stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    origin_warehouse_id INTEGER REFERENCES warehouses(id), -- NULL for INITIAL_ENTRY/PURCHASE
    destination_warehouse_id INTEGER REFERENCES warehouses(id), -- NULL for SALE/CONSUMPTION/LOSS
    quantity DECIMAL(12,2) NOT NULL,
    movement_type VARCHAR(50) NOT NULL, -- PURCHASE, SALE, TRANSFER, ADJUSTMENT, INITIAL_ENTRY
    reference_doc VARCHAR(100), -- Invoice #, Tech Report #
    notes TEXT,
    created_by VARCHAR(100), -- User ID or Technician Name
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Current Stock (Materialized View or Aggregate Table for performance)
-- For now, we will use a VIEW to calculate it on the fly, 
-- or a table that is updated via triggers to maintain the "immutable" rule while being fast.
CREATE VIEW v_inventory_summary AS
SELECT 
    p.id as product_id,
    w.id as warehouse_id,
    p.code,
    p.name,
    p.description,
    w.name as warehouse_name,
    COALESCE(SUM(
        CASE 
            WHEN sm.destination_warehouse_id = w.id THEN sm.quantity
            WHEN sm.origin_warehouse_id = w.id THEN -sm.quantity
            ELSE 0
        END
    ), 0) as current_stock
FROM products p
CROSS JOIN warehouses w
LEFT JOIN stock_movements sm ON p.id = sm.product_id 
    AND (sm.destination_warehouse_id = w.id OR sm.origin_warehouse_id = w.id)
WHERE w.active = 1
GROUP BY p.id, w.id, p.code, p.name, p.description, w.name;
