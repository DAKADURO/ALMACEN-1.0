"use client";
import { useState, useEffect } from "react";
import { useNotification } from "@/context/NotificationContext";
import { fetchMovements, fetchProducts, fetchWarehouses } from "@/lib/api";
import { exportToCSV } from "@/lib/export";
import { generateVoucherPDF } from "@/lib/pdf-utils";

// Helpers for UI
const typeLabels: any = {
    "ENTRY": "Entrada",
    "EXIT": "Salida",
    "TRANSFER": "Transferencia",
    "INITIAL_ENTRY": "Carga Inicial",
    "ENTRADA_INITIAL": "Carga Inicial"
};

export default function ReportsPage() {
    const { showNotification } = useNotification();
    const [movements, setMovements] = useState([]);
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        product_id: "",
        warehouse_id: "",
        start_date: "",
        end_date: ""
    });

    useEffect(() => {
        Promise.all([
            fetchProducts(),
            fetchWarehouses()
        ]).then(([p, w]) => {
            setProducts(p);
            setWarehouses(w);
        });
        loadMovements();
    }, []);

    const loadMovements = async () => {
        setLoading(true);
        try {
            const data = await fetchMovements({
                product_id: filters.product_id ? parseInt(filters.product_id) : undefined,
                warehouse_id: filters.warehouse_id ? parseInt(filters.warehouse_id) : undefined,
                start_date: filters.start_date || undefined,
                end_date: filters.end_date || undefined
            });
            setMovements(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const exportData = movements.map((m: any) => {
            const product = products.find((p: any) => p.id === m.product_id) as any;
            const originWh = warehouses.find((w: any) => w.id === m.origin_warehouse_id) as any;
            const destWh = warehouses.find((w: any) => w.id === m.destination_warehouse_id) as any;

            return {
                ID: m.id,
                Fecha: new Date(m.created_at).toLocaleString(),
                Codigo: product?.code || "",
                Producto: product?.description || product?.name || "",
                Tipo: typeLabels[m.movement_type] || m.movement_type,
                Cantidad: m.quantity,
                Origen: originWh?.name || "N/A",
                Destino: destWh?.name || "N/A",
                Folio: m.reference_doc || "",
                Notas: m.notes || ""
            };
        });
        exportToCSV(exportData, "Reporte_Movimientos");
    };

    const handleReprint = async (folio: string) => {
        if (!folio) {
            showNotification("Este movimiento no tiene un folio asociado.", "warning");
            return;
        }

        try {
            // 1. Fetch all movements for this folio
            const movementsInVoucher = await fetchMovements({ reference_doc: folio });
            if (movementsInVoucher.length === 0) throw new Error("No se encontraron productos para este folio.");

            // 2. Prepare data for PDF
            const first = movementsInVoucher[0];
            const context = localStorage.getItem("inventory-context") || "tuberia";
            const selectedCompany = context === "refacciones" ? "PROAIR" : "AIRPIPE";

            // Extract secondary info from notes if possible (very basic parsing)
            const notes = first.notes || "";
            const requestedByMatch = notes.match(/Solicitante: (.*)\. Tipo:/);
            const requestedBy = requestedByMatch ? requestedByMatch[1] : "";

            // 3. Map items to PDF utility format
            const items = movementsInVoucher.map((m: any) => {
                const p = products.find((prod: any) => prod.id === m.product_id) as any;
                return {
                    code: p?.code || "N/A",
                    quantity: m.quantity,
                    unit: p?.unit_of_measure || "PZA",
                    name: p?.description || p?.name || "N/A"
                };
            });

            await generateVoucherPDF({
                folio: folio,
                mType: first.movement_type,
                entrySubType: notes.includes("Tipo: ") ? notes.split("Tipo: ")[1].split(".")[0] : "GENERAL",
                header: {
                    client: notes.includes("Cliente: ") ? notes.split("Cliente: ")[1].split(".")[0] : "Re-impresión",
                    requested_by: requestedBy,
                    origin_warehouse_id: first.origin_warehouse_id,
                    destination_warehouse_id: first.destination_warehouse_id,
                    delivery_person: first.created_by || "MIGUEL LOMELI",
                    date: new Date(first.created_at).toLocaleDateString('es-MX')
                },
                items,
                selectedCompany,
                warehouses
            });
            showNotification("Vale PDF generado con éxito", "success");
        } catch (error: any) {
            showNotification("Error al regenerar PDF: " + error.message, "error");
        }
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 sm:gap-0">
                <div>
                    <h1 className="text-3xl font-bold text-yellow-400">Reportes y Kardex</h1>
                    <p className="text-white/80 mt-1">Historial de movimientos y exportación de datos.</p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={movements.length === 0}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                >
                    <span>📥</span> Exportar CSV
                </button>
            </header>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-6 rounded-2xl bg-[#131722]/60 border border-white/10 backdrop-blur-sm shadow-xl">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-white/70 uppercase ml-1">Producto</label>
                    <select
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        value={filters.product_id}
                        onChange={(e) => setFilters({ ...filters, product_id: e.target.value })}
                    >
                        <option value="">Todos los productos</option>
                        {products.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.code} - {p.description || p.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-white/70 uppercase ml-1">Almacén</label>
                    <select
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        value={filters.warehouse_id}
                        onChange={(e) => setFilters({ ...filters, warehouse_id: e.target.value })}
                    >
                        <option value="">Todos los almacenes</option>
                        {warehouses.map((w: any) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-white/70 uppercase ml-1">Desde</label>
                    <input
                        type="date"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        value={filters.start_date}
                        onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-white/70 uppercase ml-1">Hasta</label>
                    <input
                        type="date"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        value={filters.end_date}
                        onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                    />
                </div>

                <div className="flex items-end">
                    <button
                        onClick={loadMovements}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl font-bold transition-all"
                    >
                        Filtrar
                    </button>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block rounded-2xl border border-white/10 overflow-hidden bg-[#131722]/40 backdrop-blur-sm shadow-xl">
                <table className="w-full text-left">
                    <thead className="bg-[#131722] border-b border-white/10 text-white text-[10px] uppercase tracking-widest font-black">
                        <tr>
                            <th className="p-4">Fecha</th>
                            <th className="p-4">Producto</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4 text-center">Cantidad</th>
                            <th className="p-4">Origen</th>
                            <th className="p-4">Destino</th>
                            <th className="p-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-sm">
                        {loading ? (
                            <tr><td colSpan={7} className="p-12 text-center text-white/50 text-lg animate-pulse">Cargando movimientos...</td></tr>
                        ) : movements.length === 0 ? (
                            <tr><td colSpan={7} className="p-12 text-center text-white/50">No hay movimientos que coincidan con los filtros.</td></tr>
                        ) : movements.map((m: any) => {
                            const product = products.find((p: any) => p.id === m.product_id) as any;
                            const originWh = warehouses.find((w: any) => w.id === m.origin_warehouse_id) as any;
                            const destWh = warehouses.find((w: any) => w.id === m.destination_warehouse_id) as any;

                            return (
                                <tr key={m.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 whitespace-nowrap text-white text-xs">
                                        {new Date(m.created_at).toLocaleString('es-MX', {
                                            day: '2-digit', month: '2-digit', year: '2-digit',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-white text-xs leading-tight">{product?.description || product?.name || "Cargando..."}</div>
                                        <div className="text-[10px] font-mono text-emerald-500 mt-1">{product?.code}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${m.movement_type === 'ENTRY' ? 'bg-emerald-900/40 text-emerald-400' :
                                            m.movement_type === 'EXIT' ? 'bg-red-900/40 text-red-400' :
                                                m.movement_type === 'TRANSFER' ? 'bg-blue-900/40 text-blue-400' :
                                                    'bg-[#1F2433] text-white/70'
                                            }`}>
                                            {typeLabels[m.movement_type] || m.movement_type}
                                        </span>
                                    </td>
                                    <td className="p-4 font-black text-center">{m.quantity}</td>
                                    <td className="p-4 text-[10px] text-white/60">{originWh?.name || "—"}</td>
                                    <td className="p-4 text-[10px] text-white/60">{destWh?.name || "—"}</td>
                                    <td className="p-4 text-center">
                                        {m.reference_doc && (
                                            <button
                                                onClick={() => handleReprint(m.reference_doc)}
                                                className="px-3 py-1.5 bg-[#1F2433] hover:bg-white/10 border border-white/5 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 mx-auto"
                                                title="Vale PDF"
                                            >
                                                📄 Vale PDF
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards View */}
            <div className="sm:hidden space-y-4">
                {loading ? (
                    <div className="p-12 text-center text-white/50 animate-pulse">Cargando movimientos...</div>
                ) : movements.length === 0 ? (
                    <div className="p-12 text-center text-white/50 bg-[#131722]/40 rounded-2xl border border-white/10">No hay movimientos.</div>
                ) : movements.map((m: any) => {
                    const product = products.find((p: any) => p.id === m.product_id) as any;
                    const originWh = warehouses.find((w: any) => w.id === m.origin_warehouse_id) as any;
                    const destWh = warehouses.find((w: any) => w.id === m.destination_warehouse_id) as any;

                    return (
                        <div key={m.id} className="bg-[#131722]/60 border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg backdrop-blur-sm relative overflow-hidden">
                            {/* Card Header: Type and Quantity */}
                            <div className="flex justify-between items-center">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                    m.movement_type === 'ENTRY' ? 'bg-emerald-500/20 text-emerald-400' :
                                    m.movement_type === 'EXIT' ? 'bg-red-500/20 text-red-400' :
                                    m.movement_type === 'TRANSFER' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-white/10 text-white/70'
                                }`}>
                                    {typeLabels[m.movement_type] || m.movement_type}
                                </span>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-white/40 uppercase block leading-none">Cantidad</span>
                                    <span className="text-xl font-black text-white">{m.quantity}</span>
                                </div>
                            </div>

                            {/* Card Body: Product Info */}
                            <div className="space-y-1">
                                <div className="text-[10px] font-mono text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-md inline-block mb-1">
                                    {product?.code}
                                </div>
                                <h3 className="text-sm font-bold text-white leading-relaxed">
                                    {product?.description || product?.name || "Cargando..."}
                                </h3>
                            </div>

                            {/* Card Details: Route and Info */}
                            <div className="grid grid-cols-2 gap-4 py-2 border-y border-white/5">
                                <div>
                                    <span className="text-[9px] font-black text-white/30 uppercase block">Origen</span>
                                    <span className="text-[11px] text-white/80 font-medium">{originWh?.name || "—"}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-white/30 uppercase block">Destino</span>
                                    <span className="text-[11px] text-white/80 font-medium">{destWh?.name || "—"}</span>
                                </div>
                            </div>

                            {/* Card Footer: Metadata and Actions */}
                            <div className="flex justify-between items-end gap-2">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-white/40">
                                        <span className="text-[10px]">🕒</span>
                                        <span className="text-[10px] font-medium">
                                            {new Date(m.created_at).toLocaleString('es-MX', {
                                                day: '2-digit', month: '2-digit', year: '2-digit',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    {m.reference_doc && (
                                        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">
                                            Folio: {m.reference_doc}
                                        </div>
                                    )}
                                </div>
                                
                                {m.reference_doc && (
                                    <button
                                        onClick={() => handleReprint(m.reference_doc)}
                                        className="h-9 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-500/20 active:scale-95 flex items-center gap-2"
                                    >
                                        <span>📄</span> Vale PDF
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
