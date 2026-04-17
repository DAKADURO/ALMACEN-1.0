"use client";
import { useState, useEffect } from "react";
import { fetchWarehouses, startAudit, fetchAudit, updateAuditItems, finishAudit, fetchActiveAudit, Warehouse, Audit, AuditItem } from "@/lib/api";
import Link from "next/link";
import BarcodeScanner from "@/components/BarcodeScanner";

export default function AuditPage() {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
    const [audit, setAudit] = useState<Audit | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [showGlobalScanner, setShowGlobalScanner] = useState(false);
    const [highlightedProductId, setHighlightedProductId] = useState<number | null>(null);

    useEffect(() => {
        fetchWarehouses()
            .then(setWarehouses)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleCheckActive = async (whId: string) => {
        if (!whId) return;
        setLoading(true);
        try {
            const active = await fetchActiveAudit(parseInt(whId));
            if (active) {
                setAudit(active);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartAudit = async () => {
        if (!selectedWarehouse) return;
        setLoading(true);
        try {
            const newAudit = await startAudit(parseInt(selectedWarehouse));
            setAudit(newAudit);
            setMessage({ text: "Auditoría iniciada correctamente.", type: "success" });
        } catch (error: any) {
            setMessage({ text: error.message, type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCount = (productId: number, count: string) => {
        if (!audit) return;
        const updatedItems = audit.items.map((item: AuditItem) => 
            item.product_id === productId ? { ...item, counted_stock: count === "" ? undefined : parseInt(count) } : item
        );
        setAudit({ ...audit, items: updatedItems });
    };

    const handleSaveProgress = async () => {
        if (!audit) return;
        setSaving(true);
        try {
            const itemsToUpdate = audit.items.map((it: AuditItem) => ({
                product_id: it.product_id,
                counted_stock: it.counted_stock,
                notes: it.notes
            }));
            await updateAuditItems(audit.id, itemsToUpdate);
            setMessage({ text: "Progreso guardado.", type: "success" });
        } catch (error: any) {
            setMessage({ text: error.message, type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const handleFinish = async () => {
        if (!audit) return;
        if (!confirm("¿Estás seguro de finalizar la auditoría? Se generarán ajustes automáticos en el inventario.")) return;
        setSaving(true);
        try {
            // Save first to ensure latest counts are in DB
            const itemsToUpdate = audit.items.map((it: AuditItem) => ({
                product_id: it.product_id,
                counted_stock: it.counted_stock,
                notes: it.notes
            }));
            await updateAuditItems(audit.id, itemsToUpdate);
            
            const finished = await finishAudit(audit.id);
            setAudit(finished);
            setMessage({ text: "Auditoría finalizada y stock ajustado.", type: "success" });
        } catch (error: any) {
            setMessage({ text: error.message, type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const handleGlobalScanSuccess = (decodedText: string) => {
        if (!audit) return;
        const productItem = audit.items.find((it: AuditItem) => 
            it.product?.code.trim().toUpperCase() === decodedText.trim().toUpperCase()
        );

        if (productItem) {
            setShowGlobalScanner(false);
            setHighlightedProductId(productItem.product_id);
            // Scroll to the element
            const element = document.getElementById(`audit-item-${productItem.product_id}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            // Clear highlight after 3 seconds
            setTimeout(() => setHighlightedProductId(null), 3000);
        } else {
            alert(`Producto con código "${decodedText}" no encontrado en esta auditoría.`);
            setShowGlobalScanner(false);
        }
    };

    if (loading) return <div className="text-white p-8 animate-pulse text-center">Cargando...</div>;

    if (!audit) {
        return (
            <div className="max-w-2xl mx-auto space-y-6 text-white p-2 sm:p-4">
                <header className="space-y-2 text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase text-yellow-400">MODO AUDITORÍA 📝</h1>
                    <p className="text-slate-400 text-sm">Selecciona un almacén para comenzar el conteo físico.</p>
                </header>

                <div className="p-6 sm:p-8 rounded-3xl bg-slate-800/40 border border-slate-700 backdrop-blur-xl space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-emerald-400/80">Almacén a Auditar</label>
                        <select 
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none text-sm font-bold"
                            value={selectedWarehouse}
                            onChange={(e) => {
                                setSelectedWarehouse(e.target.value);
                                handleCheckActive(e.target.value);
                            }}
                        >
                            <option value="">Seleccionar Almacén...</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>

                    <button 
                        disabled={!selectedWarehouse}
                        onClick={handleStartAudit}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 text-slate-900 font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest text-sm active:scale-95"
                    >
                        Comenzar Nueva Auditoría
                    </button>
                    
                    <div className="pt-4 border-t border-slate-700/50">
                        <Link href="/inventory" className="text-slate-400 hover:text-white text-xs transition-colors flex items-center justify-center gap-2">
                            <span>←</span> Volver al Inventario
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const discrepancies = (audit?.items || []).filter((it: any) => it.counted_stock !== null && it.counted_stock !== it.system_stock).length;

    return (
        <div className="space-y-6 text-white pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-black uppercase text-yellow-400">AUDITORÍA: {audit.warehouse?.name}</h1>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${audit.status === 'COMPLETED' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-slate-900'}`}>
                            {audit.status === 'COMPLETED' ? 'Finalizada' : 'En Progreso'}
                        </span>
                        <span className="text-[10px] sm:text-xs text-slate-400">Ref: #{audit.id} · {new Date(audit.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                {audit.status === 'IN_PROGRESS' && (
                    <div className="flex gap-2 w-full md:w-auto">
                        <button 
                            onClick={() => setShowGlobalScanner(true)}
                            className="flex-grow md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40"
                        >
                            <span>📸</span> Escanear
                        </button>
                        <button onClick={handleSaveProgress} disabled={saving} className="flex-grow md:flex-none px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-semibold transition-colors active:scale-95">
                            Guardar Avance
                        </button>
                        <button onClick={handleFinish} disabled={saving} className="flex-grow md:flex-none px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95">
                            Finalizar
                        </button>
                    </div>
                )}
            </header>

            {message.text && (
                <div className={`p-4 rounded-xl text-sm font-medium border ${message.type === 'success' ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' : 'bg-red-900/20 border-red-500/30 text-red-400'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700">
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1 italic">Total Ítems</div>
                    <div className="text-xl sm:text-2xl font-black tracking-tighter">{audit?.items?.length || 0}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700">
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1 italic text-emerald-400/60">Contados</div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tighter">{(audit?.items || []).filter((it: any) => it.counted_stock !== null).length}</div>
                </div>
                <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-slate-800/40 border border-slate-700">
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1 italic text-red-400/60">Discrepancias</div>
                    <div className={`text-xl sm:text-2xl font-black tracking-tighter ${discrepancies > 0 ? "text-red-500" : "text-slate-400"}`}>{discrepancies}</div>
                </div>
            </div>

            <div className="rounded-3xl border border-slate-700/50 bg-slate-800/20 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead className="bg-slate-800/60 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-700/50">
                            <tr>
                                <th className="px-6 py-4">Producto</th>
                                <th className="px-6 py-4 text-center">Sistema</th>
                                <th className="px-6 py-4 text-center">Físico (Real)</th>
                                <th className="px-6 py-4 text-center">Dif.</th>
                                <th className="px-6 py-4">Notas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/30">
                            {(audit?.items || []).map((item: AuditItem) => {
                                const isCounted = item.counted_stock !== undefined && item.counted_stock !== null;
                                const diff = isCounted ? (item.counted_stock || 0) - item.system_stock : 0;
                            const hasDiff = isCounted && diff !== 0;
                            const isHighlighted = highlightedProductId === item.product_id;

                            return (
                                <tr 
                                    key={item.id} 
                                    id={`audit-item-${item.product_id}`}
                                    className={`hover:bg-white/5 transition-all duration-500 ${hasDiff ? "bg-red-500/5" : ""} ${isHighlighted ? "bg-emerald-500/20 ring-2 ring-emerald-500 ring-inset" : ""}`}
                                >
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-sm text-emerald-400">{item.product?.code || 'S/C'}</div>
                                        <div className="text-xs opacity-60 line-clamp-1">{item.product?.name || 'Producto no encontrado'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm font-mono opacity-60">
                                        {item.system_stock}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {audit.status === 'IN_PROGRESS' ? (
                                            <input 
                                                type="number" 
                                                inputMode="numeric"
                                                placeholder="0"
                                                className={`w-24 bg-slate-950 border-2 ${hasDiff ? "border-red-500" : "border-slate-700"} rounded-xl px-2 py-3 text-center text-lg font-black focus:ring-2 focus:ring-emerald-500 outline-none transition-all`}
                                                value={item.counted_stock === null ? "" : item.counted_stock}
                                                onChange={(e) => handleUpdateCount(item.product_id, e.target.value)}
                                            />
                                        ) : (
                                            <span className="font-black text-lg">{item.counted_stock}</span>
                                        )}
                                    </td>
                                    <td className={`px-6 py-4 text-center text-sm font-bold ${diff > 0 ? "text-emerald-400" : diff < 0 ? "text-red-500" : "opacity-20"}`}>
                                        {isCounted && diff !== 0 ? (diff > 0 ? `+${diff}` : diff) : "-"}
                                    </td>
                                    <td className="px-6 py-4">
                                        {audit.status === 'IN_PROGRESS' ? (
                                            <input 
                                                type="text" 
                                                placeholder="Ej: Dañado"
                                                className="w-full bg-slate-900/50 border border-slate-700/50 rounded px-2 py-1 text-xs outline-none"
                                                value={item.notes || ""}
                                                onChange={(e) => {
                                                    const updated = audit.items.map((it: any) => 
                                                        it.product_id === item.product_id ? { ...it, notes: e.target.value } : it
                                                    );
                                                    setAudit({ ...audit, items: updated });
                                                }}
                                            />
                                        ) : (
                                            <span className="text-xs opacity-50 italic">{item.notes || "-"}</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {showGlobalScanner && (
                <BarcodeScanner 
                    onScanSuccess={handleGlobalScanSuccess} 
                    onClose={() => setShowGlobalScanner(false)} 
                />
            )}
        </div>

            <div className="flex justify-between items-center pt-8">
                <button 
                    onClick={() => {
                        window.scrollTo(0, 0);
                        setAudit(null);
                        setSelectedWarehouse("");
                    }} 
                    className="text-slate-500 hover:text-white text-sm transition-colors"
                >
                    {audit.status === 'COMPLETED' ? "← Volver a lista" : "Cerrar sesión actual"}
                </button>
                {audit.status === 'COMPLETED' && (
                    <Link href="/inventory" className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-bold transition-colors">
                        Volver a Inventario
                    </Link>
                )}
            </div>
        </div>
    );
}
