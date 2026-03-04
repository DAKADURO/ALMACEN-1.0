"use client";
import React, { useState, useEffect, useRef } from "react";
import { fetchWarehouses, fetchProducts, recordBulkMovements, fetchNextFolio } from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type MovementItem = {
    product_id: number | null;
    product_label: string;
    product_code: string;
    unit: string;
    description: string;
    quantity: string;
};

export default function MovementsPage() {
    const [mType, setMType] = useState("ENTRY");
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isVoucherMode, setIsVoucherMode] = useState(false);
    const [folio, setFolio] = useState(`TJ-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-01`);

    const [header, setHeader] = useState({
        client: "",
        reference_doc: "",
        notes: "",
        origin_warehouse_id: "",
        destination_warehouse_id: "",
        delivery_person: "MIGUEL LOMELI",
        receiver_person: ""
    });

    const ALMACEN_PREFIXES: Record<string, string> = {
        "TIJUANA": "TJ",
        "HERMOSILLO": "HE",
        "QUERETARO": "QU"
    };

    const getWHPrefix = (id: string) => {
        const wh = warehouses.find(w => w.id == id);
        if (!wh) return "??";
        return ALMACEN_PREFIXES[wh.name.toUpperCase()] || wh.name.slice(0, 2).toUpperCase();
    };

    useEffect(() => {
        const updateFolio = async () => {
            let prefix = "AL";

            if (mType === "ENTRY") {
                prefix = getWHPrefix(header.destination_warehouse_id);
            } else if (mType === "EXIT") {
                prefix = getWHPrefix(header.origin_warehouse_id);
            } else if (mType === "TRANSFER") {
                const origin = getWHPrefix(header.origin_warehouse_id);
                const dest = getWHPrefix(header.destination_warehouse_id);
                prefix = `${origin}>${dest}`;
            }

            try {
                const result = await fetchNextFolio(prefix);
                setFolio(result.folio);
            } catch (error) {
                console.error("Error fetching next folio:", error);
                const now = new Date();
                const day = String(now.getDate()).padStart(2, '0');
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const year = String(now.getFullYear()).slice(2);
                const dateStr = `${day}${month}${year}`;
                setFolio(`${prefix}-${dateStr}-01`);
            }
        };

        updateFolio();
    }, [mType, header.origin_warehouse_id, header.destination_warehouse_id, warehouses]);

    const [items, setItems] = useState<MovementItem[]>([
        { product_id: null, product_label: "", product_code: "", unit: "", description: "", quantity: "" }
    ]);

    const [searchIndex, setSearchIndex] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchWarehouses().then(setWarehouses).catch(console.error);
        fetchProducts().then(setProducts).catch(console.error);
    }, []);

    const addItem = () => {
        setItems([...items, { product_id: null, product_label: "", product_code: "", unit: "", description: "", quantity: "" }]);
    };

    const removeItem = (index: number) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof MovementItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const selectProduct = (index: number, p: any) => {
        const newItems = [...items];
        newItems[index] = {
            ...newItems[index],
            product_id: p.id,
            product_label: p.name,
            product_code: p.code,
            unit: p.unit_of_measure,
            description: p.description || p.name
        };
        setItems(newItems);
        setSearchIndex(null);
        setSearchQuery("");
    };

    const filteredProducts = products.filter(
        (p: any) =>
            p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubmit = async () => {
        const validItems = items.filter(i => i.product_id && parseInt(i.quantity) > 0);
        if (validItems.length === 0) {
            alert("Agrega al menos un producto con cantidad válida");
            return;
        }

        if (mType === "ENTRY" && !header.destination_warehouse_id) return alert("Selecciona almacén de destino");
        if (mType === "EXIT" && !header.origin_warehouse_id) return alert("Selecciona almacén de origen");
        if (mType === "TRANSFER" && (!header.origin_warehouse_id || !header.destination_warehouse_id)) return alert("Selecciona origen y destino");

        setIsSubmitting(true);
        try {
            const movements = validItems.map(item => ({
                product_id: item.product_id,
                origin_warehouse_id: header.origin_warehouse_id ? parseInt(header.origin_warehouse_id) : null,
                destination_warehouse_id: header.destination_warehouse_id ? parseInt(header.destination_warehouse_id) : null,
                quantity: parseInt(item.quantity),
                movement_type: mType,
                reference_doc: header.reference_doc || folio,
                notes: `Vale: ${folio}. ${header.notes || ""}`.trim()
            }));

            await recordBulkMovements(movements);
            alert("✅ Vale registrado exitosamente");
            setIsVoucherMode(true);
        } catch (error: any) {
            alert("❌ Error: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const typeColors: Record<string, string> = {
        ENTRY: "bg-emerald-600 text-white shadow-lg shadow-emerald-900/30",
        EXIT: "bg-blue-600 text-white shadow-lg shadow-blue-900/30",
        TRANSFER: "bg-amber-500 text-white shadow-lg shadow-amber-900/30"
    };

    const downloadPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Logo / Title
        doc.setFontSize(22);
        doc.setTextColor(5, 150, 105); // emerald-600
        doc.text("AIRpipe", 15, 20);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text("ALMACEN", 15, 25);

        // Folio & Date
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Folio: ${folio}`, pageWidth - 15, 20, { align: "right" });
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, pageWidth - 15, 25, { align: "right" });

        // Header Info
        doc.setDrawColor(220, 220, 220);
        doc.line(15, 30, pageWidth - 15, 30);

        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        doc.text("CLIENTE / PROYECTO:", 15, 40);
        doc.setFont("helvetica", "bold");
        doc.text(header.client || "—", 55, 40);

        doc.setFont("helvetica", "normal");
        doc.text("MOVIMIENTO:", 15, 45);
        doc.setFont("helvetica", "bold");
        doc.text(mType === 'ENTRY' ? 'ENTRADA' : mType === 'EXIT' ? 'SALIDA' : 'TRASPASO', 55, 45);

        doc.setFont("helvetica", "normal");
        doc.text("SOLICITADO POR:", 15, 50);
        doc.setFont("helvetica", "bold");
        doc.text(header.reference_doc || "—", 55, 50);

        doc.setFont("helvetica", "normal");
        doc.text("UBICACIÓN:", 15, 55);
        doc.setFont("helvetica", "bold");
        const location = mType === 'ENTRY' ? (warehouses.find(w => w.id == header.destination_warehouse_id)?.name) :
            mType === 'EXIT' ? (warehouses.find(w => w.id == header.origin_warehouse_id)?.name) :
                `${warehouses.find(w => w.id == header.origin_warehouse_id)?.name} -> ${warehouses.find(w => w.id == header.destination_warehouse_id)?.name}`;
        doc.text(location || "—", 55, 55);

        // Table
        const tableData = items.map(item => [
            item.product_code,
            item.quantity,
            item.unit,
            item.description
        ]);

        autoTable(doc, {
            startY: 65,
            head: [['Código', 'Cant.', 'Unid.', 'Descripción']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [5, 150, 105] }, // emerald-600
            styles: { fontSize: 8 },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 30;

        // Signatures
        doc.line(20, finalY, 80, finalY);
        doc.text("ENTREGÓ / DELIVERY", 50, finalY + 5, { align: "center" });
        doc.setFontSize(7);
        doc.text(header.delivery_person, 50, finalY + 10, { align: "center" });

        doc.setFontSize(9);
        doc.line(130, finalY, 190, finalY);
        doc.text("RECIBIÓ / RECEIVE", 160, finalY + 5, { align: "center" });
        doc.setFontSize(7);
        doc.text(header.receiver_person || "Firma de conformidad", 160, finalY + 10, { align: "center" });

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("AIRpipe de México S.A. de C.V. — Hermosillo, Sonora", pageWidth / 2, 285, { align: "center" });

        doc.save(`Vale_${folio}.pdf`);
    };

    if (isVoucherMode) {
        return (
            <div className="max-w-4xl mx-auto py-10">
                <div className="bg-white text-slate-900 p-10 rounded-sm shadow-2xl border-t-8 border-emerald-600 font-sans print:m-0 print:p-8">
                    {/* Header Vale */}
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <div className="text-3xl font-black tracking-tighter text-emerald-600 mb-1">AIRpipe <span className="text-slate-400 font-light">ALMACEN</span></div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Vale de Entrada y Salida</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-bold text-slate-400 uppercase">Folio</div>
                            <div className="text-xl font-mono font-bold text-emerald-600">{folio}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-1">{new Date().toLocaleDateString('es-MX')}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
                        <div className="space-y-3">
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Cliente / Proyecto</div>
                                <div className="font-semibold border-b border-slate-200 pb-1">{header.client || "—"}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Solicitado Por</div>
                                <div className="font-semibold border-b border-slate-200 pb-1">{header.reference_doc || "—"}</div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Movimiento</div>
                                <div className="font-semibold border-b border-slate-200 pb-1">{mType === 'ENTRY' ? 'ENTRADA' : mType === 'EXIT' ? 'SALIDA' : 'TRASPASO'}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Ubicación</div>
                                <div className="font-semibold border-b border-slate-200 pb-1">
                                    {mType === 'ENTRY' ? (warehouses.find(w => w.id == header.destination_warehouse_id)?.name) :
                                        mType === 'EXIT' ? (warehouses.find(w => w.id == header.origin_warehouse_id)?.name) :
                                            `${warehouses.find(w => w.id == header.origin_warehouse_id)?.name} ➔ ${warehouses.find(w => w.id == header.destination_warehouse_id)?.name}`}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table Items */}
                    <table className="w-full mb-12 text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                                <th className="p-3 text-left w-24">Item</th>
                                <th className="p-3 text-left w-20 text-center">Cant.</th>
                                <th className="p-3 text-left w-16 text-center">Unid.</th>
                                <th className="p-3 text-left">Descripción / Especificación</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item, i) => (
                                <tr key={i}>
                                    <td className="p-3 font-mono font-bold text-emerald-600">{item.product_code}</td>
                                    <td className="p-3 font-bold text-center">{item.quantity}</td>
                                    <td className="p-3 text-slate-500 text-center">{item.unit}</td>
                                    <td className="p-3 text-slate-700">{item.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Footer / Signatures */}
                    <div className="grid grid-cols-2 gap-16 mt-20">
                        <div className="text-center pt-4 border-t border-slate-300">
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Entregó</div>
                            <div className="font-bold text-sm tracking-tight">{header.delivery_person}</div>
                        </div>
                        <div className="text-center pt-4 border-t border-slate-300">
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Recibió</div>
                            <div className="font-bold text-sm tracking-tight">{header.receiver_person || "Firma de conformidad"}</div>
                        </div>
                    </div>

                    <div className="mt-12 text-center">
                        <div className="text-xs text-slate-400 italic">AIRpipe de México S.A. de C.V. — Hermosillo, Sonora</div>
                    </div>
                </div>

                <div className="mt-8 flex justify-center gap-4 no-print">
                    <button onClick={downloadPDF} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-xl flex items-center gap-2">
                        <span>📄</span> Descargar PDF
                    </button>
                    <button onClick={() => window.print()} className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-xl">Imprimir</button>
                    <button onClick={() => window.location.reload()} className="bg-slate-500 hover:bg-slate-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-xl">Nuevo Registro</button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold">Carga de Vale</h1>
                    <p className="text-slate-400">Digitalización de entradas y salidas de almacén.</p>
                </div>
                <div className="text-right">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Folio sugerido</span>
                    <div className="text-xl font-mono font-bold text-emerald-500">{folio}</div>
                </div>
            </header>

            <div className="bg-slate-800/40 border border-slate-700 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl">
                {/* Header Section */}
                <div className="p-8 border-b border-slate-700 bg-slate-800/20">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Type selector */}
                            <div className="flex gap-2 p-1.5 bg-slate-900 rounded-2xl w-fit">
                                {[
                                    { key: "ENTRY", label: "Entrada" },
                                    { key: "EXIT", label: "Salida" },
                                    { key: "TRANSFER", label: "Traspaso" }
                                ].map((t) => (
                                    <button
                                        key={t.key}
                                        onClick={() => setMType(t.key)}
                                        className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${mType === t.key ? typeColors[t.key] : "text-slate-500 hover:text-slate-200"}`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Cliente / Proyecto</label>
                                    <input type="text" placeholder="Ej: Brady Mexico" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500" value={header.client} onChange={e => setHeader({ ...header, client: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Solicitado por</label>
                                    <input type="text" placeholder="Ej: Ing. Juan Perez" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500" value={header.reference_doc} onChange={e => setHeader({ ...header, reference_doc: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 grid grid-cols-2 gap-4 h-fit">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Almacén Origen</label>
                                <select disabled={mType === "ENTRY"} value={header.origin_warehouse_id} onChange={e => setHeader({ ...header, origin_warehouse_id: e.target.value })}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-30">
                                    <option value="">{mType === 'ENTRY' ? 'EXTERNO' : 'Seleccionar...'}</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Almacén Destino</label>
                                <select disabled={mType === "EXIT"} value={header.destination_warehouse_id} onChange={e => setHeader({ ...header, destination_warehouse_id: e.target.value })}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-30">
                                    <option value="">{mType === 'EXIT' ? 'CONSUMO' : 'Seleccionar...'}</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="p-8">
                    <table className="w-full text-left">
                        <thead className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            <tr>
                                <th className="pb-4 pl-2 w-[35%]">Producto / Código</th>
                                <th className="pb-4 w-24 text-center">Cant.</th>
                                <th className="pb-4 w-24 text-center">Unidad</th>
                                <th className="pb-4">Descripción</th>
                                <th className="pb-4 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="space-y-2">
                            {items.map((item, idx) => (
                                <tr key={idx} className="group border-b border-slate-700/50 last:border-0 hover:bg-slate-700/10 transition-colors">
                                    <td className="py-4 relative">
                                        {item.product_id ? (
                                            <div className="flex items-center gap-3 bg-slate-900 border border-emerald-500/30 rounded-xl px-3 py-2">
                                                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-mono text-xs font-bold">{item.product_code}</span>
                                                <span className="text-sm font-medium truncate flex-grow">{item.product_label}</span>
                                                <button onClick={() => updateItem(idx, 'product_id', null)} className="text-slate-500 hover:text-red-400">✕</button>
                                            </div>
                                        ) : (
                                            <>
                                                <input
                                                    type="text"
                                                    placeholder="Escribe código o nombre..."
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500"
                                                    value={searchIndex === idx ? searchQuery : ""}
                                                    onFocus={() => { setSearchIndex(idx); setSearchQuery(""); }}
                                                    onChange={e => setSearchQuery(e.target.value)}
                                                />
                                                {searchIndex === idx && searchQuery.length > 0 && (
                                                    <div className="absolute z-20 left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-auto">
                                                        {filteredProducts.slice(0, 10).map(p => (
                                                            <button key={p.id} onClick={() => selectProduct(idx, p)} className="w-full text-left px-4 py-2 hover:bg-slate-700 text-sm border-b border-slate-700/50 flex justify-between">
                                                                <span className="font-mono text-emerald-400">{p.code}</span>
                                                                <span className="truncate ml-2">{p.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </td>
                                    <td className="py-4 px-2">
                                        <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} placeholder="0" />
                                    </td>
                                    <td className="py-4 text-center">
                                        <span className="text-xs text-slate-400 font-bold">{item.unit || "—"}</span>
                                    </td>
                                    <td className="py-4 pl-4 truncate max-w-xs text-xs text-slate-500 italic">
                                        {item.description || "Selecciona producto..."}
                                    </td>
                                    <td className="py-4 text-right">
                                        <button onClick={() => removeItem(idx)} className="text-slate-600 hover:text-red-500 transition-colors p-2">✕</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <button onClick={addItem} className="mt-6 flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold text-sm transition-all group">
                        <span className="bg-emerald-500/20 w-6 h-6 rounded-full flex items-center justify-center group-hover:bg-emerald-500/30">+</span>
                        Agregar Producto
                    </button>
                </div>

                {/* Footer Section Entries */}
                <div className="p-8 bg-slate-900/30 border-t border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Entregó</label>
                            <input type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500" value={header.delivery_person} onChange={e => setHeader({ ...header, delivery_person: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Recibió</label>
                            <input type="text" placeholder="Firma / Nombre de quien recibe" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500" value={header.receiver_person} onChange={e => setHeader({ ...header, receiver_person: e.target.value })} />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className={`w-full py-4 rounded-2xl font-black text-xl shadow-2xl transition-all active:scale-95 disabled:opacity-50 ${mType === 'ENTRY' ? 'bg-emerald-600 hover:bg-emerald-500' : mType === 'EXIT' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-amber-500 hover:bg-amber-400'}`}>
                                {isSubmitting ? "Procesando..." : "Registrar Vale"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
