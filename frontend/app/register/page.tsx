"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, "");
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password,
                    full_name: fullName,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Error al registrarse');
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Error al enviar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-[#131722] rounded-2xl shadow-2xl border border-white/10 p-8 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/50">
                            <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">Solicitud Enviada</h2>
                    <p className="text-white/60 mb-8">
                        Tu cuenta ha sido creada con éxito. Un administrador debe revisarla y activarla antes de que puedas iniciar sesión.
                    </p>
                    <button
                        onClick={() => router.push('/login')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all"
                    >
                        Volver al Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#131722] rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
                <div className="p-8">
                    <div className="flex justify-center mb-8">
                        <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-white text-center mb-2">Solicitar Acceso</h2>
                    <p className="text-white/60 text-center mb-8">Completa tus datos para crear una cuenta</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">Nombre Completo</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="Ej. Juan Pérez"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">Nombre de Usuario</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="usuario123"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? 'Enviando...' : 'Enviar Solicitud'}
                        </button>
                    </form>
                </div>

                <div className="bg-[#131722] p-6 text-center border-t border-white/10">
                    <button
                        onClick={() => router.push('/login')}
                        className="text-white/40 hover:text-white text-sm transition-colors"
                    >
                        ¿Ya tienes cuenta? Inicia sesión
                    </button>
                </div>
            </div>
        </div>
    );
}
