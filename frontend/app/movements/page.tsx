"use client";
import React, { useState, useEffect, useRef } from "react";
import { fetchWarehouses, fetchProducts, recordBulkMovements, fetchNextFolio, fetchProjects, createProject, fetchProjectRequesters, createProjectRequester } from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Link from "next/link";
import BarcodeScanner from "@/components/BarcodeScanner";
import { generateVoucherPDF } from "@/lib/pdf-utils";
import { useNotification } from "@/context/NotificationContext";

type MovementItem = {
    product_id: number | null;
    product_label: string;
    product_code: string;
    unit: string;
    description: string;
    quantity: string;
};

export default function MovementsPage() {
    const { showNotification } = useNotification();
    const [mType, setMType] = useState("ENTRY");
    const [entrySubType, setEntrySubType] = useState("PROVEEDOR");
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isVoucherMode, setIsVoucherMode] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<'PROAIR' | 'AIRPIPE'>('PROAIR');
    const [projects, setProjects] = useState<any[]>([]);
    const [projectSearch, setProjectSearch] = useState("");
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    
    const [projectRequesters, setProjectRequesters] = useState<any[]>([]);
    const [requesterSearch, setRequesterSearch] = useState("");
    const [isRequesterDropdownOpen, setIsRequesterDropdownOpen] = useState(false);
    
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
        "TIJUANA": "TIJ",
        "HERMOSILLO": "HMO",
        "QUERETARO": "QRO"
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
                const dest = getWHPrefix(header.destination_warehouse_id);
                prefix = `${dest}-IN`;
            } else if (mType === "EXIT") {
                const origin = getWHPrefix(header.origin_warehouse_id);
                prefix = `${origin}-OUT`;
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
        fetchProjects().then(setProjects).catch(console.error);
    }, []);

    // Load requesters when project changes
    useEffect(() => {
        if (!header.client) {
            setProjectRequesters([]);
            return;
        }
        const project = projects.find(p => p.name === header.client);
        if (project) {
            fetchProjectRequesters(project.id).then(setProjectRequesters).catch(console.error);
        } else {
            setProjectRequesters([]);
        }
    }, [header.client, projects]);

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
            showNotification(`Producto con código "${decodedText}" no encontrado.`, "error");
            setScanningIndex(null);
        }
    };

    const handleSubmit = async () => {
        const validItems = items.filter(i => i.product_id && parseInt(i.quantity) > 0);
        if (validItems.length === 0) {
            showNotification("Agrega al menos un producto con cantidad válida", "warning");
            return;
        }

        if (mType === "ENTRY" && !header.destination_warehouse_id) {
            showNotification("Selecciona almacén de destino", "warning");
            return;
        }
        if (mType === "EXIT" && !header.origin_warehouse_id) {
            showNotification("Selecciona almacén de origen", "warning");
            return;
        }
        if (mType === "TRANSFER" && (!header.origin_warehouse_id || !header.destination_warehouse_id)) {
            showNotification("Selecciona origen y destino", "warning");
            return;
        }

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

    const handleAddProject = async (name: string) => {
        if (!name.trim()) return;
        try {
            const p = await createProject(name.trim());
            setProjects([...projects, p]);
            setHeader({ ...header, client: p.name });
            setProjectSearch("");
            setIsProjectDropdownOpen(false);
            showNotification(`Proyecto "${p.name}" registrado`, "success");
        } catch (error: any) {
            showNotification("Error: " + error.message, "error");
        }
    };

    const handleAddProjectRequester = async (name: string) => {
        if (!name.trim()) return;
        const project = projects.find(p => p.name === header.client);
        if (!project) {
            showNotification("Selecciona un proyecto primero", "warning");
            return;
        }
        try {
            const req = await createProjectRequester(project.id, name.trim());
            setProjectRequesters([...projectRequesters, req]);
            setHeader({ ...header, requested_by: req.name });
            setRequesterSearch("");
            setIsRequesterDropdownOpen(false);
            showNotification(`Solicitante "${req.name}" registrado para el proyecto`, "success");
        } catch (error: any) {
            showNotification("Error: " + error.message, "error");
        }
    };

    const typeColors: Record<string, string> = {
        ENTRY: "bg-emerald-600 text-white shadow-lg",
        EXIT: "bg-blue-600 text-white shadow-lg",
        TRANSFER: "bg-amber-500 text-white shadow-lg"
    };

    const downloadPDF = async () => {
        await generateVoucherPDF({
            folio,
            mType,
            entrySubType,
            header: {
                ...header,
                date: new Date().toLocaleDateString('es-MX')
            },
            items,
            selectedCompany,
            warehouses
        });
    };

    const ModalComponent = () => {
        if (!modalConfig.isOpen) return null;
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                <div className="bg-[#131722] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
                    <button onClick={closeModal} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
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
                            <p className="text-white/70 text-sm font-medium">{modalConfig.message}</p>
                        </div>
                        <button onClick={closeModal} className="mt-4 w-full py-3 rounded-xl font-bold transition-all bg-[#1F2433] hover:bg-white/10 text-white border border-white/10">
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
                    <button onClick={() => window.print()} className="flex-grow sm:flex-none bg-[#1F2433] hover:bg-white/10 border border-white/5 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-xl">Imprimir</button>
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
                    <h1 className="text-2xl sm:text-3xl font-bold text-yellow-400">Carga de Vale</h1>
                    <p className="text-white/80 mt-1 text-sm sm:text-base">Digitalización de movimientos de almacén.</p>
                </div>
                <div className="text-left sm:text-right bg-[#131722]/80 p-3 rounded-2xl border border-white/10 w-full sm:w-auto flex flex-col items-center sm:items-end gap-1">
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Folio sugerido</span>
                    <div className={`text-xl font-mono font-bold ${selectedCompany === 'PROAIR' ? 'text-blue-400' : 'text-[#0070B8]'}`}>{folio}</div>
                </div>
            </header>

            <div className="bg-[#131722]/60 border border-white/10 rounded-3xl backdrop-blur-md shadow-2xl relative">
                {/* Header Section */}
                <div className="p-4 sm:p-8 border-b border-white/10 bg-[#131722]/40 rounded-t-3xl">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Type selector */}
                            <div className="flex flex-wrap gap-2 p-1 bg-black/50 rounded-2xl w-full sm:w-fit">
                                {[
                                    { key: "ENTRY", label: "Entrada" },
                                    { key: "EXIT", label: "Salida" },
                                    { key: "TRANSFER", label: "Traspaso" }
                                ].map((t) => (
                                    <button
                                        key={t.key}
                                        onClick={() => setMType(t.key)}
                                        className={`flex-grow sm:flex-none px-6 py-2 rounded-xl text-sm font-black transition-all border-2 ${mType === t.key ? typeColors[t.key] + " border-transparent" : "border-white/10 text-white/50 hover:text-white"}`}
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
                                {mType !== 'TRANSFER' && (
                                    <div className="space-y-1 relative">
                                        <label className="text-[10px] font-bold text-white/60 uppercase ml-2">Cliente / Proyecto</label>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                placeholder="Buscar o agregar proyecto..." 
                                                className="w-full bg-[#131722] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500" 
                                                value={isProjectDropdownOpen ? projectSearch : header.client} 
                                                onFocus={() => {
                                                    setIsProjectDropdownOpen(true);
                                                    setProjectSearch(header.client);
                                                }}
                                                onChange={e => setProjectSearch(e.target.value)} 
                                            />
                                            {isProjectDropdownOpen && (
                                                <div className="absolute z-50 left-0 right-0 mt-1 bg-[#1F2433] border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-auto animate-in fade-in slide-in-from-top-1 duration-200">
                                                    {projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())).map((p) => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            className="w-full text-left px-4 py-3 hover:bg-emerald-500 hover:text-[#0B0E14] text-sm text-white/80 transition-colors border-b border-white/5 last:border-0"
                                                            onClick={() => {
                                                                setHeader({ ...header, client: p.name });
                                                                setIsProjectDropdownOpen(false);
                                                                setProjectSearch("");
                                                            }}
                                                        >
                                                            {p.name}
                                                        </button>
                                                    ))}
                                                    {projectSearch.trim() && !projects.find(p => p.name.toLowerCase() === projectSearch.toLowerCase()) && (
                                                        <button
                                                            type="button"
                                                            className="w-full text-left px-4 py-4 bg-emerald-500/10 text-emerald-400 text-sm font-bold hover:bg-emerald-500/20 transition-colors"
                                                            onClick={() => handleAddProject(projectSearch)}
                                                        >
                                                            + Agregar &quot;{projectSearch}&quot;
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {isProjectDropdownOpen && (
                                            <div className="fixed inset-0 z-40" onClick={() => setIsProjectDropdownOpen(false)} />
                                        )}
                                    </div>
                                )}
                                <div className="space-y-1 relative">
                                    <label className="text-[10px] font-bold text-white/60 uppercase ml-2">Solicitado por</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder={header.client ? "Buscar o agregar solicitante..." : "Selecciona cliente primero"}
                                            disabled={!header.client}
                                            className="w-full bg-[#131722] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50" 
                                            value={isRequesterDropdownOpen ? requesterSearch : header.requested_by} 
                                            onFocus={() => {
                                                if(header.client) {
                                                    setIsRequesterDropdownOpen(true);
                                                    setRequesterSearch(header.requested_by);
                                                }
                                            }}
                                            onChange={e => setRequesterSearch(e.target.value)} 
                                        />
                                        {isRequesterDropdownOpen && header.client && (
                                            <div className="absolute z-50 left-0 right-0 mt-1 bg-[#1F2433] border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-auto animate-in fade-in slide-in-from-top-1 duration-200">
                                                {projectRequesters.filter(r => r.name.toLowerCase().includes(requesterSearch.toLowerCase())).map((r) => (
                                                    <button
                                                        key={r.id}
                                                        type="button"
                                                        className="w-full text-left px-4 py-3 hover:bg-emerald-500 hover:text-[#0B0E14] text-sm text-white/80 transition-colors border-b border-white/5 last:border-0"
                                                        onClick={() => {
                                                            setHeader({ ...header, requested_by: r.name });
                                                            setIsRequesterDropdownOpen(false);
                                                            setRequesterSearch("");
                                                        }}
                                                    >
                                                        {r.name}
                                                    </button>
                                                ))}
                                                {requesterSearch.trim() && !projectRequesters.find(r => r.name.toLowerCase() === requesterSearch.toLowerCase()) && (
                                                    <button
                                                        type="button"
                                                        className="w-full text-left px-4 py-4 bg-emerald-500/10 text-emerald-400 text-sm font-bold hover:bg-emerald-500/20 transition-colors"
                                                        onClick={() => handleAddProjectRequester(requesterSearch)}
                                                    >
                                                        + Agregar &quot;{requesterSearch}&quot;
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {isRequesterDropdownOpen && (
                                        <div className="fixed inset-0 z-40" onClick={() => setIsRequesterDropdownOpen(false)} />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-white/60 uppercase ml-2">Almacén Origen</label>
                                <select disabled={mType === "ENTRY"} value={header.origin_warehouse_id} onChange={e => setHeader({ ...header, origin_warehouse_id: e.target.value })}
                                    className="w-full bg-[#131722] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-30">
                                    <option value="">{mType === 'ENTRY' ? 'EXTERNO' : 'Seleccionar...'}</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-white/60 uppercase ml-2">Almacén Destino</label>
                                <select disabled={mType === "EXIT"} value={header.destination_warehouse_id} onChange={e => setHeader({ ...header, destination_warehouse_id: e.target.value })}
                                    className="w-full bg-[#131722] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-30">
                                    <option value="">{mType === 'EXIT' ? 'CONSUMO' : 'Seleccionar...'}</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Section - Responsive Grid */}
                <div className="p-4 sm:p-8">
                    <div className="hidden lg:grid grid-cols-[1fr_120px_100px_1fr_60px] gap-4 text-[10px] font-black text-white/50 uppercase tracking-widest border-b border-white/10 pb-4 px-4">
                        <div>Producto / Código</div>
                        <div className="text-center">Cant.</div>
                        <div className="text-center">Unidad</div>
                        <div>Descripción</div>
                        <div></div>
                    </div>

                    <div className="divide-y divide-white/10">
                        {items.map((item, idx) => (
                            <div key={idx} className="group hover:bg-white/5 transition-colors py-6 lg:py-4 px-4 grid grid-cols-1 lg:grid-cols-[1fr_120px_100px_1fr_60px] gap-6 lg:gap-4 items-center relative">
                                {/* Product / Code */}
                                <div className="space-y-1 relative">
                                    <label className="lg:hidden text-[10px] font-bold text-white/50 uppercase">Producto / Código</label>
                                    {item.product_id ? (
                                        <div className="flex items-center gap-3 bg-black/50 border border-emerald-500/30 rounded-xl px-3 py-2">
                                            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-mono text-xs font-bold">{item.product_code}</span>
                                            <span className="text-sm font-medium text-white truncate flex-grow">{item.product_label}</span>
                                            <button onClick={() => updateItem(idx, 'product_id', null)} className="text-white/50 hover:text-red-400">✕</button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Escribe código o nombre..."
                                                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-all font-medium"
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
                                                <div className="absolute z-[100] left-0 right-0 mt-2 bg-[#131722] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-h-[min(500px,70vh)] overflow-auto animate-in fade-in zoom-in-95 duration-200">
                                                    {filteredProducts.slice(0, 15).map(p => (
                                                        <button key={p.id} onClick={() => selectProduct(idx, p)} className="w-full text-left px-4 py-3 hover:bg-emerald-500 hover:text-slate-900 text-white transition-colors border-b border-white/5 last:border-0 flex justify-between items-center">
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
                                </div>

                                {/* Quantity & Unit (Grouped for mobile side-by-side) */}
                                <div className="grid grid-cols-2 lg:contents gap-4">
                                    <div className="space-y-1">
                                        <label className="lg:hidden text-[10px] font-bold text-white/50 uppercase">Cantidad</label>
                                        <input type="number" inputMode="numeric" className="w-full bg-black/50 border border-white/10 text-white rounded-xl px-3 py-2 lg:py-3 text-center text-lg lg:text-xl font-black outline-none focus:ring-2 focus:ring-emerald-500 transition-all" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} placeholder="0" />
                                    </div>

                                    <div className="flex flex-col lg:items-center space-y-1 h-full justify-end lg:justify-center">
                                        <label className="lg:hidden text-[10px] font-bold text-white/50 uppercase">Unidad</label>
                                        <span className="text-xs text-white font-black uppercase tracking-widest bg-black/50 px-3 py-2.5 lg:py-2 rounded-lg lg:bg-transparent border border-white/10 lg:border-0 text-center">{item.unit || "N/A"}</span>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-1">
                                    <label className="lg:hidden text-[10px] font-bold text-slate-500 uppercase">Descripción</label>
                                    <div className="text-[10px] text-slate-400 italic line-clamp-2 px-1">{item.description || "Pendiente de selección..."}</div>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end lg:pt-0 absolute -top-1 right-2 lg:relative lg:top-auto lg:right-auto">
                                    <button onClick={() => removeItem(idx)} className="text-slate-600 hover:text-red-500 transition-colors p-2 lg:p-3 bg-red-500/5 lg:bg-transparent rounded-full">
                                        <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="px-4 sm:px-8 pb-8">
                    <button onClick={addItem} className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-black text-xs uppercase tracking-widest transition-all group">
                        <span className="bg-emerald-500/10 w-8 h-8 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/20 transition-all border border-emerald-500/20">+</span>
                        Añadir Producto
                    </button>
                </div>

                {/* Footer Section Entries */}
                <div className="p-4 sm:p-8 bg-black/40 border-t border-white/10 rounded-b-3xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-white/50 uppercase ml-2">Entregó / Delivery</label>
                            <input type="text" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500" value={header.delivery_person} onChange={e => setHeader({ ...header, delivery_person: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-white/50 uppercase ml-2">Recibió / Receiver</label>
                            <input type="text" placeholder="Nombre de quien recibe" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500" value={header.receiver_person} onChange={e => setHeader({ ...header, receiver_person: e.target.value })} />
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
