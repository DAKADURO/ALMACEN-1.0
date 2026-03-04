const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Helper to get headers with the current inventory context
const getHeaders = (extraHeaders = {}) => {
    if (typeof window === "undefined") return { "Content-Type": "application/json", ...extraHeaders };

    const context = localStorage.getItem("inventory-context") || "tuberia";
    return {
        "Content-Type": "application/json",
        "X-Inventory-Context": context,
        ...extraHeaders
    };
};

export async function fetchProducts() {
    const res = await fetch(`${API_URL}/products/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch products");
    return res.json();
}

export async function fetchDashboardStats() {
    const res = await fetch(`${API_URL}/dashboard/stats`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch dashboard stats");
    return res.json();
}

export async function fetchInventorySummary() {
    const res = await fetch(`${API_URL}/inventory/summary`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch inventory summary");
    return res.json();
}

export async function recordMovement(data: any) {
    const res = await fetch(`${API_URL}/inventory/move`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to record movement");
    }
    return res.json();
}

export async function createProduct(data: any) {
    const res = await fetch(`${API_URL}/products/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to create product");
    }
    return res.json();
}

export async function fetchWarehouses() {
    const res = await fetch(`${API_URL}/warehouses/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch warehouses");
    return res.json();
}

export async function updateProduct(id: number, data: any) {
    const res = await fetch(`${API_URL}/products/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to update product");
    }
    return res.json();
}

export async function deleteProduct(id: number) {
    const res = await fetch(`${API_URL}/products/${id}`, {
        method: "DELETE",
        headers: getHeaders()
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to delete product");
    }
    return res.json();
}

export async function fetchMovements(filters?: {
    product_id?: number;
    warehouse_id?: number;
    start_date?: string;
    end_date?: string;
}) {
    const params = new URLSearchParams();
    if (filters?.product_id) params.append("product_id", filters.product_id.toString());
    if (filters?.warehouse_id) params.append("warehouse_id", filters.warehouse_id.toString());
    if (filters?.start_date) params.append("start_date", filters.start_date);
    if (filters?.end_date) params.append("end_date", filters.end_date);

    const res = await fetch(`${API_URL}/inventory/movements?${params.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch movements");
    return res.json();
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

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to upload file");
    }
    return res.json();
}

export async function recordBulkMovements(movements: any[]) {
    const res = await fetch(`${API_URL}/inventory/move-bulk`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ movements }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to record bulk movements");
    }
    return res.json();
}

export async function fetchNextFolio(prefix: string) {
    const res = await fetch(`${API_URL}/inventory/next-folio?prefix=${encodeURIComponent(prefix)}`, {
        headers: getHeaders(),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to fetch next folio");
    }
    return res.json();
}

export async function recordAdjustment(data: any) {
    const res = await fetch(`${API_URL}/inventory/adjust`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to record adjustment");
    }
    return res.json();
}
