
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { PerformanceView } from './components/PerformanceView';
import { fetchCifraClubHtml } from './services/chordService';
import { searchSongsExternal, SolrSong } from './services/searchService';
import { Song, AppMode, Setlist, KEYS } from './types';
import { 
  Search, Loader2, Plus, Play, Trash2, 
  Music, CheckCircle2, FolderOpen, 
  PlusCircle, AlertCircle, X, Save,
  ChevronUp, ChevronDown, ListPlus, AlertTriangle,
  Download, WifiOff, Wifi, FilePlus
} from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('SEARCH');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SolrSong[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [activeSetlistId, setActiveSetlistId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSetlistName, setNewSetlistName] = useState('');
  const [songToTargetSetlist, setSongToTargetSetlist] = useState<SolrSong | null>(null);
  const [setlistToDelete, setSetlistToDelete] = useState<Setlist | null>(null);
  const [isCreatingSetlistFromAdd, setIsCreatingSetlistFromAdd] = useState(false);
  
  const [performanceSongs, setPerformanceSongs] = useState<Song[]>([]);
  const [isPerforming, setIsPerforming] = useState(false);
  const [activePerformanceIndex, setActivePerformanceIndex] = useState(0);

  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' | 'info' } | null>(null);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('cifraturner_setlists_collection');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (Array.isArray(data)) {
          setSetlists(data);
          if (data.length > 0) setActiveSetlistId(data[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cifraturner_setlists_collection', JSON.stringify(setlists));
  }, [setlists]);

  const showToast = (msg: string, type: 'error' | 'success' | 'info' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      showToast("App instalado!", "success");
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      showToast("Busca indisponível offline.");
      return;
    }
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    try {
      const results = await searchSongsExternal(searchQuery);
      setSearchResults(results);
      if (results.length === 0) showToast("Nenhuma música encontrada.", "info");
    } catch (err) {
      showToast("Erro ao buscar músicas.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSongContent = async (solrSong: SolrSong): Promise<Song> => {
    const result = await fetchCifraClubHtml(solrSong.d, solrSong.u);
    return {
      id: `${solrSong.d}-${solrSong.u}-${Date.now()}`,
      title: solrSong.m,
      artist: solrSong.a,
      artistSlug: solrSong.d,
      songSlug: solrSong.u,
      content: result.html,
      originalContent: result.html,
      originalKeyIndex: result.originalKeyIndex,
      currentKeyIndex: -1,
      capo: 0
    };
  };

  const addToSetlist = async (solrSong: SolrSong, setlistId: string) => {
    if (!isOnline) {
      showToast("Conecte-se para baixar a cifra.");
      return;
    }
    
    setIsAdding(solrSong.u);
    try {
      const song = await loadSongContent(solrSong);
      setSetlists(prev => prev.map(sl => 
        sl.id === setlistId 
          ? { ...sl, songs: [...sl.songs, song] } 
          : sl
      ));
      showToast("Adicionado com sucesso!", "success");
    } catch (err) {
      showToast("Erro ao processar cifra.");
    } finally {
      setIsAdding(null);
      setSongToTargetSetlist(null);
      setIsCreatingSetlistFromAdd(false);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetlistName.trim() || !songToTargetSetlist) return;
    const newId = Date.now().toString();
    const newSl: Setlist = { id: newId, name: newSetlistName, songs: [], hideTabs: false };
    setSetlists(prev => [...prev, newSl]);
    setNewSetlistName('');
    await addToSetlist(songToTargetSetlist, newId);
    setActiveSetlistId(newId);
  };

  const handleCreateSetlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetlistName.trim()) return;
    const newSl: Setlist = { id: Date.now().toString(), name: newSetlistName, songs: [], hideTabs: false };
    setSetlists(prev => [...prev, newSl]);
    setActiveSetlistId(newSl.id);
    setNewSetlistName('');
    setShowCreateModal(false);
    showToast("Setlist criada!", "success");
  };

  const confirmDeleteSetlist = () => {
    if (!setlistToDelete) return;
    const idToDelete = setlistToDelete.id;
    setSetlists(prev => {
      const updated = prev.filter(sl => sl.id !== idToDelete);
      if (activeSetlistId === idToDelete) setActiveSetlistId(updated.length > 0 ? updated[0].id : null);
      return updated;
    });
    setSetlistToDelete(null);
  };

  const moveSong = (setlistId: string, songIndex: number, direction: 'up' | 'down') => {
    setSetlists(prev => prev.map(sl => {
      if (sl.id !== setlistId) return sl;
      const newSongs = [...sl.songs];
      const targetIndex = direction === 'up' ? songIndex - 1 : songIndex + 1;
      if (targetIndex < 0 || targetIndex >= newSongs.length) return sl;
      const temp = newSongs[songIndex];
      newSongs[songIndex] = newSongs[targetIndex];
      newSongs[targetIndex] = temp;
      return { ...sl, songs: newSongs };
    }));
  };

  const previewSong = async (solrSong: SolrSong) => {
    if (!isOnline) {
      showToast("Conecte-se para carregar a cifra.");
      return;
    }
    const songId = solrSong.u;
    setIsPreviewing(songId);
    try {
      const song = await loadSongContent(solrSong);
      setPerformanceSongs([song]);
      setActivePerformanceIndex(0);
      setIsPerforming(true);
    } catch (err) {
      showToast("Erro ao abrir prévia.");
    } finally {
      setIsPreviewing(null);
    }
  };

  const removeFromSetlist = (setlistId: string, songId: string) => {
    setSetlists(prev => prev.map(sl => 
      sl.id === setlistId ? { ...sl, songs: sl.songs.filter(s => s.id !== songId) } : sl
    ));
  };

  const handleSongUpdate = (songId: string, updatedContent: string, keyIndex: number, capo?: number) => {
    setPerformanceSongs(prev => prev.map(s => s.id === songId ? { ...s, content: updatedContent, currentKeyIndex: keyIndex, capo: capo ?? s.capo } : s));
    
    if (activeSetlistId) {
      setSetlists(prev => prev.map(sl => ({
        ...sl,
        songs: sl.songs.map(s => s.id === songId ? { ...s, content: updatedContent, currentKeyIndex: keyIndex, capo: capo ?? s.capo } : s)
      })));
    }
  };

  const handleSetlistPreferenceUpdate = (hideTabs: boolean) => {
    if (!activeSetlistId) return;
    setSetlists(prev => prev.map(sl => 
      sl.id === activeSetlistId ? { ...sl, hideTabs } : sl
    ));
  };

  const startFullPerformance = (setlist: Setlist, index: number = 0) => {
    if (setlist.songs.length === 0) return showToast("A lista está vazia.");
    setPerformanceSongs(setlist.songs);
    setActivePerformanceIndex(index);
    setIsPerforming(true);
  };

  const currentActiveSetlist = setlists.find(sl => sl.id === activeSetlistId);

  return (
    <Layout activeMode={mode} setMode={setMode} isPerforming={isPerforming} isOnline={isOnline}>
      {deferredPrompt && !isPerforming && (
        <div className="fixed bottom-[env(safe-area-inset-bottom,1.5rem)] left-6 z-[80]">
           <button 
             onClick={handleInstall}
             className="bg-yellow-400 text-zinc-950 px-4 py-2.5 rounded-full font-bold text-[10px] flex items-center gap-2 shadow-2xl active:scale-90 transition-transform uppercase tracking-wider"
           >
             <Download size={14} /> Instalar App
           </button>
        </div>
      )}

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

      {showCreateModal && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border-t sm:border border-zinc-800 p-8 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black tracking-tight uppercase">Nova Lista</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2"><X size={24} /></button>
            </div>
            <form onSubmit={handleCreateSetlist} className="space-y-6">
              <input 
                autoFocus
                type="text"
                placeholder="Ex: Show de Sexta"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder:text-zinc-600"
                value={newSetlistName}
                onChange={(e) => setNewSetlistName(e.target.value)}
              />
              <button type="submit" className="w-full bg-yellow-400 text-zinc-950 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all">Salvar Lista</button>
            </form>
          </div>
        </div>
      )}

      {songToTargetSetlist && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border-t sm:border border-zinc-800 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-black tracking-tight uppercase">Adicionar à Lista</h3>
               <button onClick={() => { setSongToTargetSetlist(null); setIsCreatingSetlistFromAdd(false); }} className="p-2"><X size={24}/></button>
            </div>
            
            {!isCreatingSetlistFromAdd ? (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto hide-scrollbar">
                <button onClick={() => setIsCreatingSetlistFromAdd(true)} className="w-full p-5 rounded-2xl border border-dashed border-yellow-400/30 text-yellow-400 flex items-center justify-center gap-3 active:bg-yellow-400/5 transition-all">
                  <PlusCircle size={20} /> <span className="font-bold text-sm uppercase tracking-wider">Nova Setlist</span>
                </button>
                {setlists.map(sl => (
                  <button key={sl.id} onClick={() => addToSetlist(songToTargetSetlist, sl.id)} className="w-full p-5 rounded-2xl border border-zinc-800 text-left active:bg-zinc-800 transition-all flex items-center justify-between group">
                    <span className="font-bold truncate">{sl.name}</span>
                    <span className="text-[10px] text-zinc-600 font-black">{sl.songs.length}</span>
                  </button>
                ))}
                {setlists.length === 0 && <p className="text-center py-6 text-zinc-600 italic text-sm">Crie sua primeira lista acima.</p>}
              </div>
            ) : (
              <form onSubmit={handleCreateAndAdd} className="space-y-5 animate-in slide-in-from-bottom duration-200">
                <input 
                  autoFocus
                  type="text"
                  placeholder="Nome da nova lista..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  value={newSetlistName}
                  onChange={(e) => setNewSetlistName(e.target.value)}
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsCreatingSetlistFromAdd(false)} className="flex-1 bg-zinc-800 text-zinc-400 py-4 rounded-2xl font-bold">Voltar</button>
                  <button type="submit" className="flex-1 bg-yellow-400 text-zinc-950 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Criar & Add</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {isPerforming ? (
        <PerformanceView 
          songs={performanceSongs} 
          startIndex={activePerformanceIndex} 
          initialHideTabs={currentActiveSetlist?.hideTabs}
          onClose={() => setIsPerforming(false)} 
          onSongUpdate={handleSongUpdate}
          onSetlistPreferenceUpdate={handleSetlistPreferenceUpdate}
          onError={(msg) => showToast(msg)}
        />
      ) : (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
          {mode === 'SEARCH' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tighter uppercase">Busca</h2>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Catálogo Cifra Club</p>
              </div>
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    disabled={!isOnline}
                    type="text"
                    placeholder={isOnline ? "Título ou artista..." : "Offline"}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-yellow-400 text-white placeholder:text-zinc-600"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button disabled={isLoading || !isOnline} className="bg-yellow-400 text-zinc-950 w-14 sm:w-20 flex items-center justify-center rounded-2xl font-bold active:scale-90 transition-all disabled:opacity-30">
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Search size={22} />}
                </button>
              </form>
              <div className="grid gap-3">
                {searchResults.map((song) => (
                  <div key={`${song.d}-${song.u}`} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between group active:bg-zinc-800/50 transition-colors" onClick={() => previewSong(song)}>
                    <div className="flex items-center gap-4 min-w-0 pr-4">
                      <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 shrink-0">
                        {isPreviewing === song.u ? <Loader2 className="animate-spin" size={20} /> : <Music size={20} />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-base truncate leading-tight group-hover:text-yellow-400">{song.m}</h3>
                        <p className="text-zinc-600 text-[10px] font-bold uppercase truncate tracking-wider">{song.a}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSongToTargetSetlist(song); }} 
                      className="w-12 h-12 rounded-xl bg-zinc-800 text-yellow-400 flex items-center justify-center active:bg-yellow-400 active:text-zinc-950 shrink-0 transition-all"
                    >
                      {isAdding === song.u ? <Loader2 className="animate-spin" size={18} /> : <ListPlus size={20} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mode === 'SETLISTS' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase">Setlists</h2>
                  <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">{setlists.length} listas no arquivo</p>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="bg-yellow-400 text-zinc-950 w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-lg">
                  <PlusCircle size={24} />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {setlists.map((sl) => (
                  <div key={sl.id} className={`p-4 rounded-2xl border transition-all active:scale-95 cursor-pointer relative ${activeSetlistId === sl.id ? 'border-yellow-400 bg-yellow-400/5 shadow-[0_0_15px_rgba(250,204,21,0.1)]' : 'border-zinc-800 bg-zinc-900/30'}`} onClick={() => setActiveSetlistId(sl.id)}>
                    <div className="flex items-center justify-between mb-2">
                       <FolderOpen size={16} className={activeSetlistId === sl.id ? 'text-yellow-400' : 'text-zinc-700'} />
                       {activeSetlistId === sl.id && <button onClick={(e) => { e.stopPropagation(); setSetlistToDelete(sl); }} className="text-zinc-700 hover:text-red-500"><Trash2 size={14} /></button>}
                    </div>
                    <h3 className="font-bold text-sm truncate mb-1">{sl.name}</h3>
                    <div className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">{sl.songs.length} Músicas</div>
                  </div>
                ))}
              </div>

              {currentActiveSetlist && (
                <div className="mt-8 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-yellow-400 p-6 rounded-3xl flex items-center justify-between shadow-[0_10px_30px_rgba(250,204,21,0.2)]">
                    <div className="text-zinc-950 overflow-hidden pr-4">
                      <h3 className="text-xl font-black uppercase tracking-tight truncate leading-none mb-1">{currentActiveSetlist.name}</h3>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Pronto para o palco</p>
                    </div>
                    <button onClick={() => startFullPerformance(currentActiveSetlist)} className="w-14 h-14 bg-black text-yellow-400 rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform shrink-0">
                      <Play size={24} fill="currentColor" />
                    </button>
                  </div>

                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl overflow-hidden divide-y divide-zinc-800/50">
                    {currentActiveSetlist.songs.map((song, idx) => (
                      <div key={`${song.id}`} className="p-4 flex items-center gap-4 active:bg-zinc-800/50 transition-colors">
                        <div className="flex flex-col items-center gap-1 w-6 shrink-0">
                            <button onClick={() => moveSong(currentActiveSetlist.id, idx, 'up')} className="text-zinc-700" disabled={idx === 0}><ChevronUp size={14} /></button>
                            <span className="text-zinc-700 text-[9px] font-black">{idx + 1}</span>
                            <button onClick={() => moveSong(currentActiveSetlist.id, idx, 'down')} className="text-zinc-700" disabled={idx === currentActiveSetlist.songs.length - 1}><ChevronDown size={14} /></button>
                        </div>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => startFullPerformance(currentActiveSetlist, idx)}>
                          <div className="flex items-center gap-2">
                             <p className="font-bold text-base truncate">{song.title}</p>
                             <div className="flex gap-1">
                               {song.currentKeyIndex !== -1 && (
                                 <span className="text-[9px] bg-yellow-400/10 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-400/20 font-black">
                                   {KEYS.find(k => k.value === song.currentKeyIndex)?.label}
                                 </span>
                               )}
                               {song.capo && song.capo > 0 && (
                                 <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700 font-black">
                                   Capo {song.capo}
                                 </span>
                               )}
                             </div>
                          </div>
                          <p className="text-zinc-600 text-[10px] font-bold uppercase truncate">{song.artist}</p>
                        </div>
                        <button onClick={() => removeFromSetlist(currentActiveSetlist.id, song.id)} className="p-3 text-zinc-700 active:text-red-500 shrink-0"><Trash2 size={18} /></button>
                      </div>
                    ))}
                    {currentActiveSetlist.songs.length === 0 && (
                      <div className="p-12 text-center text-zinc-600">
                        <Music size={40} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold text-sm uppercase tracking-widest">Lista Vazia</p>
                        <p className="text-xs mt-1">Adicione músicas pela busca.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {setlistToDelete && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-zinc-900 p-8 rounded-3xl text-center border border-red-500/20 max-w-xs w-full shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
               <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black mb-2 uppercase tracking-tight">Apagar lista?</h3>
            <p className="text-zinc-500 text-sm mb-8 leading-relaxed">Isso removerá "{setlistToDelete.name}" permanentemente.</p>
            <div className="flex flex-col gap-2">
              <button onClick={confirmDeleteSetlist} className="w-full bg-red-500 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95">Excluir</button>
              <button onClick={() => setSetlistToDelete(null)} className="w-full bg-zinc-800 py-4 rounded-2xl font-bold text-zinc-400">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
