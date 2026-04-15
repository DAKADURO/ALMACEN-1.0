"use client";

import { Inter } from "next/font/google";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import "./globals.css";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { NotificationProvider } from "@/context/NotificationContext";


const inter = Inter({ subsets: ["latin"] });

const navItems = [
  { href: "/", label: "Dashboard", icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
  { href: "/inventory", label: "Inventario", icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
  { href: "/movements", label: "Movimientos", icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg> },
  { href: "/boxes", label: "Cajas", icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg> },
  { href: "/inventory/adjust", label: "Ajustes", icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg> },
  { href: "/reports", label: "Reportes", icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
  { href: "/admin/users", label: "Administración", icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>, adminOnly: true },
];

function AppContent({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const pathname = usePathname();
  const [context, setContext] = useState("tuberia");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const savedContext = localStorage.getItem("inventory-context") || "tuberia";
    setContext(savedContext);
  }, []);

  useEffect(() => {
    // Close mobile menu when pathname changes
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleContextChange = (newContext: string) => {
    localStorage.setItem("inventory-context", newContext);
    setContext(newContext);
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Si no hay usuario y no estamos en login o registro, redirigir al login
  if (!user && pathname !== "/login" && pathname !== "/register") {
    if (typeof window !== 'undefined') {
      window.location.href = "/login";
    }
    return null;
  }

  // Si estamos en login o registro, mostrar solo el contenido (sin sidebar)
  if (pathname === "/login" || pathname === "/register") {
    return <main className="w-full">{children}</main>;
  }

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen">
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-[#0B0E14] border-b border-white/5 sticky top-0 z-50">
        <div className="text-xl font-bold tracking-tight text-emerald-400">
          ALMACEN <span className="text-white text-base">3.0</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <nav className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#131722]/95 lg:bg-[#131722]/80 backdrop-blur-md border-r border-[#1F2433] p-6 flex flex-col gap-6 transform transition-transform duration-300 ease-in-out h-full
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:sticky lg:top-0'}
      `}>
        <div className="hidden lg:flex items-center gap-3">
          <div className="text-2xl font-black tracking-tighter text-emerald-400">
            ALMACEN<span className="text-white font-medium ml-1 text-xl">3.0</span>
          </div>
        </div>

        {/* Context Switcher (Segmented Control) */}
        <div className="mb-2">
          <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest px-1 mb-2 block">Inventario Activo</label>
          <div className="flex p-1 bg-black/40 rounded-xl border border-white/5 relative">
            {/* Slide background */}
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#1F2433] rounded-lg border border-white/10 transition-transform duration-300 ease-in-out shadow-lg ${context === "tuberia" ? "translate-x-0" : "translate-x-full"}`}
            />
            {/* Airpipe Button */}
            <button
              onClick={() => handleContextChange("tuberia")}
              className={`flex-1 relative z-10 py-2.5 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-colors ${context === "tuberia" ? "text-emerald-400" : "text-white/40 hover:text-white"}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Airpipe
            </button>
            {/* Proair Button */}
            <button
              onClick={() => handleContextChange("refacciones")}
              className={`flex-1 relative z-10 py-2.5 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-colors ${context === "refacciones" ? "text-blue-400" : "text-white/40 hover:text-white"}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
              Proair
            </button>
          </div>
        </div>

        <div className="mt-4 border-t border-white/5 pt-6">
          <ul className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              if (item.adminOnly && user?.role !== 'admin') return null;
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all group relative overflow-hidden ${isActive
                      ? "bg-emerald-500/10 text-emerald-400 font-bold"
                      : "text-white/50 hover:bg-white/5 hover:text-white"
                      }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] rounded-r-full" />
                    )}
                    <span className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:text-emerald-400'}`}>{item.icon}</span>
                    <span className="tracking-wide z-10 relative">{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-auto pt-6 border-t border-white/5">
          <div className="flex items-center gap-4 mb-5 px-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#1F2433] to-black border border-white/10 rounded-xl flex items-center justify-center font-bold text-white uppercase shadow-lg shadow-black/50 overflow-hidden flex-shrink-0">
              {user?.username?.substring(0, 2) || "AD"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-white text-sm font-bold truncate leading-tight tracking-wide">{user?.full_name || "Usuario"}</span>
              <span className="text-[10px] text-white/50 uppercase font-black tracking-widest mt-0.5 truncate">{user?.role || "Personal"}</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-black/40 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 border border-transparent rounded-xl text-xs font-bold tracking-widest uppercase transition-all group"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-8 bg-gradient-to-br from-[#0B0E14] to-black overflow-auto">
        {children}
      </main>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <title>Almacen 3.0 - Gestión de Inventarios</title>
        <meta name="description" content="Sistema centralizado de gestión de refacciones y consumibles" />
      </head>
      <body className={`${inter.className} bg-[#0B0E14] text-white min-h-screen`}>
        <NotificationProvider>
          <AuthProvider>
            <AppContent>{children}</AppContent>
          </AuthProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
