const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
console.log("Inventario API_URL:", API_URL);

// --- TypeScript Interfaces ---

export interface Product {
    id: number;
    code: string;
    name: string;
    description?: string | null;
    category?: string | null;
    family?: string | null;
    brand?: string | null;
    unit_of_measure: string;
    min_stock: number;
    cost_price: number;
    active: boolean;
    created_at: string;
}

export interface Warehouse {
    id: number;
    name: string;
    description?: string;
    location_type: string;
    active: boolean;
}

export interface InventorySummary {
    product_id: number;
    warehouse_id: number;
    code: string;
    name: string;
    description?: string;
    warehouse_name: string;
    current_stock: number;
}

export interface Movement {
    id: number;
    product_id: number | null;
    origin_warehouse_id?: number | null;
    destination_warehouse_id?: number | null;
    quantity: number;
    movement_type: string;
    reference_doc?: string;
    notes?: string;
    created_by?: string;
    created_at: string;
}

export interface BoxItem {
    id: number;
    box_id: number;
    product_id: number;
    quantity: number;
    product?: Product;
}

export interface Box {
    id: number;
    code: string;
    description?: string;
    warehouse_id: number;
    active: boolean;
    created_at: string;
    items: BoxItem[];
}

export interface AuditItem {
    id: number;
    audit_id: number;
    product_id: number;
    system_stock: number;
    counted_stock?: number;
    notes?: string;
    product: Product;
}

export interface Audit {
    id: number;
    warehouse_id: number;
    status: string;
    created_by?: string;
    created_at: string;
    completed_at?: string;
    items: AuditItem[];
    warehouse?: Warehouse;
}

export interface DashboardStats {
    total_products: number;
    total_valuation: number;
    low_stock_count: number;
    movements_today: number;
    low_stock_items: {
        name: string;
        description: string;
        code: string;
        warehouse_name: string;
        current_stock: number;
        min_stock: number;
        unit: string;
    }[];
    top_products: {
        name: string;
        code: string;
        count: number;
    }[];
    recent_movements: {
        movement_type: string;
        origin: string | null;
        destination: string | null;
        product_code: string;
        product_name: string;
        product_description: string;
        quantity: number;
        reference_doc: string | null;
        created_at: string;
    }[];
}

export interface Brand {
    id: number;
    name: string;
}

export interface ProjectRequester {
    id: number;
    name: string;
    project_id: number;
}

export interface Project {
    id: number;
    name: string;
    requesters: ProjectRequester[];
}

// Helper to get headers with the current inventory context
const getHeaders = (extraHeaders = {}) => {
    if (typeof window === "undefined") return { "Content-Type": "application/json", ...extraHeaders };

    const context = localStorage.getItem("inventory-context") || "tuberia";
    const token = localStorage.getItem("auth_token");
    
    return {
        "Content-Type": "application/json",
        "X-Inventory-Context": context,
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        ...extraHeaders
    };
};

/**
 * Helper to handle API responses and manage global errors like 401 Unauthorized.
 */
async function handleResponse<T>(res: Response): Promise<T> {
    if (res.status === 401) {
        if (typeof window !== "undefined") {
            console.error("Sesión expirada. Redirigiendo al login...");
            localStorage.removeItem("auth_token");
            localStorage.removeItem("auth_user");
            window.location.href = "/login?expired=true";
        }
        throw new Error("Sesión expirada");
    }

    if (!res.ok) {
        let errorData;
        try {
            errorData = await res.json();
        } catch (e) {
            errorData = { detail: "Error desconocido en el servidor" };
        }
        throw new Error(errorData.detail || `Error del servidor: ${res.status}`);
    }

    return res.json();
}

export async function fetchProducts(): Promise<Product[]> {
    const res = await fetch(`${API_URL}/products/`, { headers: getHeaders() });
    return handleResponse<Product[]>(res);
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_URL}/dashboard/stats`, { headers: getHeaders() });
    return handleResponse<DashboardStats>(res);
}

export async function fetchInventorySummary(): Promise<InventorySummary[]> {
    const res = await fetch(`${API_URL}/inventory/summary`, { headers: getHeaders() });
    return handleResponse<InventorySummary[]>(res);
}

export async function recordMovement(data: Partial<Movement>): Promise<Movement> {
    const res = await fetch(`${API_URL}/inventory/move`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Movement>(res);
}

export async function createProduct(data: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_URL}/products/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Product>(res);
}

export async function fetchWarehouses(): Promise<Warehouse[]> {
    const res = await fetch(`${API_URL}/warehouses/`, { headers: getHeaders() });
    return handleResponse<Warehouse[]>(res);
}

export async function createWarehouse(data: Partial<Warehouse>): Promise<Warehouse> {
    const res = await fetch(`${API_URL}/warehouses/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Warehouse>(res);
}

export async function updateProduct(id: number, data: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_URL}/products/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Product>(res);
}

export async function deleteProduct(id: number) {
    const res = await fetch(`${API_URL}/products/${id}`, {
        method: "DELETE",
        headers: getHeaders()
    });
    return handleResponse<any>(res);
}

