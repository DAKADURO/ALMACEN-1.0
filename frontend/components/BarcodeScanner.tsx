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
    const [cameras, setCameras] = useState<any[]>([]);
    const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);

    useEffect(() => {
        const findCameras = async () => {
            try {
                const devices = await Html5Qrcode.getCameras();
                if (devices && devices.length > 0) {
                    setCameras(devices);
                    const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('trasera'));
                    setCurrentCameraId(backCamera ? backCamera.id : devices[0].id);
                } else {
                    setError("No se detectaron cámaras en este dispositivo.");
                }
            } catch (err) {
                console.error("Error getting cameras", err);
                // If getCameras fails, it's often due to lack of permissions.
                // We'll show a button to manually trigger permission request via a direct start.
                setError("PERMISO_REQUERIDO");
            }
        };

        findCameras();

        return () => {
            stopScanner();
        };
    }, []);

    useEffect(() => {
        if (currentCameraId) {
            startScanner(currentCameraId);
        }
    }, [currentCameraId]);

    const startScanner = async (cameraId: string) => {
        try {
            if (scannerRef.current && scannerRef.current.isScanning) {
                await scannerRef.current.stop();
            }

            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            const config = { 
                fps: 30, 
                qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                    // QR codes are square, so a larger square box is better
                    const size = Math.floor(minEdge * 0.82);
                    return { width: size, height: size };
                },
                aspectRatio: undefined, 
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                },
                videoConstraints: {
                    focusMode: "continuous",
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    facingMode: "environment"
                }
            };

            await html5QrCode.start(
                cameraId,
                config as any,
                (decodedText) => {
                    onScanSuccess(decodedText);
                    stopScanner();
                },
                () => {} // Suppress errors
            );

            // Apply advanced constraints for focus if supported
            const applyFocus = async () => {
                try {
                    const video = document.querySelector("#reader video") as HTMLVideoElement;
                    if (video && video.srcObject) {
                        const stream = video.srcObject as MediaStream;
                        const runningTrack = stream.getVideoTracks()[0];
                        
                        if (runningTrack) {
                            const capabilities = runningTrack.getCapabilities() as any;
                            const constraints: any = { advanced: [] };
                            
                            if (capabilities.focusMode?.includes("continuous")) {
                                constraints.advanced.push({ focusMode: "continuous" });
                            }
                            
                            if (constraints.advanced.length > 0) {
                                await runningTrack.applyConstraints(constraints);
                            }
                        }
                    }
                } catch (e) {
                    console.warn("Advanced focus constraints failed", e);
                }
            };

            // Try multiple times as some browsers need time to stabilize the track
            setTimeout(applyFocus, 500);
            setTimeout(applyFocus, 1500);
            setTimeout(applyFocus, 3000);

            setIsScannerInitialized(true);
            setError(null);
        } catch (err) {
            console.error("Error starting scanner:", err);
            setError("No se pudo acceder a la cámara seleccionada. Asegúrate de dar los permisos necesarios.");
        }
    };

    const requestPermissionsManually = async () => {
        setError(null);
        try {
            // Trying to start with environment facing mode often triggers the permission prompt
            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;
            await html5QrCode.start(
                { facingMode: "environment" },
                { fps: 30, qrbox: 250 },
                (decodedText) => {
                    onScanSuccess(decodedText);
                    stopScanner();
                },
                () => {}
            );
            setIsScannerInitialized(true);
            // Refresh camera list now that we have permissions
            const devices = await Html5Qrcode.getCameras();
            setCameras(devices);
        } catch (err) {
            console.error("Manual permission request failed", err);
            setError("No se pudo obtener acceso a la cámara. Por favor, revisa la configuración de tu navegador.");
        }
    };

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
                    <div className="flex items-center gap-4">
                        {cameras.length > 1 && (
                            <select 
                                className="bg-slate-800 border-none text-[10px] text-emerald-400 font-bold px-2 py-1 rounded-lg outline-none max-w-[100px]"
                                value={currentCameraId || ""}
                                onChange={(e) => setCurrentCameraId(e.target.value)}
                            >
                                {cameras.map((cam, idx) => (
                                    <option key={cam.id} value={cam.id}>Lente {idx + 1}</option>
                                ))}
                            </select>
                        )}
                        <button 
                            onClick={()=>{ stopScanner().then(onClose); }} 
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all"
                        >
                            ✕
                        </button>
                    </div>
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

                    {error && error === "PERMISO_REQUERIDO" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center gap-5">
                            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center text-3xl animate-pulse">
                                📷
                            </div>
                            <div>
                                <h4 className="text-white font-bold mb-1">Permiso de Cámara</h4>
                                <p className="text-slate-400 text-[10px] leading-relaxed">Necesitamos acceso a tu cámara para escanear los códigos QR.</p>
                            </div>
                            <button 
                                onClick={requestPermissionsManually}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                            >
                                Autorizar Cámara
                            </button>
                        </div>
                    )}

                    {error && error !== "PERMISO_REQUERIDO" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center gap-4">
                            <span className="text-4xl">⚠️</span>
                            <div className="text-red-400 text-xs font-medium leading-relaxed">
                                {error}
                            </div>
                            <button 
                                onClick={onClose}
                                className="px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold border border-slate-700"
                            >
                                Cerrar
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
                        Apunta al código para escanear. Si no enfoca, busca una zona con más luz o prueba cambiando de lente arriba.
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
