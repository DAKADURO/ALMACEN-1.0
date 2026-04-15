"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNotification } from "@/context/NotificationContext";

export default function UserManagementPage() {
    const { showNotification } = useNotification();
    const token = useAuth().token;
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState<number | null>(null);

    const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, "");

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/auth/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchUsers();
        }
    }, [token]);

    const handleUpdateUser = async (userId: number, updates: any) => {
        setIsSubmitting(userId);
        try {
            const response = await fetch(`${API_URL}/auth/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });

            if (response.ok) {
                // local update
                setUsers(users.map(u => u.id === userId ? { ...u, ...updates } : u));
                showNotification("Usuario actualizado correctamente", "success");
            } else {
                const data = await response.json();
                showNotification(`Error: ${data.detail}`, "error");
            }
        } catch (error) {
            console.error("Error updating user:", error);
            showNotification("Error al actualizar usuario", "error");
        } finally {
            setIsSubmitting(null);
        }
    };

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold">Administración de Usuarios</h1>
                <p className="text-white/80 mt-1">Gestiona los accesos y roles del sistema.</p>
            </header>

            <div className="rounded-2xl border border-white/10 bg-[#131722]/40 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="sticky top-0 z-20 bg-[#131722] border-b border-white/10 text-white text-sm uppercase">
                            <tr>
                                <th className="p-4">Usuario</th>
                                <th className="p-4">Nombre Completo</th>
                                <th className="p-4">Rol</th>
                                <th className="p-4">Estado</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-white/50 animate-pulse">Cargando usuarios...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-white/50">No hay usuarios registrados.</td></tr>
                            ) : users.map((u) => (
                                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <span className="font-mono text-blue-400">{u.username}</span>
                                    </td>
                                    <td className="p-4 text-white font-medium">{u.full_name || "—"}</td>
                                    <td className="p-4">
                                        <select 
                                            value={u.role}
                                            onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}
                                            disabled={isSubmitting === u.id}
                                            className="bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${u.active ? "bg-emerald-900/40 text-emerald-400" : "bg-yellow-900/40 text-yellow-400"}`}>
                                            {u.active ? "Activo" : "Pendiente"}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex gap-2 justify-end">
                                            {!u.active ? (
                                                <button
                                                    onClick={() => handleUpdateUser(u.id, { active: true })}
                                                    disabled={isSubmitting === u.id}
                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                                >
                                                    Aprobar Acceso
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleUpdateUser(u.id, { active: false })}
                                                    disabled={isSubmitting === u.id}
                                                    className="px-3 py-1.5 bg-red-600/20 text-red-500 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                                >
                                                    Inhabilitar
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-2xl flex gap-4 items-start">
                <span className="text-2xl mt-1">🛡️</span>
                <div>
                    <h4 className="font-bold text-blue-400">Panel de Control de Seguridad</h4>
                    <p className="text-sm text-slate-300 mt-1">
                        Desde aquí puedes autorizar nuevas solicitudes de acceso y elevar privilegios a otros usuarios para que también actúen como administradores.
                    </p>
                </div>
            </div>
        </div>
    );
}
