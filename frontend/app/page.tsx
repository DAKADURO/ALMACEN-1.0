"use client";
import { useState, useEffect } from "react";
import { fetchDashboardStats } from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-lg animate-pulse">Cargando dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">Error al cargar datos. ¿El backend está activo?</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-white">
      <header>
        <h1 className="text-3xl font-bold">Dashboard de Inventario</h1>
        <p className="text-white opacity-80">Resumen general de existencias y alertas críticas.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700 backdrop-blur-sm">
          <div className="text-white/70 text-sm font-medium">Total Productos</div>
          <div className="text-3xl font-bold mt-2">{stats.total_products}</div>
        </div>
        <div className="p-6 rounded-2xl bg-emerald-900/20 border border-emerald-900/30 backdrop-blur-sm">
          <div className="text-emerald-400 text-sm font-medium italic">Valuación Total</div>
          <div className="text-3xl font-black mt-2 text-emerald-500">
            ${stats.total_valuation?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-white text-xs uppercase font-bold tracking-widest mt-1">Existencia Total</p>
        </div>
        <div className={`p-6 rounded-2xl backdrop-blur-sm ${stats.low_stock_count > 0 ? "bg-red-900/20 border border-red-900/30" : "bg-slate-800/40 border border-slate-700"}`}>
          <div className="text-white/70 text-sm font-medium">Alertas Stock Bajo</div>
          <div className={`text-3xl font-bold mt-2 ${stats.low_stock_count > 0 ? "text-red-500" : "text-white"}`}>
            {stats.low_stock_count}
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-blue-900/20 border border-blue-900/30 backdrop-blur-sm">
          <div className="text-blue-400 text-sm font-medium">Movimientos Hoy</div>
          <div className="text-3xl font-bold mt-2 text-blue-500">{stats.movements_today}</div>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Low Stock */}
        <section className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700 flex flex-col">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>⚠️</span> Stock Bajo (Crítico)
          </h2>
          <div className="space-y-3">
            {stats.low_stock_items.length === 0 ? (
              <div className="text-sm text-white/50 py-4 text-center">
                ✅ Todos los productos están dentro del rango saludable.
              </div>
            ) : (
              stats.low_stock_items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg border-l-4 border-red-500">
                  <div>
                    <div className="font-semibold text-sm">{item.description || item.name}</div>
                    <div className="text-xs opacity-60">
                      {item.code} · {item.warehouse_name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-red-500 font-bold">{item.current_stock} {item.unit}</div>
                    <div className="text-xs opacity-60">Min: {item.min_stock} {item.unit}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Top Products (Rotation) */}
        <section className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700 flex flex-col shadow-lg shadow-emerald-900/10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>📈</span> Top Movimientos (30 días)
          </h2>
          <div className="space-y-4">
            {stats.top_products.length === 0 ? (
              <div className="text-sm text-white/50 py-4 text-center">
                Sin rotación registrada en los últimos 30 días.
              </div>
            ) : (
              stats.top_products.map((item: any, i: number) => {
                // Calculate color intensity based on rank (i)
                const colors = ["bg-emerald-500", "bg-emerald-600", "bg-emerald-700", "bg-slate-600", "bg-slate-700"];
                const progress = ((item.count / stats.top_products[0].count) * 100);
                
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm items-end">
                      <div className="flex-grow">
                        <span className="font-bold text-emerald-400 mr-2">#{i + 1}</span>
                        <span className="font-medium text-white line-clamp-1">{item.name}</span>
                        <div className="text-[10px] opacity-40 font-mono">{item.code}</div>
                      </div>
                      <div className="text-right ml-4">
                        <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{item.count} mov.</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${colors[i] || "bg-slate-600"} transition-all duration-1000`} 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <p className="text-[10px] opacity-30 mt-auto pt-4 text-center italic">Este panel ayuda a identificar el material con mayor rotación.</p>
        </section>

        {/* Recent Movements */}
        <section className="lg:col-span-2 p-6 rounded-2xl bg-slate-800/40 border border-slate-700 flex flex-col overflow-hidden">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>🕒</span> Últimos Movimientos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.recent_movements.length === 0 ? (
              <div className="col-span-2 text-sm text-white/50 py-4 text-center">
                Sin movimientos registrados aún.
              </div>
            ) : (
              stats.recent_movements.map((m: any, i: number) => {
                const isEntry = m.movement_type.includes("ENTRY") || m.movement_type.includes("INITIAL") || m.movement_type.includes("PURCHASE");
                const borderColor = isEntry ? "border-emerald-500" : m.movement_type === "TRANSFER" ? "border-blue-500" : "border-amber-500";
                const label = isEntry
                  ? `Entrada → ${m.destination || "Almacén"}`
                  : m.movement_type === "TRANSFER"
                    ? `${m.origin || "?"} → ${m.destination || "?"}`
                    : `Salida de ${m.origin || "Almacén"}`;

                return (
                  <div key={i} className={`flex justify-between items-center p-3 bg-slate-900/50 rounded-lg border-l-4 ${borderColor}`}>
                    <div>
                      <div className="font-semibold text-sm line-clamp-1 flex items-center gap-2">
                        {label}
                        {m.reference_doc && (
                          <span className="text-[10px] bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded font-mono border border-emerald-500/20">
                            {m.reference_doc}
                          </span>
                        )}
                      </div>
                      <div className="text-xs opacity-60 line-clamp-1">
                        <span className="font-mono text-[10px] text-emerald-500/80 mr-1">{m.product_code || ""}</span>
                        {m.product_description || m.product_name} ({m.quantity} uds)
                      </div>
                    </div>
                    <div className="text-[10px] opacity-40 ml-4 whitespace-nowrap">
                      {m.created_at ? new Date(m.created_at).toLocaleString("es-MX", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) : ""}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
