import React, { useState, useEffect } from 'react';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { ToastProvider } from '../contexts/ToastContext';
import { SetlistProvider } from '../contexts/SetlistContext';
import { Download } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Button } from '@/components/ui/button';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Expose showToast to window or use a context (simplified for now to just be local or we can export a hook later if needed, 
  // but for refactor speed, let's keep it here or maybe create a ToastContext? 
  // Actually, to avoid over-engineering, I'll keep the toast logic here but we might lose the ability to trigger it from deep components easily without a context.
  // Let's create a simple ToastContext to be safe and cleaner.)
  
  // Wait, I can't easily add another file in the same step without breaking flow. 
  // Let's implement a simple ToastContext inline or in a separate file in the next steps if needed.
  // For now, I'll pass a dummy context or just implement the UI here and maybe use a library later?
  // No, the user wants the existing functionality.
  // I will create a ToastContext in the next step and wrap here. For now, I will just put the UI here and create the Context file next.
  
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <ToastProvider>
      <SetlistProvider>
        <Outlet />
        
        {deferredPrompt && (
          <div className="fixed bottom-[env(safe-area-inset-bottom,1.5rem)] left-6 z-[80]">
             <Button 
               onClick={handleInstall}
               className="bg-yellow-400 hover:bg-yellow-500 text-zinc-950 rounded-full font-bold text-[10px] shadow-2xl active:scale-90 transition-transform uppercase tracking-wider h-auto py-2.5 px-4"
             >
               <Download size={14} className="mr-2" /> Instalar App
             </Button>
          </div>
        )}

      </SetlistProvider>
    </ToastProvider>
  );
}
