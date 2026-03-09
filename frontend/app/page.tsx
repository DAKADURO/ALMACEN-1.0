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
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Dashboard de Inventario</h1>
        <p className="text-white">Resumen general de existencias y alertas críticas.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700 backdrop-blur-sm">
          <div className="text-white text-sm font-medium">Total Productos</div>
          <div className="text-3xl font-bold mt-2">{stats.total_products}</div>
        </div>
        <div className="p-6 rounded-2xl bg-emerald-900/20 border border-emerald-900/30 backdrop-blur-sm">
          <div className="text-emerald-400 text-sm font-medium italic">Valuación Total</div>
          <div className="text-3xl font-black mt-2 text-emerald-500">
            ${stats.total_valuation?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-white text-xs uppercase font-bold tracking-widest">Existencia Total</p>
        </div>
        <div className={`p-6 rounded-2xl backdrop-blur-sm ${stats.low_stock_count > 0 ? "bg-red-900/20 border border-red-900/30" : "bg-slate-800/40 border border-slate-700"}`}>
          <div className={`text-sm font-medium ${stats.low_stock_count > 0 ? "text-white" : "text-white"}`}>
            Alertas Stock Bajo
          </div>
          <div className={`text-3xl font-bold mt-2 ${stats.low_stock_count > 0 ? "text-red-500" : "text-slate-100"}`}>
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
        <section className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700">
          <h2 className="text-xl font-bold mb-4">Stock Bajo (Crítico)</h2>
          <div className="space-y-3">
            {stats.low_stock_items.length === 0 ? (
                ✅ Todos los productos están dentro del rango saludable.
          </div>
          ) : (
              stats.low_stock_items.map((item: any, i: number) => (
          <div key={i} className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg border-l-4 border-red-500">
            <div>
              <div className="font-semibold text-sm text-white">{item.description || item.name}</div>
              <div className="text-xs text-white">
                {item.code} · {item.warehouse_name}
              </div>
            </div>
            <div className="text-right">
              <div className="text-red-500 font-bold">{item.current_stock} {item.unit}</div>
              <div className="text-xs text-white">Min: {item.min_stock} {item.unit}</div>
            </div>
          </div>
          ))
            )}
      </div>
    </section>

        {/* Recent Movements */ }
  <section className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700">
    <h2 className="text-xl font-bold mb-4">Últimos Movimientos</h2>
    <div className="space-y-3">
      {stats.recent_movements.length === 0 ? (
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
        <div className="font-semibold text-sm text-white">{label}</div>
        <div className="text-xs text-white">
          {m.product_description || m.product_name} ({m.quantity} uds)
        </div>
      </div>
      <div className="text-xs text-white">
        {m.created_at ? new Date(m.created_at).toLocaleString("es-MX", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) : ""}
      </div>
    </div>
    );
              })
            )}
  </div>
        </section >
      </div >
    </div >
  );
}
