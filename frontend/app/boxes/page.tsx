"use client";
import { useState, useEffect } from "react";
import { fetchBoxes, createBox, fetchWarehouses, fetchBoxByCode } from "@/lib/api";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useRouter } from "next/navigation";

export default function BoxesPage() {
  const router = useRouter();
  const [boxes, setBoxes] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [newBox, setNewBox] = useState({ code: "", description: "", warehouse_id: "" });
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let scanner: any = null;
    if (showScanner) {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      scanner.render(onScanSuccess, onScanFailure);
    }
    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [showScanner]);

  async function onScanSuccess(decodedText: string) {
    if (scanning) return;
    setScanning(true);
    try {
      // The QR code will contain the box code (e.g. "BOX-001")
      const box = await fetchBoxByCode(decodedText);
      setShowScanner(false);
      router.push(`/boxes/${box.id}`);
    } catch (error) {
      console.error("Scanned invalid code:", decodedText);
      alert("Código no reconocido: " + decodedText);
      setScanning(false);
    }
  }

  function onScanFailure(error: any) {
    // quietly handle scan failures (mostly just no qr in frame)
  }

  async function loadData() {
    setLoading(true);
    try {
      const [boxesData, warehousesData] = await Promise.all([
        fetchBoxes(),
        fetchWarehouses()
      ]);
      setBoxes(boxesData);
      setWarehouses(warehousesData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    try {
      await createBox({
        ...newBox,
        warehouse_id: parseInt(newBox.warehouse_id)
      });
      setShowModal(false);
      setNewBox({ code: "", description: "", warehouse_id: "" });
      loadData();
    } catch (error) {
      alert("Error al crear la caja");
    }
  }

  if (loading) return <div className="p-8 text-white animate-pulse">Cargando cajas...</div>;

  return (
    <div className="space-y-6 text-white">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Cajas</h1>
          <p className="text-white/60">Organiza tus productos en contenedores físicos.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowScanner(true)}
            className="bg-[#131722]/60 hover:bg-white/5 border border-white/10 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2"
          >
            <span>📷</span> Escanear QR
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2"
          >
            <span>📦</span> Nueva Caja
          </button>
        </div>
      </header>

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-[#131722] border border-white/10 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>📷</span> Escaneando Código de Caja
              </h2>
              <button onClick={() => setShowScanner(false)} className="text-white/40 hover:text-white">✕</button>
            </div>
            
            <div id="reader" className="w-full rounded-2xl overflow-hidden bg-black/40 border border-white/5 shadow-inner"></div>
            
            <p className="text-center mt-6 text-white/40 text-sm">
              Coloca el código QR de la caja frente a la cámara para identificarla.
            </p>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-[#131722]/60 border border-white/10 backdrop-blur-sm">
          <div className="text-white/40 text-[10px] font-black uppercase tracking-widest">Total Cajas</div>
          <div className="text-4xl font-black mt-1">{boxes.length}</div>
        </div>
        <div className="p-6 rounded-2xl bg-[#131722]/60 border border-white/10 backdrop-blur-sm">
          <div className="text-white/40 text-[10px] font-black uppercase tracking-widest">Ocupación Promedio</div>
          <div className="text-4xl font-black mt-1 text-emerald-400">High</div>
        </div>
        <div className="p-6 rounded-2xl bg-[#131722]/60 border border-white/10 backdrop-blur-sm">
          <div className="text-white/40 text-[10px] font-black uppercase tracking-widest">Almacenes con Cajas</div>
          <div className="text-4xl font-black mt-1 text-blue-400">
            {new Set(boxes.map(b => b.warehouse_id)).size}
          </div>
        </div>
      </div>

      {/* Boxes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {boxes.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
            <span className="text-4xl block mb-4">📦</span>
            <p className="text-white/40">No hay cajas registradas aún.</p>
          </div>
        ) : (
          boxes.map((box) => (
            <a 
              key={box.id}
              href={`/boxes/${box.id}`}
              className="group p-6 rounded-2xl bg-[#131722]/60 border border-white/10 hover:border-emerald-500/50 transition-all hover:shadow-2xl hover:shadow-emerald-500/5 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="text-6xl font-black italic">#{box.code.split('-')[1] || box.id}</span>
              </div>
              <div className="flex justify-between items-start mb-4">
                <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg text-xs font-bold font-mono border border-emerald-500/20">
                  {box.code}
                </div>
                <div className="text-[10px] text-white/30 font-bold uppercase tracking-tighter">
                  {warehouses.find(w => w.id === box.warehouse_id)?.name || "Almacén"}
                </div>
              </div>
              <h3 className="text-xl font-bold mb-1 truncate">{box.description || "Sin descripción"}</h3>
              <p className="text-sm text-white/40 mb-4 line-clamp-1">
                Contiene {box.items?.length || 0} categorías de productos
              </p>
              <div className="flex -space-x-2 overflow-hidden">
                {/* Visual indicator of "fullness" */}
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-[#1F2433] border-2 border-[#131722] flex items-center justify-center text-[10px] font-bold">
                    {i === 3 ? '+' : '•'}
                  </div>
                ))}
              </div>
            </a>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#131722] border border-white/10 rounded-3xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span>📦</span> Registrar Nueva Caja
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest ml-1 mb-1 block">Código de Caja</label>
                <input 
                  type="text" 
                  value={newBox.code}
                  onChange={e => setNewBox({...newBox, code: e.target.value.toUpperCase()})}
                  placeholder="Ej: CAJA-001"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest ml-1 mb-1 block">Almacén</label>
                <select 
                  value={newBox.warehouse_id}
                  onChange={e => setNewBox({...newBox, warehouse_id: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
                >
                  <option value="">Seleccionar...</option>
                  {warehouses.filter(w => w.active).map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest ml-1 mb-1 block">Descripción / Notas</label>
                <textarea 
                  value={newBox.description}
                  onChange={e => setNewBox({...newBox, description: e.target.value})}
                  placeholder="Detalles sobre el uso o ubicación de la caja..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors h-24"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-white/60 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreate}
                disabled={!newBox.code || !newBox.warehouse_id}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition-all"
              >
                Crear Caja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
