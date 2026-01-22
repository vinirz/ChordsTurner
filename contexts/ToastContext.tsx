import React, { createContext, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ToastContextType {
  showToast: (msg: string, type?: 'error' | 'success' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'error' | 'success' | 'info' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm px-4 py-3 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 shadow-2xl border ${
          toast.type === 'error' ? 'bg-red-950/90 border-red-500/50 text-red-200' : 
          toast.type === 'info' ? 'bg-zinc-900/90 border-zinc-700 text-white' : 'bg-green-950/90 border-green-500/50 text-green-200'
        }`}>
          <div className="shrink-0">{toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}</div>
          <span className="font-bold text-xs flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="p-1"><X size={14} /></button>
        </div>
      )}
    </ToastContext.Provider>
  );
};