export async function fetchMovements(filters?: {
    product_id?: number;
    warehouse_id?: number;
    reference_doc?: string;
    start_date?: string;
    end_date?: string;
}): Promise<Movement[]> {
    const params = new URLSearchParams();
    if (filters?.product_id) params.append("product_id", filters.product_id.toString());
    if (filters?.warehouse_id) params.append("warehouse_id", filters.warehouse_id.toString());
    if (filters?.reference_doc) params.append("reference_doc", filters.reference_doc);
    if (filters?.start_date) params.append("start_date", filters.start_date);
    if (filters?.end_date) params.append("end_date", filters.end_date);

    const res = await fetch(`${API_URL}/inventory/movements?${params.toString()}`, { headers: getHeaders() });
    return handleResponse<Movement[]>(res);
}

export async function uploadProductsFile(file: File, warehouseId?: number) {
    const formData = new FormData();
    formData.append("file", file);

    const context = typeof window !== "undefined" ? (localStorage.getItem("inventory-context") || "tuberia") : "tuberia";

    const params = new URLSearchParams();
    if (warehouseId) params.append("warehouse_id", warehouseId.toString());
    const queryString = params.toString();
    const url = `${API_URL}/products/upload${queryString ? `?${queryString}` : ''}`;

    const res = await fetch(url, {
        method: "POST",
        headers: { "X-Inventory-Context": context },
        body: formData,
    });

    return handleResponse<any>(res);
}

export async function recordBulkMovements(movements: Partial<Movement>[]): Promise<{ message: string }> {
    const res = await fetch(`${API_URL}/inventory/move-bulk`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ movements }),
    });

    return handleResponse<{ message: string }>(res);
}

export async function fetchNextFolio(prefix: string) {
    const res = await fetch(`${API_URL}/inventory/next-folio?prefix=${encodeURIComponent(prefix)}`, {
        headers: getHeaders(),
    });

    return handleResponse<any>(res);
}

export async function recordAdjustment(data: {
    product_id: number;
    warehouse_id: number;
    new_quantity: number;
    reference_doc?: string;
    notes?: string;
    created_by?: string;
}): Promise<Movement> {
    const res = await fetch(`${API_URL}/inventory/adjust`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });

    return handleResponse<Movement>(res);
}

export async function startAudit(warehouseId: number) {
    const res = await fetch(`${API_URL}/inventory/audit/start`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ warehouse_id: warehouseId }),
    });
    return handleResponse<any>(res);
}

export async function fetchAudit(auditId: number) {
    const res = await fetch(`${API_URL}/inventory/audit/${auditId}`, {
        headers: getHeaders(),
    });
    return handleResponse<Audit>(res);
}

export async function updateAuditItems(auditId: number, items: Partial<AuditItem>[]): Promise<Audit> {
    const res = await fetch(`${API_URL}/inventory/audit/${auditId}/items`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(items),
    });
    return handleResponse<Audit>(res);
}

export async function fetchActiveAudit(warehouseId: number) {
    const res = await fetch(`${API_URL}/inventory/audits/active/${warehouseId}`, {
        headers: getHeaders(),
    });
    return handleResponse<Audit | null>(res);
}

export async function finishAudit(auditId: number) {
    const res = await fetch(`${API_URL}/inventory/audit/${auditId}/finish`, {
        method: "POST",
        headers: getHeaders(),
    });
    return handleResponse<any>(res);
}

// --- Box API ---
export async function fetchBoxes() {
    const res = await fetch(`${API_URL}/boxes/`, { headers: getHeaders() });
    return handleResponse<Box[]>(res);
}

export async function fetchBox(id: number) {
    const res = await fetch(`${API_URL}/boxes/${id}`, { headers: getHeaders() });
    return handleResponse<Box>(res);
}

export async function fetchBoxByCode(code: string) {
    const res = await fetch(`${API_URL}/boxes/code/${code}`, { headers: getHeaders() });
    return handleResponse<Box>(res);
}

export async function createBox(data: Partial<Box>): Promise<Box> {
    const res = await fetch(`${API_URL}/boxes/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Box>(res);
}

export async function addItemToBox(boxId: number, data: { product_id: number; quantity: number }): Promise<BoxItem> {
    const res = await fetch(`${API_URL}/boxes/${boxId}/items`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<BoxItem>(res);
}

export async function removeItemFromBox(boxId: number, productId: number) {
    const res = await fetch(`${API_URL}/boxes/${boxId}/items/${productId}`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    return handleResponse<any>(res);
}

// --- Brand API ---
export async function fetchBrands() {
    const res = await fetch(`${API_URL}/brands/`, { headers: getHeaders() });
    return handleResponse<Brand[]>(res);
}

export async function createBrand(name: string) {
    const res = await fetch(`${API_URL}/brands/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ name }),
    });
    return handleResponse<Brand>(res);
}

// --- Project API ---
export async function fetchProjects() {
    const res = await fetch(`${API_URL}/projects/`, { headers: getHeaders() });
    return handleResponse<Project[]>(res);
}

export async function createProject(name: string) {
    const res = await fetch(`${API_URL}/projects/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ name }),
    });
    return handleResponse<Project>(res);
}

export async function fetchProjectRequesters(projectId: number) {
    const res = await fetch(`${API_URL}/projects/${projectId}/requesters`, { headers: getHeaders() });
    return handleResponse<ProjectRequester[]>(res);
}

export async function createProjectRequester(projectId: number, name: string) {
    const res = await fetch(`${API_URL}/projects/${projectId}/requesters`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ name, project_id: projectId }),
    });
    return handleResponse<ProjectRequester>(res);
}
