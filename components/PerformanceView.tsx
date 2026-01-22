
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Maximize2, Minimize2, Loader2, Settings, Music, WifiOff, EyeOff, Eye, Anchor, ListPlus } from 'lucide-react';
import { Song, KEYS } from '../types';
import { transposeHtml } from '../services/transposerService';

interface PerformanceViewProps {
  songs: Song[];
  startIndex: number;
  initialHideTabs?: boolean;
  onClose: () => void;
  onSongUpdate?: (songId: string, updatedContent: string, keyIndex: number, capo?: number) => void;
  onSetlistPreferenceUpdate?: (hideTabs: boolean) => void;
  onAddToSetlist?: () => void;
  onError?: (msg: string) => void;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({ 
  songs, 
  startIndex, 
  initialHideTabs = false,
  onClose, 
  onSongUpdate, 
  onSetlistPreferenceUpdate,
  onAddToSetlist,
  onError 
}) => {
  const [currentSongIndex, setCurrentSongIndex] = useState(startIndex);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [viewHeight, setViewHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChangingKey, setIsChangingKey] = useState(false);
  const [hideTabs, setHideTabs] = useState(initialHideTabs);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentSong = songs[currentSongIndex];

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const calculatePages = useCallback(() => {
    if (!contentRef.current || !containerRef.current) return;
    
    const cH = contentRef.current.scrollHeight;
    const vH = containerRef.current.clientHeight;
    
    if (vH > 0) {
      setViewHeight(vH);
      setContentHeight(cH);
      const pages = Math.max(1, Math.ceil((cH - 10) / vH));
      setTotalPages(pages);
      setCurrentPage(prev => Math.min(prev, pages - 1));
    }
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(calculatePages);
    });

    if (contentRef.current) observer.observe(contentRef.current);
    if (containerRef.current) observer.observe(containerRef.current);
    
    calculatePages();
    return () => observer.disconnect();
  }, [calculatePages, currentSong.content, hideTabs]);

  useEffect(() => {
    setCurrentPage(0);
    setIsMenuOpen(false);
  }, [currentSongIndex]);

  const handleNext = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    } else if (currentSongIndex < songs.length - 1) {
      setCurrentPage(0);
      setCurrentSongIndex(prev => prev + 1);
    }
  }, [currentPage, totalPages, currentSongIndex, songs.length]);

  const handlePrev = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    } else if (currentSongIndex > 0) {
      setCurrentSongIndex(prev => prev - 1);
      setCurrentPage(0);
    }
  }, [currentPage, currentSongIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        if (isMenuOpen) setIsMenuOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose, isMenuOpen]);

  const handleKeyChange = (newKeyIndex: number) => {
    if (newKeyIndex === currentSong.currentKeyIndex) return;
    setIsChangingKey(true);
    setTimeout(() => {
      try {
        let newHtml = currentSong.originalContent;
        if (newKeyIndex !== -1) {
          const fromIdx = currentSong.originalKeyIndex !== -1 ? currentSong.originalKeyIndex : 0;
          newHtml = transposeHtml(currentSong.originalContent, fromIdx, newKeyIndex);
        }
        if (onSongUpdate) onSongUpdate(currentSong.id, newHtml, newKeyIndex, currentSong.capo);
        setIsMenuOpen(false);
        setCurrentPage(0);
      } catch (err) {
        onError?.("Erro ao transpor.");
      } finally {
        setIsChangingKey(false);
      }
    }, 50);
  };

  const handleCapoChange = (capo: number) => {
    if (onSongUpdate) {
      onSongUpdate(currentSong.id, currentSong.content, currentSong.currentKeyIndex, capo);
    }
  };

  const toggleHideTabs = () => {
    const newVal = !hideTabs;
    setHideTabs(newVal);
    if (onSetlistPreferenceUpdate) {
      onSetlistPreferenceUpdate(newVal);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const getTranslationY = () => {
    const standardOffset = currentPage * viewHeight;
    const maxOffset = Math.max(0, contentHeight - viewHeight);
    if (currentPage === totalPages - 1 && totalPages > 1) {
      return -maxOffset;
    }
    return -standardOffset;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col font-mono overflow-hidden select-none">
      <div className="pt-safe bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900 shrink-0">
        <div className="h-14 px-4 flex items-center justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-yellow-400 truncate tracking-tight uppercase">{currentSong.title}</h2>
              {currentSong.capo && currentSong.capo > 0 ? (
                <span className="bg-zinc-800 text-zinc-400 text-[8px] px-1 py-0.5 rounded border border-zinc-700 font-black shrink-0">CAPO {currentSong.capo}</span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-sans tracking-wider font-semibold uppercase">
              <span className="truncate">{currentSong.artist}</span>
              {!isOnline && <WifiOff size={10} className="text-red-500 animate-pulse" />}
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
             <div className="flex flex-col items-end mr-3 font-sans text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                <span>Música {currentSongIndex + 1}/{songs.length}</span>
                <span className="text-yellow-400/50">Pág {currentPage + 1}/{totalPages}</span>
             </div>
             {onAddToSetlist && (
                <button onClick={onAddToSetlist} className="w-10 h-10 flex items-center justify-center text-zinc-400 active:text-yellow-400 hover:text-white">
                  <ListPlus size={20} />
                </button>
             )}
             <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`w-10 h-10 flex items-center justify-center transition-colors ${isMenuOpen ? 'text-yellow-400' : 'text-zinc-400 active:text-yellow-400'}`}>
               <Settings size={20} />
             </button>
             <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-zinc-400 active:text-red-500">
               <X size={22} />
             </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="absolute inset-0 z-[110] bg-black/80 flex items-end sm:items-start sm:justify-end sm:p-4" onClick={() => setIsMenuOpen(false)}>
          <div className="w-full sm:w-80 bg-zinc-900 rounded-t-3xl sm:rounded-2xl border-t sm:border border-zinc-800 p-6 animate-in slide-in-from-bottom duration-300 overflow-y-auto max-h-[90vh] hide-scrollbar" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
               <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Settings size={12} /> Ajustes
               </h4>
               <button onClick={() => setIsMenuOpen(false)} className="p-2 -mr-2"><X size={20} className="text-zinc-500" /></button>
            </div>

            <div className="mb-6 p-4 bg-zinc-800/50 rounded-2xl flex items-center justify-between border border-zinc-800">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hideTabs ? 'bg-yellow-400/20 text-yellow-400' : 'bg-zinc-700 text-zinc-500'}`}>
                  {hideTabs ? <EyeOff size={16} /> : <Eye size={16} />}
                </div>
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-tight">Ocultar Tablaturas</p>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Salvo nesta setlist</p>
                </div>
              </div>
              <button 
                onClick={toggleHideTabs}
                className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${hideTabs ? 'bg-yellow-400' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${hideTabs ? 'left-7 shadow-sm' : 'left-1'}`} />
              </button>
            </div>
            
            <div className="mb-4 flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
              <Anchor size={12} /> Capotraste (Traste)
            </div>
            <div className="flex flex-wrap gap-2 mb-8">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((val) => (
                <button
                  key={val}
                  onClick={() => handleCapoChange(val)}
                  className={`w-10 h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                    (currentSong.capo || 0) === val ? 'bg-yellow-400 text-zinc-950 shadow-lg scale-110' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {val === 0 ? 'Off' : val}
                </button>
              ))}
            </div>

            <div className="mb-4 flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
              <Music size={12} /> Tom da Música
            </div>
            <div className="grid grid-cols-4 gap-2">
              {KEYS.map((k) => (
                <button
                  key={k.value}
                  onClick={() => handleKeyChange(k.value)}
                  disabled={isChangingKey}
                  className={`py-3 rounded-xl text-xs font-bold transition-all ${
                    currentSong.currentKeyIndex === k.value ? 'bg-yellow-400 text-zinc-950 shadow-lg' : 'bg-zinc-800 text-zinc-400'
                  } disabled:opacity-30 active:scale-95`}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <p className="mt-6 text-[9px] text-zinc-600 text-center font-bold uppercase tracking-widest">Sincronizado com LocalStorage</p>
          </div>
        </div>
      )}

      <div ref={containerRef} className="flex-1 relative bg-black overflow-hidden flex justify-center">
        <div 
          ref={contentRef}
          className={`w-full max-w-5xl transition-transform duration-500 ease-in-out chord-content px-3 sm:px-10 ${hideTabs ? 'hide-tabs' : ''}`}
          style={{ transform: `translateY(${getTranslationY()}px)` }}
          dangerouslySetInnerHTML={{ __html: currentSong.content }}
        />
        
        <div className="absolute inset-y-0 left-0 w-1/4 cursor-pointer z-10 active:bg-white/5" onClick={handlePrev} />
        <div className="absolute inset-y-0 right-0 w-1/4 cursor-pointer z-10 active:bg-white/5" onClick={handleNext} />
        
        {isChangingKey && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center z-50">
            <Loader2 className="animate-spin text-yellow-400 mb-4" size={48} />
            <p className="text-yellow-400 font-bold tracking-widest text-[10px] uppercase">Ajustando tom...</p>
          </div>
        )}
      </div>

      <style>{`
        .chord-content {
          font-family: 'JetBrains Mono', monospace;
          font-size: 1.15rem;
          color: #ffffff !important;
          white-space: pre-wrap !important;
          line-height: 1.5;
          word-wrap: break-word;
          width: 100%;
        }
        
        .chord-content.hide-tabs .tab-block,
        .chord-content.hide-tabs .tablatura,
        .chord-content.hide-tabs .tabs,
        .chord-content.hide-tabs .chord-tabs,
        .chord-content.hide-tabs [class*="tab-"],
        .chord-content.hide-tabs pre:empty {
          display: none !important;
          height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          position: absolute !important;
          overflow: hidden !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }

        @media (min-width: 640px) {
          .chord-content { 
            font-size: 1.6rem; 
            line-height: 1.8; 
            white-space: pre-wrap !important;
          }
        }
        .chord-content * { color: inherit; background: transparent !important; }
        .chord-content pre {
          white-space: inherit !important;
          background: transparent !important;
          margin: 0; padding: 0;
          width: 100%;
          display: block;
        }
        .chord-content .chord-highlight {
          color: #facc15 !important;
          font-weight: 800 !important;
          text-shadow: 0 0 10px rgba(250, 204, 21, 0.4);
          display: inline-block;
        }
      `}</style>

      <div className="pb-safe bg-zinc-950 border-t border-zinc-900 shrink-0">
        <div className="h-10 sm:h-12 px-4 flex items-center justify-between text-[10px] font-sans text-zinc-600 font-bold uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1 active:text-white" onClick={handlePrev}><ChevronLeft size={12} /> Voltar</button>
            <button className="flex items-center gap-1 active:text-white" onClick={handleNext}>Avançar <ChevronRight size={12} /></button>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={toggleFullscreen} className="text-zinc-500 hover:text-white">
                {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
             </button>
             {currentSongIndex < songs.length - 1 && (
               <span className="text-yellow-400/80 truncate max-w-[120px]">Prox: {songs[currentSongIndex + 1].title}</span>
             )}
          </div>
        </div>
        <div className="h-1 w-full bg-zinc-900">
          <div 
            className="h-full bg-yellow-400 transition-all duration-300 shadow-[0_0_10px_#facc15]"
            style={{ width: `${((currentSongIndex + (currentPage + 1) / totalPages) / songs.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
