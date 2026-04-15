"use client";

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);

            const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, "");
            console.log("Login API_URL:", API_URL);
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Credenciales incorrectas');
            }

            const data = await response.json();

            // Fetch user profile
            const userResponse = await fetch(`${API_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${data.access_token}`
                }
            });

            const userData = await userResponse.json();
            login(data.access_token, userData);

        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#131722] rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
                <div className="p-8">
                    <div className="flex justify-center mb-8">
                        <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-white text-center mb-2">Almacén 1.0</h2>
                    <p className="text-white/60 text-center mb-8">Inicia sesión para continuar</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">Usuario</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="Ingresa tu usuario"
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
                            {loading ? 'Entrando...' : 'Entrar al Sistema'}
                        </button>
                    </form>
                </div>

                <div className="bg-[#131722] p-6 text-center border-t border-white/10">
                    <p className="text-sm text-white/60 mb-4">© 2026 Proair - Sistema de Inventarios</p>
                    <a href="/register" className="text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors">
                        ¿No tienes cuenta? Solicita acceso aquí
                    </a>
                </div>
            </div>
        </div>
    );
}
