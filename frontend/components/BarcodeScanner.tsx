"use client";
import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface BarcodeScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onClose: () => void;
}

export default function BarcodeScanner({ onScanSuccess, onClose }: BarcodeScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [isScannerInitialized, setIsScannerInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const startScanner = async () => {
            try {
                const html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;

                const config = { fps: 10, qrbox: { width: 250, height: 150 } };

                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        onScanSuccess(decodedText);
                        stopScanner();
                    },
                    (errorMessage) => {
                        // Suppress scanning noise errors
                        // console.log(errorMessage);
                    }
                );
                setIsScannerInitialized(true);
            } catch (err) {
                console.error("Error starting scanner:", err);
                setError("No se pudo acceder a la cámara. Asegúrate de estar usando HTTPS y de haber dado permisos.");
            }
        };

        startScanner();

        return () => {
            stopScanner();
        };
    }, []);

    const stopScanner = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop();
                await scannerRef.current.clear();
            } catch (err) {
                console.error("Error stopping scanner:", err);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700/50 rounded-3xl overflow-hidden max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/20">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">📸</span>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Escáner de Almacén</h3>
                    </div>
                    <button 
                        onClick={()=>{ stopScanner().then(onClose); }} 
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all"
                    >
                        ✕
                    </button>
                </div>

                {/* Scanner Area */}
                <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
                    <div id="reader" className="w-full h-full"></div>
                    
                    {!isScannerInitialized && !error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
                            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs font-bold uppercase tracking-widest">Iniciando Cámara...</span>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center gap-4">
                            <span className="text-4xl">⚠️</span>
                            <div className="text-red-400 text-xs font-medium leading-relaxed">
                                {error}
                            </div>
                            <button 
                                onClick={onClose}
                                className="px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold border border-slate-700"
                            >
                                Reintentar luego
                            </button>
                        </div>
                    )}

                    {/* Scanning Overlay Viewfinder */}
                    {isScannerInitialized && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-[250px] h-[150px] border-2 border-emerald-500/50 rounded-2xl relative ring-[2000px] ring-black/40">
                                {/* Corners */}
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl translate-x-[-2px] translate-y-[-2px]"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl translate-x-[2px] translate-y-[-2px]"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl translate-x-[-2px] translate-y-[2px]"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-xl translate-x-[2px] translate-y-[2px]"></div>
                                
                                {/* Animated scan line */}
                                <div className="absolute left-0 right-0 h-[2px] bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse-y"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="p-6 bg-slate-900 text-center">
                    <p className="text-slate-400 text-xs font-medium">
                        Apunta al código de barras o QR para escanear automáticamente.
                    </p>
                    <div className="mt-4 flex justify-center gap-8 opacity-40">
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-lg">📦</span>
                            <span className="text-[8px] font-black uppercase tracking-tighter">Producto</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 text-emerald-500">
                            <span className="text-lg">✅</span>
                            <span className="text-[8px] font-black uppercase tracking-tighter">Detección</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-lg">📊</span>
                            <span className="text-[8px] font-black uppercase tracking-tighter">Automático</span>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes pulse-y {
                    0%, 100% { top: 0%; }
                    50% { top: 100%; }
                }
                .animate-pulse-y {
                    animation: pulse-y 2s infinite ease-in-out;
                }
                /* Hide html5-qrcode's default UI elements */
                #reader__scan_region {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                #reader video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    border-radius: 0 !important;
                }
                #reader__dashboard {
                    display: none !important;
                }
            `}</style>
        </div>
    );
}
