"use client";
import React, { useState, useEffect } from "react";
import { fetchInventorySummary, recordAdjustment, fetchWarehouses } from "@/lib/api";

export default function AdjustPage() {
    const [inventory, setInventory] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [newQuantity, setNewQuantity] = useState("");
    const [notes, setNotes] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [inv, wh] = await Promise.all([
                fetchInventorySummary(),
                fetchWarehouses()
            ]);
            setInventory(inv);
            setWarehouses(wh);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAdjust = async () => {
        if (!selectedItem || newQuantity === "") return;

        setIsSubmitting(true);
        try {
            await recordAdjustment({
                product_id: selectedItem.product_id,
                warehouse_id: selectedItem.warehouse_id,
                new_quantity: parseInt(newQuantity),
                notes: notes,
                created_by: "Almacenista"
            });

            alert("✅ Ajuste realizado con éxito");
            setSelectedItem(null);
            setNewQuantity("");
            setNotes("");
            loadData();
        } catch (e: any) {
            alert("❌ Error: " + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredInventory = inventory.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold">Ajustes de Inventario</h1>
                <p className="text-slate-400">Corrige existencias tras conteos físicos o auditorías.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* List and Search */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar por código o nombre..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pl-12 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        <span className="absolute left-4 top-3.5 text-slate-500 text-xl">🔍</span>
                    </div>

                    <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden backdrop-blur-sm h-[600px] overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-800/60 sticky top-0 z-10 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700">
                                <tr>
                                    <th className="p-4">Producto</th>
                                    <th className="p-4">Almacén</th>
                                    <th className="p-4 text-center">Stock Actual</th>
                                    <th className="p-4 w-20"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50 text-sm">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-12 text-center text-slate-500 animate-pulse">Cargando existencias...</td></tr>
                                ) : filteredInventory.length === 0 ? (
                                    <tr><td colSpan={4} className="p-12 text-center text-slate-500">No se encontraron productos.</td></tr>
                                ) : filteredInventory.map((item, idx) => (
                                    <tr key={idx} className={`hover:bg-slate-700/30 transition-colors ${selectedItem === item ? 'bg-emerald-500/10' : ''}`}>
                                        <td className="p-4">
                                            <div className="font-bold">{item.name}</div>
                                            <div className="text-xs font-mono text-emerald-500">{item.code}</div>
                                        </td>
                                        <td className="p-4 text-slate-400">{item.warehouse_name}</td>
                                        <td className="p-4 text-center font-bold text-lg">{item.current_stock}</td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => setSelectedItem(item)}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedItem === item ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-700 hover:bg-slate-600'}`}
                                            >
                                                {selectedItem === item ? 'Seleccionado' : 'Ajustar'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Adjustment Form */}
                <div className="space-y-6">
                    <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl sticky top-8">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="bg-emerald-500/20 text-emerald-400 p-2 rounded-lg text-base">⚖️</span>
                            Detalle del Ajuste
                        </h2>

                        {!selectedItem ? (
                            <div className="text-center py-12 space-y-4">
                                <div className="text-4xl">👆</div>
                                <p className="text-slate-500 text-sm leading-relaxed">Selecciona un producto de la lista para corregir su inventario.</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-700">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">Producto seleccionado</div>
                                    <div className="font-bold text-emerald-400">{selectedItem.name}</div>
                                    <div className="text-xs text-slate-500">{selectedItem.code} @ {selectedItem.warehouse_name}</div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Nuevo Stock Físico</label>
                                    <input
                                        type="number"
                                        placeholder="Ingresa la cantidad real..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-2xl font-black text-white outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-700"
                                        value={newQuantity}
                                        onChange={e => setNewQuantity(e.target.value)}
                                        autoFocus
                                    />
                                    <p className="text-[10px] text-slate-500 px-2 italic">Esto generará automáticamente un movimiento corrector.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Motivo / Notas</label>
                                    <textarea
                                        placeholder="Ej: Diferencia en conteo cíclico mensual..."
                                        rows={3}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        onClick={handleAdjust}
                                        disabled={isSubmitting || newQuantity === ""}
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-900/30 transition-all active:scale-95"
                                    >
                                        {isSubmitting ? 'Procesando...' : 'Aplicar Ajuste'}
                                    </button>
                                    <button
                                        onClick={() => setSelectedItem(null)}
                                        className="w-full mt-3 text-slate-500 hover:text-slate-300 text-sm font-bold py-2"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
