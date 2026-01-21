
import React from 'react';
import { Music, ListMusic, Search as SearchIcon } from 'lucide-react';
import { AppMode } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeMode: AppMode;
  setMode: (mode: AppMode) => void;
  isPerforming: boolean;
  isOnline: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeMode, setMode, isPerforming, isOnline }) => {
  if (isPerforming) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col bg-black text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50 pt-safe">
        <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.3)]">
              <Music className="text-zinc-950 w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">
                Cifra<span className="text-yellow-400">Turner</span>
              </h1>
              <div 
                className={`w-2 h-2 rounded-full transition-all duration-500 ${
                  isOnline 
                    ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' 
                    : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse'
                }`}
                title={isOnline ? 'Online' : 'Offline'}
              />
            </div>
          </div>
          
          <nav className="flex items-center gap-1">
            <button 
              onClick={() => setMode('SEARCH')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all active:scale-90 ${activeMode === 'SEARCH' ? 'bg-yellow-400 text-zinc-950 font-bold' : 'hover:bg-zinc-800 text-zinc-400'}`}
            >
              <SearchIcon size={20} />
              <span className="hidden xs:inline text-sm">Buscar</span>
            </button>
            <button 
              onClick={() => setMode('SETLISTS')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all active:scale-90 ${activeMode === 'SETLISTS' ? 'bg-yellow-400 text-zinc-950 font-bold' : 'hover:bg-zinc-800 text-zinc-400'}`}
            >
              <ListMusic size={20} />
              <span className="hidden xs:inline text-sm">Setlists</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8 pb-32 sm:pb-8">
        {children}
      </main>
    </div>
  );
};
