"use client";

import { Inter } from "next/font/google";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import "./globals.css";
import { AuthProvider, useAuth } from "@/lib/auth-context";

const inter = Inter({ subsets: ["latin"] });

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/inventory", label: "Inventario", icon: "📦" },
  { href: "/movements", label: "Movimientos", icon: "🔄" },
  { href: "/inventory/adjust", label: "Ajustes", icon: "⚖️" },
  { href: "/reports", label: "Reportes", icon: "📋" },
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Si no hay usuario y no estamos en la página de login, redirigir al login
  if (!user && pathname !== "/login") {
    if (typeof window !== 'undefined') {
      window.location.href = "/login";
    }
    return null;
  }

  // Si estamos en login, mostrar solo el contenido (sin sidebar)
  if (pathname === "/login") {
    return <main className="w-full">{children}</main>;
  }

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen">
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="text-xl font-bold tracking-tight text-emerald-400">
          ALMACEN <span className="text-white text-base">1.0</span>
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
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <nav className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-800/80 lg:bg-slate-800/50 backdrop-blur-md border-r border-slate-700 p-6 flex flex-col gap-6 transform transition-transform duration-300 ease-in-out h-full
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:sticky lg:top-0'}
      `}>
        <div className="hidden lg:block text-2xl font-bold tracking-tight text-emerald-400">
          ALMACEN <span className="text-white">1.0</span>
        </div>

        {/* Context Switcher */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-white uppercase tracking-widest px-1">Inventario Activo</label>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => handleContextChange("tuberia")}
              className={`text-left px-3 py-2 rounded-lg text-sm font-bold transition-all border ${context === "tuberia" ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-400" : "bg-slate-900/40 border-slate-700 text-white hover:border-slate-500"}`}
            >
              🛠️ Airpipe
            </button>
            <button
              onClick={() => handleContextChange("refacciones")}
              className={`text-left px-3 py-2 rounded-lg text-sm font-bold transition-all border ${context === "refacciones" ? "bg-blue-600/20 border-blue-500/50 text-blue-400" : "bg-slate-900/40 border-slate-700 text-white hover:border-slate-500"}`}
            >
              ⚙️ Proair
            </button>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-700 pt-4">
          <ul className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-all ${isActive
                      ? "bg-slate-700 text-white shadow-sm shadow-slate-950/20"
                      : "text-white opacity-60 hover:bg-slate-700/50 hover:opacity-100"
                      }`}
                  >
                    <span className="grayscale-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center font-bold text-white uppercase transform transition-transform hover:scale-105">
              {user?.username?.substring(0, 2)}
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold truncate leading-tight">{user?.full_name || "Usuario"}</span>
              <span className="text-[10px] text-white uppercase font-black tracking-widest">{user?.role || "Personal"}</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-red-900/30 hover:text-red-400 rounded-lg text-sm font-medium transition-all group"
          >
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-8 bg-gradient-to-br from-slate-900 to-slate-950 overflow-auto">
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
        <title>Almacen 1.0 - Gestión de Inventarios</title>
        <meta name="description" content="Sistema centralizado de gestión de refacciones y consumibles" />
      </head>
      <body className={`${inter.className} bg-slate-900 text-slate-100 min-h-screen`}>
        <AuthProvider>
          <AppContent>{children}</AppContent>
        </AuthProvider>
      </body>
    </html>
  );
}
