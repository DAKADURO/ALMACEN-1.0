"use client";
import { useState, useEffect, useRef } from "react";
import { 
    fetchInventorySummary, 
    fetchProducts, 
    createProduct, 
    fetchWarehouses, 
    createWarehouse, 
    recordMovement, 
    updateProduct, 
    deleteProduct, 
    uploadProductsFile,
    fetchBrands,
    createBrand
} from "@/lib/api";
import { useNotification } from "@/context/NotificationContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import Link from "next/link";

export default function InventoryPage() {
    const { showNotification } = useNotification();
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
    const [brands, setBrands] = useState<any[]>([]);
    const [brandSearch, setBrandSearch] = useState("");
    const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);

    const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
    const [newWarehouse, setNewWarehouse] = useState({ name: "", description: "", location_type: "FIXED" });

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
        fetchBrands().then(setBrands).catch(console.error);
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
            showNotification(result.detail, "success");
            refreshData();
        } catch (error: any) {
            showNotification("Error al cargar: " + error.message, "error");
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
            showNotification("Producto desactivado", "info");
        } catch (error: any) {
            showNotification("Error: " + error.message, "error");
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
                showNotification("Producto actualizado", "success");
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
                showNotification("Producto creado", "success");
            }
            setIsModalOpen(false);
            refreshData();
        } catch (error: any) {
            showNotification("Error: " + error.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddBrand = async (name: string) => {
        if (!name.trim()) return;
        try {
            const b = await createBrand(name.trim());
            setBrands([...brands, b]);
            setNewProduct({ ...newProduct, brand: b.name });
            setBrandSearch("");
            setIsBrandDropdownOpen(false);
            showNotification(`Marca "${b.name}" registrada`, "success");
        } catch (error: any) {
            showNotification("Error: " + error.message, "error");
        }
    };

    const handleWarehouseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await createWarehouse(newWarehouse);
            showNotification("Almacén creado exitosamente", "success");
            setIsWarehouseModalOpen(false);
            setNewWarehouse({ name: "", description: "", location_type: "FIXED" });
            fetchWarehouses().then(setWarehouses).catch(console.error);
        } catch (error: any) {
            showNotification("Error: " + error.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getWarehouseColor = (name: string) => {
        const n = name.toUpperCase();
        if (n.includes("TIJUANA")) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
        if (n.includes("HERMOSILLO")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
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
        const isProAir = context === "refacciones";
        const primaryColor = isProAir ? [0, 173, 239] : [0, 112, 184];
        const title = isProAir ? "REPORTE DE EXISTENCIAS - PRO AIR" : "REPORTE DE EXISTENCIAS - AIRpipe";
        const logoPath = isProAir ? "/logos/proair_logo.png" : "/logos/airpipe_logo.png";

        // Company Logo
        try {
            doc.addImage(logoPath, 'PNG', 14, 12, isProAir ? 25 : 35, isProAir ? 25 : 12);
        } catch (e) {
            console.warn("Logo could not be loaded", e);
            doc.setFontSize(18);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text(isProAir ? "Pro Air" : "AIRpipe", 14, 20);
        }

        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(title, 14, isProAir ? 40 : 28);
        doc.setFontSize(10);
        doc.text(`Fecha: ${date}`, 14, isProAir ? 48 : 36);
        doc.text(`Filtro Almacén: ${selectedWarehouse === "all" ? "Todos" : selectedWarehouse}`, 14, isProAir ? 54 : 42);

        const tableData = filteredData.map((item: any) => [
            item.code,
            item.description || item.name,
            item.warehouse_name,
            item.current_stock.toString()
        ]);

        autoTable(doc, {
            startY: isProAir ? 60 : 50,
            head: [['CÓDIGO', 'DESCRIPCIÓN', 'ALMACÉN', 'EXISTENCIA']],
            body: tableData,
            headStyles: { fillColor: primaryColor as [number, number, number] },
            theme: 'striped'
        });

        doc.save(`Existencias_${context}_${date.replace(/\//g, '-')}.pdf`);
    };

    const generateLabelPDF = async (product: any) => {
        try {
            const context = localStorage.getItem("inventory-context") || "tuberia";
            const isProAir = context === "refacciones";
            const primaryColor = isProAir ? "#00ADEF" : "#0070B8";

            // Small format: 50x30 mm
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [50, 30]
            });

            // Generate QR Code
            const qrDataUrl = await QRCode.toDataURL(product.code, {
                margin: 0,
                color: { dark: '#000000', light: '#ffffff' }
            });

            // Draw Label Content
            // 1. QR Code (Left side)
            doc.addImage(qrDataUrl, 'PNG', 2, 4, 22, 22);

            // 2. Company Brand Indicator
            doc.setFillColor(primaryColor);
            doc.rect(26, 4, 22, 2, 'F');
            doc.setFontSize(6);
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.text(isProAir ? "PRO AIR" : "AIRpipe", 37, 5.5, { align: "center" });

            // 3. Product Info (Right side)
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(8);
            doc.text(product.code, 26, 10);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(5);
            const splitName = doc.splitTextToSize(product.description || product.name, 22);
            doc.text(splitName, 26, 13);

            // 4. Brand & Unit
            doc.setFont("helvetica", "bold");
            doc.setFontSize(4);
            doc.text(`MARCA: ${product.brand || "N/A"}`, 26, 24);
            doc.text(`UNID: ${product.unit_of_measure}`, 26, 26);

            // Footer / Border
            doc.setDrawColor(primaryColor);
            doc.setLineWidth(0.5);
            doc.line(2, 28, 48, 28);

            doc.save(`Etiqueta_${product.code}.pdf`);
            showNotification("Etiqueta generada", "success");
        } catch (error) {
            console.error("Error generating label:", error);
            showNotification("Error al generar la etiqueta", "error");
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Inventario</h1>
                    <p className="text-white/80 mt-1">Existencias y catálogo de productos.</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
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
                        className="flex-grow md:flex-none bg-[#1F2433] hover:bg-white/10 border border-white/5 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                        <span>📁</span> Cargar Excel/CSV
                    </button>
                    <button
                        onClick={() => setIsWarehouseModalOpen(true)}
                        className="flex-grow md:flex-none bg-[#1F2433] hover:bg-white/10 border border-white/5 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                        <span>📍</span> + Almacén
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex-grow md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                        + Nuevo Producto
                    </button>
                    {tab === "stock" && (
                        <button
                            onClick={downloadPDF}
                            className="flex-grow md:flex-none bg-[#1F2433] hover:bg-white/10 border border-white/5 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
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
            <div className="flex bg-[#131722]/80 p-1 rounded-xl border border-white/10 backdrop-blur-sm self-stretch lg:self-auto overflow-x-auto no-scrollbar">
                <button
                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${tab === 'stock' ? 'bg-emerald-500 text-[#0B0E14] shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                    onClick={() => setTab('stock')}
                >
                    <span>📦</span> Existencias
                </button>
                <button
                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${tab === 'products' ? 'bg-emerald-500 text-[#0B0E14] shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                    onClick={() => setTab('products')}
                >
                    <span>📋</span> Catálogo de Productos
                </button>
                <Link
                    href="/inventory/audit"
                    className="whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold text-white/70 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
                >
                    <span>📝</span> Auditoría (Corte Mes)
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 p-4 rounded-xl bg-[#131722]/60 border border-white/10">
                <div className="relative flex-grow">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 text-xs">🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar por código o descripción..."
                        className="w-full bg-black/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white text-sm transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        className="flex-grow md:flex-none bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-xs"
                        value={selectedSegment}
                        onChange={(e) => setSelectedSegment(e.target.value)}
                    >
                        <option value="all">📁 Segmentos</option>
                        <option value="TUBERIA">🛠️ Airpipe</option>
                        <option value="REFACCIONES">⚙️ Proair</option>
                    </select>

                    {tab === "stock" && (
                        <select
                            className="flex-grow md:flex-none bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                            value={selectedWarehouse}
                            onChange={(e) => setSelectedWarehouse(e.target.value)}
                        >
                            <option value="all">📍 Almacenes</option>
                            {warehouses.map((w: any) => (
                                <option key={w.id} value={w.name}>{w.name}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Stock Table */}
            {tab === "stock" && (
                <div className="rounded-2xl border border-white/10 bg-[#131722]/40 overflow-hidden shadow-xl">
                    <div className="max-h-[calc(100vh-350px)] overflow-auto no-scrollbar">
                        <table className="w-full text-left border-separate border-spacing-0 min-w-[600px]">
                            <thead className="sticky top-0 z-20 bg-[#131722] border-b border-white/10 text-white text-sm uppercase">
                                <tr>
                                    <th className="p-4 bg-[#131722] rounded-tl-2xl">Código</th>
                                    <th className="p-4 bg-[#131722]">Descripción</th>
                                    <th className="p-4 bg-[#131722]">Almacén</th>
                                    <th className="p-4 bg-[#131722] text-right rounded-tr-2xl">Existencia</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-white/50 animate-pulse">Cargando...</td></tr>
                                ) : filteredData.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-white/50">Sin registros.</td></tr>
                                ) : filteredData.map((item: any, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-mono text-emerald-400">{item.code}</td>
                                        <td className="p-4 text-white hover:text-emerald-300 font-medium transition-colors">{item.description || item.name}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${getWarehouseColor(item.warehouse_name)}`}>
                                                {item.warehouse_name}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-bold text-white">{item.current_stock}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Products Catalog Table */}
            {tab === "products" && (
                <div className="rounded-2xl border border-white/10 bg-[#131722]/40 overflow-hidden shadow-xl">
                    <div className="max-h-[calc(100vh-350px)] overflow-auto no-scrollbar">
                        <table className="w-full text-left border-separate border-spacing-0 min-w-[800px]">
                            <thead className="sticky top-0 z-20 bg-[#131722] border-b border-white/10 text-white text-sm uppercase">
                                <tr>
                                    <th className="p-4 bg-[#131722] rounded-tl-2xl">Código</th>
                                    <th className="p-4 bg-[#131722]">Descripción</th>
                                    <th className="p-4 bg-[#131722]">Marca</th>
                                    <th className="p-4 bg-[#131722]">Familia</th>
                                    <th className="p-4 bg-[#131722]">Unidad</th>
                                    <th className="p-4 bg-[#131722] text-right">Costo ($)</th>
                                    <th className="p-4 bg-[#131722] text-center">Estado</th>
                                    <th className="p-4 bg-[#131722] text-right rounded-tr-2xl">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {loading ? (
                                    <tr><td colSpan={8} className="p-8 text-center text-white/50 animate-pulse">Cargando...</td></tr>
                                ) : filteredProducts.length === 0 ? (
                                    <tr><td colSpan={8} className="p-8 text-center text-white/50">Sin productos.</td></tr>
                                ) : filteredProducts.map((p: any) => (
                                    <tr key={p.id} className={`hover:bg-white/5 transition-colors ${!p.active ? "opacity-50" : ""}`}>
                                        <td className="p-4 font-mono text-emerald-400">{p.code}</td>
                                        <td className="p-4 text-white hover:text-emerald-300 font-medium transition-colors">{p.description || p.name}</td>
                                        <td className="p-4 text-sm text-white/90">{p.brand || "—"}</td>
                                        <td className="p-4 text-sm text-white/90">{p.family || "—"}</td>
                                        <td className="p-4 text-sm text-white/90">{p.unit_of_measure}</td>
                                        <td className="p-4 text-right font-mono text-white">${p.cost_price?.toLocaleString() || "0.00"}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.active ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"}`}>
                                                {p.active ? "Activo" : "Inactivo"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => generateLabelPDF(p)}
                                                    className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-600/30 transition-colors flex items-center gap-1"
                                                    title="Descargar Etiqueta QR"
                                                >
                                                    🏷️ <span className="hidden sm:inline">Etiqueta</span>
                                                </button>
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
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#131722] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-white/10">
                            <h2 className="text-xl font-bold text-white">
                                {editingProduct ? "Editar Producto" : "Registrar Nuevo Producto"}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-white/70 uppercase">Código</label>
                                    <input required type="text" placeholder="API-001"
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={newProduct.code}
                                        onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-white/70 uppercase">Unidad</label>
                                    <input required type="text" placeholder="PZA"
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={newProduct.unit}
                                        onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-white/70 uppercase">Nombre</label>
                                <input required type="text" placeholder="Nombre del producto"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={newProduct.name}
                                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-white/70 uppercase">Segmento / Familia</label>
                                    <select required
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
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
                                    <label className="text-xs font-bold text-white/70 uppercase">Precio Costo ($)</label>
                                    <input required type="number" step="0.01" placeholder="0.00"
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={newProduct.cost_price}
                                        onChange={(e) => setNewProduct({ ...newProduct, cost_price: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-white/70 uppercase">Stock Mínimo (Alerta)</label>
                                    <input required type="number" placeholder="0"
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={newProduct.min_stock}
                                        onChange={(e) => setNewProduct({ ...newProduct, min_stock: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1 relative">
                                <label className="text-xs font-bold text-white/70 uppercase">Marca</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder="Buscar o agregar marca..."
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={isBrandDropdownOpen ? brandSearch : newProduct.brand}
                                        onFocus={() => {
                                            setIsBrandDropdownOpen(true);
                                            setBrandSearch(newProduct.brand);
                                        }}
                                        onChange={(e) => setBrandSearch(e.target.value)}
                                    />
                                    {isBrandDropdownOpen && (
                                        <div className="absolute z-50 left-0 right-0 mt-1 bg-[#1F2433] border border-white/10 rounded-lg shadow-2xl max-h-48 overflow-auto animate-in fade-in slide-in-from-top-1 duration-200">
                                            {brands.filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase())).map((b) => (
                                                <button
                                                    key={b.id}
                                                    type="button"
                                                    className="w-full text-left px-4 py-2 hover:bg-emerald-500 hover:text-[#0B0E14] text-sm text-white/80 transition-colors border-b border-white/5 last:border-0"
                                                    onClick={() => {
                                                        setNewProduct({ ...newProduct, brand: b.name });
                                                        setIsBrandDropdownOpen(false);
                                                        setBrandSearch("");
                                                    }}
                                                >
                                                    {b.name}
                                                </button>
                                            ))}
                                            {brandSearch.trim() && !brands.find(b => b.name.toLowerCase() === brandSearch.toLowerCase()) && (
                                                <button
                                                    type="button"
                                                    className="w-full text-left px-4 py-3 bg-emerald-500/10 text-emerald-400 text-sm font-bold hover:bg-emerald-500/20 transition-colors"
                                                    onClick={() => handleAddBrand(brandSearch)}
                                                >
                                                    + Agregar &quot;{brandSearch}&quot;
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {isBrandDropdownOpen && (
                                    <div className="fixed inset-0 z-40" onClick={() => setIsBrandDropdownOpen(false)} />
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-white/70 uppercase">Descripción / Comentarios</label>
                                <textarea
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-500 outline-none min-h-[60px]"
                                    value={newProduct.description}
                                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                                />
                            </div>

                            {/* Initial stock — only when creating */}
                            {!editingProduct && (
                                <div className="p-4 bg-black/50 rounded-xl border border-white/10 space-y-3">
                                    <h3 className="text-sm font-bold text-white">Stock Inicial (Opcional)</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-white/60 uppercase">Almacén</label>
                                            <select
                                                className="w-full bg-[#131722] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none"
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
                                            <label className="text-[10px] font-bold text-white/60 uppercase">Cantidad</label>
                                            <input type="number"
                                                className="w-full bg-[#131722] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                                value={newProduct.initial_stock}
                                                onChange={(e) => setNewProduct({ ...newProduct, initial_stock: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)}
                                    className="flex-1 bg-[#1F2433] hover:bg-white/10 text-white font-medium py-2 rounded-lg transition-colors border border-white/5">
                                    Cancelar
                                </button>
                                <button disabled={isSubmitting} type="submit"
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition-colors">
                                    {isSubmitting ? "Guardando..." : editingProduct ? "Actualizar" : "Guardar Producto"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Upload Dialog — warehouse selector */}
            {isUploadDialogOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#131722] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="p-6 border-b border-white/10">
                            <h2 className="text-xl font-bold text-white">📁 Cargar Archivo Excel</h2>
                            <p className="text-sm text-white/70 mt-1">
                                Archivo: <span className="text-emerald-400 font-mono">{pendingFile?.name}</span>
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-white/70 uppercase">Almacén para stock inicial (opcional)</label>
                                <select
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={uploadWarehouseId}
                                    onChange={(e) => setUploadWarehouseId(e.target.value)}
                                >
                                    <option value="">Sin stock inicial</option>
                                    {warehouses.map((w: any) => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-white/50 mt-1">
                                    Si tu Excel tiene columna &quot;TOTAL EN EXISTENCIA&quot;, selecciona el almacén destino.
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsUploadDialogOpen(false); setPendingFile(null); }}
                                    className="flex-1 bg-[#1F2433] hover:bg-white/10 border border-white/5 text-white font-medium py-2 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    disabled={isSubmitting}
                                    onClick={handleConfirmUpload}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition-colors"
                                >
                                    {isSubmitting ? "Subiendo..." : "Subir Archivo"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Warehouse Creation Modal */}
            {isWarehouseModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#131722] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="p-6 border-b border-white/10">
                            <h2 className="text-xl font-bold text-white">📍 Registrar Nuevo Almacén</h2>
                        </div>
                        <form onSubmit={handleWarehouseSubmit} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-white/70 uppercase">Nombre del Almacén</label>
                                <input required type="text" placeholder="Ej: QUERÉTARO"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={newWarehouse.name}
                                    onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-white/70 uppercase">Descripción</label>
                                <input type="text" placeholder="Ubicación o uso..."
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={newWarehouse.description}
                                    onChange={(e) => setNewWarehouse({ ...newWarehouse, description: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-white/70 uppercase">Tipo</label>
                                <select required
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={newWarehouse.location_type}
                                    onChange={(e) => setNewWarehouse({ ...newWarehouse, location_type: e.target.value })}
                                >
                                    <option value="FIXED">Fijo (Bodega)</option>
                                    <option value="VEHICLE">Vehículo (Unidad Móvil)</option>
                                    <option value="OTHER">Otro</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsWarehouseModalOpen(false)}
                                    className="flex-1 bg-[#1F2433] hover:bg-white/10 text-white font-medium py-2 rounded-lg transition-colors border border-white/5">
                                    Cancelar
                                </button>
                                <button disabled={isSubmitting} type="submit"
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition-colors">
                                    {isSubmitting ? "Creando..." : "Crear Almacén"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
