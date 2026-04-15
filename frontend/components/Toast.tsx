"use client";
import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300); // Wait for animation
    }, 4500); // Start exit slightly before context removes it

    return () => clearTimeout(timer);
  }, [onClose]);

  const typeStyles = {
    success: {
      icon: "✅",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      text: "text-emerald-400",
      glow: "shadow-emerald-500/20"
    },
    error: {
      icon: "❌",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      text: "text-red-400",
      glow: "shadow-red-500/20"
    },
    warning: {
      icon: "⚠️",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      text: "text-amber-400",
      glow: "shadow-amber-500/20"
    },
    info: {
      icon: "ℹ️",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      text: "text-blue-400",
      glow: "shadow-blue-500/20"
    }
  };

  const style = typeStyles[type];

  return (
    <div 
      className={`
        pointer-events-auto
        flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg transition-all duration-300
        ${style.bg} ${style.border} ${style.glow}
        ${isExiting ? 'opacity-0 translate-x-10 scale-95' : 'opacity-100 translate-x-0 scale-100'}
        animate-in fade-in slide-in-from-right-10
      `}
    >
      <span className="text-xl">{style.icon}</span>
      <p className={`text-sm font-medium ${style.text}`}>{message}</p>
      <button 
        onClick={() => {
          setIsExiting(true);
          setTimeout(onClose, 300);
        }}
        className="ml-4 opacity-40 hover:opacity-100 transition-opacity text-white"
      >
        ✕
      </button>
    </div>
  );
};

export default Toast;
