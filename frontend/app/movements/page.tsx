"use client";
import React, { useState, useEffect, useRef } from "react";
import { fetchWarehouses, fetchProducts, recordBulkMovements, fetchNextFolio } from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Link from "next/link";
import BarcodeScanner from "@/components/BarcodeScanner";

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
    const [entrySubType, setEntrySubType] = useState("PROVEEDOR");
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isVoucherMode, setIsVoucherMode] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<'PROAIR' | 'AIRPIPE'>('PROAIR');
    
    useEffect(() => {
        // Detect branding from context
        const context = localStorage.getItem("inventory-context") || "tuberia";
        setSelectedCompany(context === "refacciones" ? "PROAIR" : "AIRPIPE");
    }, []);
    const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, type: 'success' | 'error', message: string }>({ isOpen: false, type: 'success', message: '' });

    const closeModal = () => {
        setModalConfig({ ...modalConfig, isOpen: false });
        if (modalConfig.type === 'success') {
            setIsVoucherMode(true);
        }
    };
    const [folio, setFolio] = useState(`IN-${new Date().toISOString().slice(2, 4)}${new Date().toISOString().slice(5, 7)}${new Date().toISOString().slice(8, 10)}-01`);

    const [header, setHeader] = useState({
        client: "",
        requested_by: "",
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
                prefix = "IN";
            } else if (mType === "EXIT") {
                prefix = "OUT";
            } else if (mType === "TRANSFER") {
                const origin = getWHPrefix(header.origin_warehouse_id);
                const dest = getWHPrefix(header.destination_warehouse_id);
                prefix = `${origin}-${dest}`;
            }

            try {
                const result = await fetchNextFolio(prefix);
                setFolio(result.folio);
            } catch (error) {
                console.error("Error fetching next folio:", error);
                const now = new Date();
                const year = String(now.getFullYear()).slice(2);
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const dateStr = `${year}${month}${day}`;
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
    const [scanningIndex, setScanningIndex] = useState<number | null>(null);

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
            product_label: p.description || p.name,
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

    const handleScanSuccess = (decodedText: string) => {
        if (scanningIndex === null) return;
        
        // Find product by code (exact match)
        const product = products.find(p => 
            p.code.trim().toUpperCase() === decodedText.trim().toUpperCase()
        );

        if (product) {
            selectProduct(scanningIndex, product);
            setScanningIndex(null);
        } else {
            alert(`Producto con código "${decodedText}" no encontrado.`);
            setScanningIndex(null);
        }
    };

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
                reference_doc: folio,
                notes: `Solicitante: ${header.requested_by || "—"}. Tipo: ${mType === 'ENTRY' ? entrySubType : 'ALMACEN'}. ${header.notes || ""}`.trim()
            }));

            await recordBulkMovements(movements);
            setModalConfig({ isOpen: true, type: 'success', message: 'Vale registrado exitosamente' });
        } catch (error: any) {
            setModalConfig({ isOpen: true, type: 'error', message: error.message || "Error al procesar la solicitud" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const typeColors: Record<string, string> = {
        ENTRY: "bg-emerald-600 text-white shadow-lg",
        EXIT: "bg-blue-600 text-white shadow-lg",
        TRANSFER: "bg-amber-500 text-white shadow-lg"
    };

    const downloadPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Branding Config
        const isProAir = selectedCompany === 'PROAIR';
        const primaryColor = isProAir ? [0, 173, 239] : [0, 112, 184]; // ProAir Blue vs AIRpipe Blue
        const companyName = isProAir ? "Pro Air" : "AIRpipe";
        const logoPath = isProAir ? "/logos/proair_logo.png" : "/logos/airpipe_logo.png";

        // Add Logo
        try {
            // Note: In a real environment, we'd ensure the logo is pre-loaded or use base64
            // Since this runs in browser, jsPDF can try to load via URL if same-origin
            doc.addImage(logoPath, 'PNG', 15, 12, isProAir ? 25 : 35, isProAir ? 25 : 12);
        } catch (e) {
            console.warn("Logo could not be loaded for PDF", e);
            doc.setFontSize(22);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text(companyName, 15, 20);
        }

        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text("ALMACEN", 15, isProAir ? 42 : 28);

        // Folio & Date
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Folio: ${folio}`, pageWidth - 15, 20, { align: "right" });
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, pageWidth - 15, 25, { align: "right" });

        // Header Info
        doc.setDrawColor(220, 220, 220);
        doc.line(15, isProAir ? 45 : 30, pageWidth - 15, isProAir ? 45 : 30);

        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        doc.text("CLIENTE / PROYECTO:", 15, isProAir ? 55 : 40);
        doc.setFont("helvetica", "bold");
        doc.text(header.client || "—", 55, isProAir ? 55 : 40);

        doc.setFont("helvetica", "normal");
        doc.text("MOVIMIENTO:", 15, isProAir ? 60 : 45);
        doc.setFont("helvetica", "bold");
        doc.text(mType === 'ENTRY' ? `ENTRADA (${entrySubType})` : mType === 'EXIT' ? 'SALIDA' : 'TRASPASO', 55, isProAir ? 60 : 45);

        doc.setFont("helvetica", "normal");
        doc.text("SOLICITADO POR:", 15, isProAir ? 65 : 50);
        doc.setFont("helvetica", "bold");
        doc.text(header.requested_by || "—", 55, isProAir ? 65 : 50);

        doc.setFont("helvetica", "normal");
        doc.text("UBICACIÓN:", 15, isProAir ? 70 : 55);
        doc.setFont("helvetica", "bold");
        const location = mType === 'ENTRY' ? (warehouses.find(w => w.id == header.destination_warehouse_id)?.name) :
            mType === 'EXIT' ? (warehouses.find(w => w.id == header.origin_warehouse_id)?.name) :
                `${warehouses.find(w => w.id == header.origin_warehouse_id)?.name} -> ${warehouses.find(w => w.id == header.destination_warehouse_id)?.name}`;
        doc.text(location || "—", 55, isProAir ? 70 : 55);

        // Table
        const tableData = items.map(item => [
            item.product_code,
            item.quantity,
            item.unit,
            item.description
        ]);

        autoTable(doc, {
            startY: isProAir ? 85 : 65,
            head: [['Código', 'Cant.', 'Unid.', 'Descripción']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: primaryColor as [number, number, number] },
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
        const footerText = isProAir ? "Pro Air de México S.A. de C.V. — Hermosillo, Sonora" : "AIRpipe de México S.A. de C.V. — Hermosillo, Sonora";
        doc.text(footerText, pageWidth / 2, 285, { align: "center" });

        doc.save(`Vale_${folio}.pdf`);
    };

    const ModalComponent = () => {
        if (!modalConfig.isOpen) return null;
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
                    <button onClick={closeModal} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="flex items-center gap-2 mb-2">
                            {selectedCompany === 'PROAIR' ? (
                                <img src="/logos/proair_logo.png" alt="Pro Air" className="h-12 w-auto" />
                            ) : (
                                <span className="text-4xl font-black tracking-tighter text-[#0070B8]">AIR<span className="text-white font-medium">pipe</span></span>
                            )}
                        </div>
                        <div>
                            {modalConfig.type === 'success' ? (
                                <div className={`w-16 h-16 ${selectedCompany === 'PROAIR' ? 'bg-blue-500/10 text-blue-400 ring-blue-500/30' : 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30'} rounded-full flex items-center justify-center mx-auto mb-4 ring-1`}>
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                </div>
                            ) : (
                                <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-red-500/30">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </div>
                            )}
                            <h3 className="text-xl font-bold text-white mb-2">{modalConfig.type === 'success' ? 'Vale Registrado' : 'Error'}</h3>
                            <p className="text-slate-400 text-sm font-medium">{modalConfig.message}</p>
                        </div>
                        <button onClick={closeModal} className="mt-4 w-full py-3 rounded-xl font-bold transition-all bg-slate-800 hover:bg-slate-700 text-white border border-slate-700">
                            Aceptar
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (isVoucherMode) {
        return (
            <div className="max-w-4xl mx-auto py-10 px-4">
                <ModalComponent />
                <div className={`bg-white text-slate-900 p-6 sm:p-10 rounded-sm shadow-2xl border-t-8 ${selectedCompany === 'PROAIR' ? 'border-[#00ADEF]' : 'border-[#0070B8]'} font-sans print:m-0 print:p-8 overflow-x-auto`}>
                    {/* Header Vale */}
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
                        <div className="flex flex-col gap-2">
                            {selectedCompany === 'PROAIR' ? (
                                <img src="/logos/proair_logo.png" alt="Pro Air" className="h-14 w-auto object-contain" />
                            ) : (
                                <div className="text-3xl font-black tracking-tighter text-[#0070B8] mb-1">AIRpipe <span className="text-slate-400 font-light">ALMACEN</span></div>
                            )}
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Vale de Entrada y Salida</div>
                        </div>
                        <div className="text-left sm:text-right">
                            <div className="text-xs font-bold text-slate-400 uppercase">Folio</div>
                            <div className={`text-xl font-mono font-bold ${selectedCompany === 'PROAIR' ? 'text-[#00ADEF]' : 'text-[#0070B8]'}`}>{folio}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-1">{new Date().toLocaleDateString('es-MX')}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-8 text-sm">
                        <div className="space-y-3">
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Cliente / Proyecto</div>
                                <div className="font-semibold border-b border-slate-200 pb-1">{header.client || "—"}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Solicitado Por</div>
                                <div className="font-semibold border-b border-slate-200 pb-1">{header.requested_by || "—"}</div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Movimiento</div>
                                <div className="font-semibold border-b border-slate-200 pb-1">{mType === 'ENTRY' ? `ENTRADA (${entrySubType})` : mType === 'EXIT' ? 'SALIDA' : 'TRASPASO'}</div>
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
                    <div className="overflow-x-auto">
                        <table className="w-full mb-12 text-sm min-w-[500px]">
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
                                        <td className={`p-3 font-mono font-bold ${selectedCompany === 'PROAIR' ? 'text-blue-600' : 'text-[#0070B8]'}`}>{item.product_code}</td>
                                        <td className="p-3 font-bold text-center">{item.quantity}</td>
                                        <td className="p-3 text-slate-500 text-center">{item.unit}</td>
                                        <td className="p-3 text-slate-700">{item.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer / Signatures */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-16 mt-16 sm:mt-20">
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
                        <div className="text-xs text-slate-400 italic">{selectedCompany === 'PROAIR' ? 'Pro Air' : 'AIRpipe'} de México S.A. de C.V. — Hermosillo, Sonora</div>
                    </div>
                </div>

                <div className="mt-8 flex flex-wrap justify-center gap-3 sm:gap-4 no-print">
                    <button onClick={downloadPDF} className={`flex-grow sm:flex-none ${selectedCompany === 'PROAIR' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-[#0070B8] hover:bg-blue-600'} text-white px-8 py-3 rounded-xl font-bold transition-all shadow-xl flex items-center justify-center gap-2`}>
                        <span>📄</span> Descargar PDF
                    </button>
                    <button onClick={() => window.print()} className="flex-grow sm:flex-none bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-xl">Imprimir</button>
                    <button onClick={() => window.location.reload()} className={`flex-grow sm:flex-none ${selectedCompany === 'PROAIR' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'} px-8 py-3 rounded-xl font-bold transition-all shadow-xl border`}>Nuevo Registro</button>
                    <Link href="/" className="flex-grow sm:flex-none bg-red-900/10 hover:bg-red-900/20 text-red-500 border border-red-900/30 px-8 py-3 rounded-xl font-bold transition-all shadow-xl text-center">Salir</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 p-4">
            <ModalComponent />
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Carga de Vale</h1>
                    <p className="text-white opacity-60 text-sm sm:text-base">Digitalización de movimientos de almacén.</p>
                </div>
                <div className="text-left sm:text-right bg-slate-800/50 p-3 rounded-2xl border border-slate-700 w-full sm:w-auto flex flex-col items-center sm:items-end gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Folio sugerido</span>
                    <div className={`text-xl font-mono font-bold ${selectedCompany === 'PROAIR' ? 'text-blue-400' : 'text-[#0070B8]'}`}>{folio}</div>
                </div>
            </header>

            <div className="bg-slate-800/40 border border-slate-700 rounded-3xl backdrop-blur-md shadow-2xl relative">
                {/* Header Section */}
                <div className="p-4 sm:p-8 border-b border-slate-700 bg-slate-800/20">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Type selector */}
                            <div className="flex flex-wrap gap-2 p-1 bg-slate-950 rounded-2xl w-full sm:w-fit">
                                {[
                                    { key: "ENTRY", label: "Entrada" },
                                    { key: "EXIT", label: "Salida" },
                                    { key: "TRANSFER", label: "Traspaso" }
                                ].map((t) => (
                                    <button
                                        key={t.key}
                                        onClick={() => setMType(t.key)}
                                        className={`flex-grow sm:flex-none px-6 py-2 rounded-xl text-sm font-black transition-all border-2 ${mType === t.key ? typeColors[t.key] + " border-transparent" : "border-slate-800 text-white/30 hover:text-white"}`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Entry Sub-Type Selector */}
                            {mType === "ENTRY" && (
                                <div className="flex flex-wrap gap-2 p-1 bg-slate-950 rounded-2xl w-full sm:w-fit animate-in slide-in-from-top-2">
                                    {[
                                        { key: "PROVEEDOR", label: "Proveedor" },
                                        { key: "COMPRA", label: "Compra" },
                                        { key: "DEVOLUCION", label: "Devolución" }
                                    ].map((st) => (
                                        <button
                                            key={st.key}
                                            onClick={() => setEntrySubType(st.key)}
                                            className={`flex-grow sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border-2 ${entrySubType === st.key ? "bg-emerald-600 border-transparent text-white shadow-lg" : "border-slate-800 text-white/20 hover:text-white"}`}
                                        >
                                            {st.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Cliente / Proyecto</label>
                                    <input type="text" placeholder="Ej: Brady Mexico" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500" value={header.client} onChange={e => setHeader({ ...header, client: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Solicitado por</label>
                                    <input type="text" placeholder="Ej: Ing. Juan Perez" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500" value={header.requested_by} onChange={e => setHeader({ ...header, requested_by: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Almacén Origen</label>
                                <select disabled={mType === "ENTRY"} value={header.origin_warehouse_id} onChange={e => setHeader({ ...header, origin_warehouse_id: e.target.value })}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-30">
                                    <option value="">{mType === 'ENTRY' ? 'EXTERNO' : 'Seleccionar...'}</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Almacén Destino</label>
                                <select disabled={mType === "EXIT"} value={header.destination_warehouse_id} onChange={e => setHeader({ ...header, destination_warehouse_id: e.target.value })}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-30">
                                    <option value="">{mType === 'EXIT' ? 'CONSUMO' : 'Seleccionar...'}</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="p-4 sm:p-8">
                    <div className="lg:overflow-visible overflow-x-auto no-scrollbar -mx-4 sm:mx-0">
                        <table className="w-full text-left min-w-[700px]">
                            <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-700/50">
                                <tr>
                                    <th className="pb-4 px-4 w-[35%]">Producto / Código</th>
                                    <th className="pb-4 w-28 text-center">Cant.</th>
                                    <th className="pb-4 w-24 text-center">Unidad</th>
                                    <th className="pb-4 px-4">Descripción</th>
                                    <th className="pb-4 w-12 text-center"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/30">
                                {items.map((item, idx) => (
                                    <tr key={idx} className="group hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-4 relative">
                                            {item.product_id ? (
                                                <div className="flex items-center gap-3 bg-slate-900 border border-emerald-500/30 rounded-xl px-3 py-2">
                                                    <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-mono text-xs font-bold">{item.product_code}</span>
                                                    <span className="text-sm font-medium truncate flex-grow">{item.product_label}</span>
                                                    <button onClick={() => updateItem(idx, 'product_id', null)} className="text-slate-500 hover:text-red-400">✕</button>
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder="Escribe código o nombre..."
                                                        className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500 transition-all font-medium"
                                                        value={searchIndex === idx ? searchQuery : ""}
                                                        onFocus={() => { setSearchIndex(idx); setSearchQuery(""); }}
                                                        onChange={e => setSearchQuery(e.target.value)}
                                                    />
                                                    <button 
                                                        onClick={() => setScanningIndex(idx)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-400 transition-colors p-1"
                                                        title="Escanear Código"
                                                    >
                                                        📸
                                                    </button>
                                                    {searchIndex === idx && searchQuery.length > 0 && (
                                                        <div className="absolute z-[100] left-0 right-0 mt-2 bg-slate-800 border-2 border-slate-600 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-h-[min(500px,70vh)] overflow-auto animate-in fade-in zoom-in-95 duration-200">
                                                            {filteredProducts.slice(0, 15).map(p => (
                                                                <button key={p.id} onClick={() => selectProduct(idx, p)} className="w-full text-left px-4 py-3 hover:bg-emerald-500 hover:text-slate-900 transition-colors border-b border-slate-700 last:border-0 flex justify-between items-center">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-mono text-xs opacity-60 group-hover:text-current">{p.code}</span>
                                                                        <span className="font-bold text-sm">{p.description || p.name}</span>
                                                                    </div>
                                                                    <span className="text-[10px] font-black uppercase opacity-40">{p.unit_of_measure}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4 px-2">
                                            <input type="number" inputMode="numeric" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-center text-lg font-black outline-none focus:ring-2 focus:ring-emerald-500 transition-all" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} placeholder="0" />
                                        </td>
                                        <td className="py-4 text-center">
                                            <span className="text-xs text-slate-400 font-black uppercase tracking-widest">{item.unit || "N/A"}</span>
                                        </td>
                                        <td className="py-4 px-4 max-w-xs">
                                            <div className="text-[10px] text-slate-500 italic truncate">{item.description || "Pendiente de selección..."}</div>
                                        </td>
                                        <td className="py-4 text-center">
                                            <button onClick={() => removeItem(idx)} className="text-slate-700 hover:text-red-500 transition-colors p-2">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="px-4 sm:px-8 pb-8">
                    <button onClick={addItem} className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-black text-xs uppercase tracking-widest transition-all group">
                        <span className="bg-emerald-500/10 w-8 h-8 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/20 transition-all border border-emerald-500/20">+</span>
                        Añadir Producto
                    </button>
                </div>

                {/* Footer Section Entries */}
                <div className="p-4 sm:p-8 bg-slate-950/40 border-t border-slate-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Entregó / Delivery</label>
                            <input type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-4 text-white text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500" value={header.delivery_person} onChange={e => setHeader({ ...header, delivery_person: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Recibió / Receiver</label>
                            <input type="text" placeholder="Nombre de quien recibe" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-4 text-white text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500" value={header.receiver_person} onChange={e => setHeader({ ...header, receiver_person: e.target.value })} />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50 ${mType === 'ENTRY' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' : mType === 'EXIT' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' : 'bg-orange-500 hover:bg-orange-400 shadow-orange-500/20'}`}>
                                {isSubmitting ? "Procesando..." : "Registrar Movimiento"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            {scanningIndex !== null && (
                <BarcodeScanner 
                    onScanSuccess={handleScanSuccess} 
                    onClose={() => setScanningIndex(null)} 
                />
            )}
        </div>
    );
}
