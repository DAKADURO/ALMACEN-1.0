"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchBox, fetchProducts, addItemToBox, removeItemFromBox, fetchWarehouses, Box, Product, Warehouse } from "@/lib/api";
import QRCode from "qrcode";

export default function BoxDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [box, setBox] = useState<Box | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [addingItem, setAddingItem] = useState<{product_id: number, quantity: number} | null>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [showLabel, setShowLabel] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (box?.code) {
      QRCode.toDataURL(box.code, { margin: 2, scale: 10 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [box]);

  async function loadData() {
    setLoading(true);
    try {
      const [boxData, productsData, warehousesData] = await Promise.all([
        fetchBox(parseInt(id as string)),
        fetchProducts(),
        fetchWarehouses()
      ]);
      setBox(boxData);
      setProducts(productsData);
      setWarehouses(warehousesData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const warehouseName = warehouses.find(w => w.id === box?.warehouse_id)?.name || "Almacén";

  async function handleAddItem() {
    if (!addingItem || !box) return;
    try {
      await addItemToBox(box.id, addingItem);
      setAddingItem(null);
      loadData();
    } catch (error) {
      alert("Error al agregar producto a la caja");
    }
  }

  async function handleRemoveItem(productId: number) {
    if (!box) return;
    if (!confirm("¿Seguro que quieres sacar este producto de la caja?")) return;
    try {
      await removeItemFromBox(box.id, productId);
      loadData();
    } catch (error) {
      alert("Error al eliminar producto");
    }
  }

  const filteredProducts = products.filter(p => 
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.description || p.name).toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  if (loading) return <div className="p-8 text-white animate-pulse">Cargando detalles de la caja...</div>;
  if (!box) return <div className="p-8 text-red-500">Caja no encontrada</div>;

  return (
    <div className="space-y-8 text-white">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/boxes")}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-yellow-400">{box.code}</h1>
              <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">Activa</span>
            </div>
            <p className="text-white/60">{box.description || "Sin descripción física registrada."}</p>
          </div>
        </div>

        <button 
          onClick={() => setShowLabel(true)}
          className="bg-white text-black hover:bg-emerald-50 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 self-start md:self-auto"
        >
          <span>🏷️</span> Generar Etiqueta
        </button>
      </header>

      {/* Label Modal */}
      {showLabel && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white text-black p-12 rounded-[32px] shadow-2xl max-w-sm w-full text-center space-y-8 print:p-0 print:shadow-none print:m-0">
            <div className="space-y-2">
              <div className="text-[10px] font-black tracking-[0.2em] uppercase text-black/40">Inventario Proair 3.0</div>
              <h2 className="text-5xl font-black tracking-tighter">{box.code}</h2>
              <div className="bg-black text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest inline-block">
                {warehouseName}
              </div>
            </div>
            
            {qrUrl && (
              <div className="bg-white p-4 border-2 border-black/5 inline-block rounded-3xl">
                <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
              </div>
            )}
            
            <div className="space-y-4 print:hidden">
              <button 
                onClick={() => window.print()}
                className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:scale-[1.02] transition-transform"
              >
                Imprimir Ahora
              </button>
              <button 
                onClick={() => setShowLabel(false)}
                className="w-full py-2 text-black/40 font-bold hover:text-black transition-colors"
              >
                Cerrar
              </button>
            </div>
            
            <div className="text-[9px] text-black/30 font-bold max-w-[200px] mx-auto leading-tight italic">
              Escanea este código con cualquier dispositivo autorizado para ver el contenido exacto de esta caja.
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contents Table */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>📋</span> Productos en esta Caja
          </h2>
          <div className="bg-[#131722]/60 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            {box.items?.length === 0 ? (
              <div className="p-20 text-center text-white/30 italic">
                La caja está vacía. Empieza agregando productos.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40">
                      <th className="px-6 py-4">Código / Producto</th>
                      <th className="px-6 py-4 text-center">Cantidad</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {box.items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-sm">{item.product?.code}</div>
                          <div className="text-xs text-white/50">{item.product?.description || item.product?.name}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-white/5 px-3 py-1 rounded-full font-mono font-bold text-emerald-400">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleRemoveItem(item.product_id)}
                            className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Adding Form */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
            <span>📦</span> Empacar Material
          </h2>
          <div className="p-6 rounded-2xl bg-[#131722]/60 border border-emerald-500/20 backdrop-blur-sm shadow-xl space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-1 block">Buscar Producto</label>
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Nombre o código..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Product Results */}
            {searchTerm && (
              <div className="bg-black/60 border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5">
                {filteredProducts.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => setAddingItem({ product_id: p.id, quantity: 1 })}
                    className={`w-full text-left px-4 py-3 hover:bg-emerald-500/10 transition-colors flex justify-between items-center ${addingItem?.product_id === p.id ? 'bg-emerald-500/10 border-l-2 border-emerald-500' : ''}`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">{p.code}</div>
                      <div className="text-[10px] text-white/40 truncate">{p.description || p.name}</div>
                    </div>
                    {addingItem?.product_id === p.id && <span className="text-emerald-400 text-xs font-bold">✓</span>}
                  </button>
                ))}
              </div>
            )}

            {addingItem && (
              <div className="pt-4 mt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="text-[10px] font-black uppercase text-emerald-400/60 tracking-widest mb-2 block text-center">Cantidad a empacar</label>
                <div className="flex items-center justify-center gap-4">
                  <button 
                    onClick={() => setAddingItem({...addingItem, quantity: Math.max(1, addingItem.quantity - 1)})}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xl hover:bg-white/10"
                  >-</button>
                  <span className="text-3xl font-black font-mono w-16 text-center">{addingItem.quantity}</span>
                  <button 
                    onClick={() => setAddingItem({...addingItem, quantity: addingItem.quantity + 1})}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xl hover:bg-white/10"
                  >+</button>
                </div>
                <button 
                  onClick={handleAddItem}
                  className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-emerald-900/20"
                >
                  Confirmar Empaque
                </button>
              </div>
            )}
          </div>
          <div className="p-4 rounded-xl bg-blue-900/10 border border-blue-500/20">
            <p className="text-[10px] text-blue-400 leading-relaxed italic">
              <strong>Tip:</strong> Puedes usar un escáner de códigos de barras en este buscador para empacar material más rápido.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
