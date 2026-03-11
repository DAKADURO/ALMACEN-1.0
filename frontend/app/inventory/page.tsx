"use client";
import { useState, useEffect, useRef } from "react";
import { fetchInventorySummary, fetchProducts, createProduct, fetchWarehouses, recordMovement, updateProduct, deleteProduct, uploadProductsFile } from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Link from "next/link";

export default function InventoryPage() {
    const [tab, setTab] = useState<"stock" | "products">("stock");
    const [data, setData] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [warehouses, setWarehouses] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedWarehouse, setSelectedWarehouse] = useState("all");
    const [selectedSegment, setSelectedSegment] = useState("all");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [uploadWarehouseId, setUploadWarehouseId] = useState("");
    const [pendingFile, setPendingFile] = useState<File | null>(null);

    const [newProduct, setNewProduct] = useState({
        code: "", name: "", family: "", description: "", brand: "", unit: "PZA",
        warehouse_id: "", initial_stock: "0", cost_price: "0", min_stock: "0"
    });

    const refreshData = () => {
        setLoading(true);
        Promise.all([
            fetchInventorySummary().catch(() => []),
            fetchProducts().catch(() => [])
        ]).then(([inv, prods]) => {
            setData(inv);
            setProducts(prods);
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        refreshData();
        fetchWarehouses().then(setWarehouses).catch(console.error);
    }, []);

    const openEditModal = (product: any) => {
        setEditingProduct(product);
        setNewProduct({
            code: product.code, name: product.name,
            family: product.family || "", description: product.description || "",
            brand: product.brand || "",
            unit: product.unit_of_measure || "PZA",
            warehouse_id: "", initial_stock: "0",
            cost_price: product.cost_price?.toString() || "0",
            min_stock: product.min_stock?.toString() || "0"
        });
        setIsModalOpen(true);
    };

    const openCreateModal = () => {
        setEditingProduct(null);
        setNewProduct({
            code: "", name: "", family: "", description: "", brand: "", unit: "PZA",
            warehouse_id: "", initial_stock: "0", cost_price: "0", min_stock: "0"
        });
        setIsModalOpen(true);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPendingFile(file);
        setUploadWarehouseId("");
        setIsUploadDialogOpen(true);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleConfirmUpload = async () => {
        if (!pendingFile) return;
        setIsSubmitting(true);
        try {
            const whId = uploadWarehouseId ? parseInt(uploadWarehouseId) : undefined;
            const result = await uploadProductsFile(pendingFile, whId);
            alert(result.detail);
            refreshData();
        } catch (error: any) {
            alert("❌ Error al cargar: " + error.message);
        } finally {
            setIsSubmitting(false);
            setPendingFile(null);
            setIsUploadDialogOpen(false);
        }
    };

    const handleDelete = async (product: any) => {
        if (!confirm(`¿Seguro que deseas desactivar "${product.name}"?`)) return;
        try {
            await deleteProduct(product.id);
            refreshData();
        } catch (error: any) {
            alert("Error: " + error.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const productData = {
                code: newProduct.code,
                name: newProduct.name,
                family: newProduct.family,
                brand: newProduct.brand || null,
                description: newProduct.description,
                unit_of_measure: newProduct.unit,
                cost_price: parseFloat(newProduct.cost_price) || 0,
                min_stock: parseInt(newProduct.min_stock) || 0
            };

            if (editingProduct) {
                await updateProduct(editingProduct.id, productData);
                alert("✅ Producto actualizado");
            } else {
                const product = await createProduct(productData);
                if (parseInt(newProduct.initial_stock) > 0 && newProduct.warehouse_id) {
                    await recordMovement({
                        product_id: product.id,
                        destination_warehouse_id: parseInt(newProduct.warehouse_id),
                        quantity: parseInt(newProduct.initial_stock),
                        movement_type: "ENTRADA_INITIAL",
                        notes: "Stock inicial al crear producto"
                    });
                }
                alert("✅ Producto creado");
            }
            setIsModalOpen(false);
            refreshData();
        } catch (error: any) {
            alert("❌ Error: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredData = data.filter((item: any) => {
        const matchesSearch = (item.description || item.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesWarehouse = selectedWarehouse === "all" || item.warehouse_name === selectedWarehouse;

        // Find product family for segment filtering
        const prod = products.find((p: any) => p.code === item.code);
        const matchesSegment = selectedSegment === "all" || (prod && prod.family === selectedSegment);

        return matchesSearch && matchesWarehouse && matchesSegment;
    });

    const filteredProducts = products.filter((p: any) => {
        const matchesSearch = (p.description || p.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSegment = selectedSegment === "all" || p.family === selectedSegment;
        return matchesSearch && matchesSegment;
    });

    const downloadPDF = () => {
        const doc = new jsPDF();
        const date = new Date().toLocaleDateString();
        const context = localStorage.getItem("inventory-context") || "tuberia";
        const title = context.toUpperCase() === "TUBERIA" ? "REPORTE DE EXISTENCIAS - AIRPIPE" : "REPORTE DE EXISTENCIAS - PROAIR";

        // Company Logo/Header Placeholder
        doc.setFontSize(18);
        doc.setTextColor(16, 185, 129); // Emerald-500
        doc.text("AIRpipe", 14, 20);

        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(title, 14, 30);
        doc.setFontSize(10);
        doc.text(`Fecha: ${date}`, 14, 38);
        doc.text(`Filtro Almacén: ${selectedWarehouse === "all" ? "Todos" : selectedWarehouse}`, 14, 44);

        const tableData = filteredData.map((item: any) => [
            item.code,
            item.description || item.name,
            item.warehouse_name,
            item.current_stock.toString()
        ]);

        autoTable(doc, {
            startY: 50,
            head: [['CÓDIGO', 'DESCRIPCIÓN', 'ALMACÉN', 'EXISTENCIA']],
            body: tableData,
            headStyles: { fillColor: [16, 185, 129] }, // Emerald-500
            theme: 'striped'
        });

        doc.save(`Existencias_${context}_${date.replace(/\//g, '-')}.pdf`);
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Inventario</h1>
                    <p className="text-white">Existencias y catálogo de productos.</p>
                </div>
                <div className="flex gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileSelect}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <span>📁</span> Cargar Excel/CSV
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        + Nuevo Producto
                    </button>
                    {tab === "stock" && (
                        <button
                            onClick={downloadPDF}
                            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 border border-slate-600 shadow-sm"
                        >
                            <span>📄</span> PDF
                        </button>
                    )}
                </div>
            </header>

            {/* Excel Structure Hint */}
            {tab === "products" && (
                <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-2xl flex gap-4 items-start">
                    <span className="text-2xl mt-1">💡</span>
                    <div>
                        <h4 className="font-bold text-emerald-400">Estructura del archivo Excel/CSV:</h4>
                        <p className="text-sm text-slate-300 mt-1">
                            El sistema reconoce automáticamente tus columnas:
                            <span className="text-white font-mono mx-1">CODIGO</span> (obligatorio),
                            <span className="text-white font-mono mx-1">DESCRIPCION</span>,
                            <span className="text-white font-mono mx-1">MARCA</span>,
                            <span className="text-white font-mono mx-1">TOTAL EN EXISTENCIA</span>,
                            <span className="text-white font-mono mx-1">COMENTARIOS</span> (opcionales).
                        </p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex bg-slate-800/60 p-1.5 rounded-2xl border border-slate-700/50 backdrop-blur-sm shadow-xl">
                <button
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${tab === 'stock' ? 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    onClick={() => setTab('stock')}
                >
                    <span>📦</span> Existencias
                </button>
                <button
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${tab === 'products' ? 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    onClick={() => setTab('products')}
                >
                    <span>📋</span> Catálogo de Productos
                </button>
                <Link
                    href="/inventory/audit"
                    className="px-6 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2"
                >
                    <span>📝</span> Auditoría (Corte Mes)
                </Link>
            </div>

            {/* Filters */}
            <div className="flex gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700">
                <input
                    type="text"
                    placeholder="Buscar por código o descripción..."
                    className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 flex-grow focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                <select
                    className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    value={selectedSegment}
                    onChange={(e) => setSelectedSegment(e.target.value)}
                >
                    <option value="all">📁 Todos los Segmentos</option>
                    <option value="TUBERIA">🛠️ Tubería y Accesorios</option>
                    <option value="REFACCIONES">⚙️ Refacciones</option>
                </select>

                {tab === "stock" && (
                    <select
                        className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        value={selectedWarehouse}
                        onChange={(e) => setSelectedWarehouse(e.target.value)}
                    >
                        <option value="all">Todos los Almacenes</option>
                        {warehouses.map((w: any) => (
                            <option key={w.id} value={w.name}>{w.name}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Stock Table */}
            {tab === "stock" && (
                <div className="rounded-2xl border border-slate-700 bg-slate-800/20 overflow-hidden">
                    <div className="max-h-[calc(100vh-300px)] overflow-auto">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead className="sticky top-0 z-20 bg-slate-800 border-b border-slate-700 text-white text-sm uppercase">
                                <tr>
                                    <th className="p-4 bg-slate-800 rounded-tl-2xl">Código</th>
                                    <th className="p-4 bg-slate-800">Descripción</th>
                                    <th className="p-4 bg-slate-800">Almacén</th>
                                    <th className="p-4 bg-slate-800 text-right rounded-tr-2xl">Existencia</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-500 animate-pulse">Cargando...</td></tr>
                                ) : filteredData.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">Sin registros.</td></tr>
                                ) : filteredData.map((item: any, i) => (
                                    <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="p-4 font-mono text-emerald-400">{item.code}</td>
                                        <td className="p-4 text-white">{item.description || item.name}</td>
                                        <td className="p-4 text-sm text-white">{item.warehouse_name}</td>
                                        <td className="p-4 text-right font-bold">{item.current_stock}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Products Catalog Table */}
            {tab === "products" && (
                <div className="rounded-2xl border border-slate-700 bg-slate-800/20 overflow-hidden">
                    <div className="max-h-[calc(100vh-300px)] overflow-auto">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead className="sticky top-0 z-20 bg-slate-800 border-b border-slate-700 text-white text-sm uppercase">
                                <tr>
                                    <th className="p-4 bg-slate-800 rounded-tl-2xl">Código</th>
                                    <th className="p-4 bg-slate-800">Descripción</th>
                                    <th className="p-4 bg-slate-800">Marca</th>
                                    <th className="p-4 bg-slate-800">Familia</th>
                                    <th className="p-4 bg-slate-800">Unidad</th>
                                    <th className="p-4 bg-slate-800 text-right">Costo ($)</th>
                                    <th className="p-4 bg-slate-800 text-center">Estado</th>
                                    <th className="p-4 bg-slate-800 text-right rounded-tr-2xl">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {loading ? (
                                    <tr><td colSpan={8} className="p-8 text-center text-slate-500 animate-pulse">Cargando...</td></tr>
                                ) : filteredProducts.length === 0 ? (
                                    <tr><td colSpan={8} className="p-8 text-center text-slate-500">Sin productos.</td></tr>
                                ) : filteredProducts.map((p: any) => (
                                    <tr key={p.id} className={`hover:bg-slate-700/30 transition-colors ${!p.active ? "opacity-50" : ""}`}>
                                        <td className="p-4 font-mono text-emerald-400">{p.code}</td>
                                        <td className="p-4 text-white">{p.description || p.name}</td>
                                        <td className="p-4 text-sm text-white">{p.brand || "—"}</td>
                                        <td className="p-4 text-sm text-white">{p.family || "—"}</td>
                                        <td className="p-4 text-sm text-white">{p.unit_of_measure}</td>
                                        <td className="p-4 text-right font-mono">${p.cost_price?.toLocaleString() || "0.00"}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.active ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"}`}>
                                                {p.active ? "Activo" : "Inactivo"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => openEditModal(p)}
                                                    className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-600/30 transition-colors"
                                                >
                                                    Editar
                                                </button>
                                                {p.active && (
                                                    <button
                                                        onClick={() => handleDelete(p)}
                                                        className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-600/30 transition-colors"
                                                    >
                                                        Desactivar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Create/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-slate-700">
                            <h2 className="text-xl font-bold text-white">
                                {editingProduct ? "Editar Producto" : "Registrar Nuevo Producto"}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-400 uppercase">Código</label>
                                    <input required type="text" placeholder="API-001"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={newProduct.code}
                                        onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-400 uppercase">Unidad</label>
                                    <input required type="text" placeholder="PZA"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={newProduct.unit}
                                        onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-400 uppercase">Nombre</label>
                                <input required type="text" placeholder="Nombre del producto"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={newProduct.name}
                                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-400 uppercase">Segmento / Familia</label>
                                    <select required
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={newProduct.family}
                                        onChange={(e) => setNewProduct({ ...newProduct, family: e.target.value })}
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="TUBERIA">Tubería y Accesorios</option>
                                        <option value="REFACCIONES">Refacciones</option>
                                        <option value="OTROS">Otros</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-400 uppercase">Precio Costo ($)</label>
                                    <input required type="number" step="0.01" placeholder="0.00"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={newProduct.cost_price}
                                        onChange={(e) => setNewProduct({ ...newProduct, cost_price: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-400 uppercase">Stock Mínimo (Alerta)</label>
                                    <input required type="number" placeholder="0"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={newProduct.min_stock}
                                        onChange={(e) => setNewProduct({ ...newProduct, min_stock: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-400 uppercase">Marca</label>
                                <input type="text" placeholder="Ej: Parker, SMC, Festo"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={newProduct.brand}
                                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-400 uppercase">Descripción / Comentarios</label>
                                <textarea
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none min-h-[60px]"
                                    value={newProduct.description}
                                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                                />
                            </div>

                            {/* Initial stock — only when creating */}
                            {!editingProduct && (
                                <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700 space-y-3">
                                    <h3 className="text-sm font-bold text-slate-300">Stock Inicial (Opcional)</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Almacén</label>
                                            <select
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                                value={newProduct.warehouse_id}
                                                onChange={(e) => setNewProduct({ ...newProduct, warehouse_id: e.target.value })}
                                            >
                                                <option value="">Seleccionar...</option>
                                                {warehouses.map((w: any) => (
                                                    <option key={w.id} value={w.id}>{w.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Cantidad</label>
                                            <input type="number"
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                                value={newProduct.initial_stock}
                                                onChange={(e) => setNewProduct({ ...newProduct, initial_stock: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 rounded-lg transition-colors">
                                    Cancelar
                                </button>
                                <button disabled={isSubmitting} type="submit"
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors">
                                    {isSubmitting ? "Guardando..." : editingProduct ? "Actualizar" : "Guardar Producto"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Upload Dialog — warehouse selector */}
            {isUploadDialogOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="p-6 border-b border-slate-700">
                            <h2 className="text-xl font-bold text-white">📁 Cargar Archivo Excel</h2>
                            <p className="text-sm text-slate-400 mt-1">
                                Archivo: <span className="text-emerald-400 font-mono">{pendingFile?.name}</span>
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-400 uppercase">Almacén para stock inicial (opcional)</label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={uploadWarehouseId}
                                    onChange={(e) => setUploadWarehouseId(e.target.value)}
                                >
                                    <option value="">Sin stock inicial</option>
                                    {warehouses.map((w: any) => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500 mt-1">
                                    Si tu Excel tiene columna &quot;TOTAL EN EXISTENCIA&quot;, selecciona el almacén destino.
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsUploadDialogOpen(false); setPendingFile(null); }}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    disabled={isSubmitting}
                                    onClick={handleConfirmUpload}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
                                >
                                    {isSubmitting ? "Subiendo..." : "Subir Archivo"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
