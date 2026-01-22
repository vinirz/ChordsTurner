import React, { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Search, Loader2, Music, ListPlus, PlusCircle, X } from 'lucide-react';
import { searchSongsExternal, SolrSong } from '../../services/searchService';
import { useSetlists } from '../../contexts/SetlistContext';
import { useToast } from '../../contexts/ToastContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const Route = createFileRoute('/_layout/')({
  component: Index,
});

function Index() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SolrSong[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  
  // States for "Add to Setlist Mockup" - reusing same modal logic
  const [songToTargetSetlist, setSongToTargetSetlist] = useState<SolrSong | null>(null);
  const [newSetlistName, setNewSetlistName] = useState('');
  const [isCreatingSetlistFromAdd, setIsCreatingSetlistFromAdd] = useState(false);

  const { addToSetlist, setlists, createSetlist } = useSetlists();
  const { showToast } = useToast();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();

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

  const handleAddToSetlist = async (solrSong: SolrSong, setlistId: string) => {
     setIsAdding(solrSong.u);
     try {
       await addToSetlist(solrSong, setlistId, isOnline);
       showToast("Adicionado com sucesso!", "success");
     } catch(e: any) {
        showToast(e.message);
     } finally {
       setIsAdding(null);
       setSongToTargetSetlist(null);
       setIsCreatingSetlistFromAdd(false);
     }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newSetlistName.trim() || !songToTargetSetlist) return;
      const newSl = createSetlist(newSetlistName);
      setNewSetlistName('');
      await handleAddToSetlist(songToTargetSetlist, newSl.id);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-black tracking-tighter uppercase">Busca</h2>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Catálogo Cifra Club</p>
      </div>
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <Input
            disabled={!isOnline}
            type="text"
            placeholder={isOnline ? "Título ou artista..." : "Offline"}
            className="w-full bg-zinc-900/50 border-zinc-800 rounded-2xl py-6 pl-12 pr-4 text-base focus-visible:ring-yellow-400 focus-visible:ring-2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button 
          disabled={isLoading || !isOnline} 
          className="bg-yellow-400 hover:bg-yellow-500 text-zinc-950 w-14 sm:w-20 h-auto rounded-2xl"
          type="submit"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Search size={22} />}
        </Button>
      </form>
      <div className="grid gap-3">
        {searchResults.map((song, idx) => (
          <div 
            key={`${song.d}-${song.u}`} 
            style={{ animationDelay: `${idx * 50}ms` }}
            className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between group active:bg-zinc-800/50 transition-all duration-300 min-w-0 hover-scale-sm hover:border-yellow-400/30 hover:shadow-lg hover:shadow-yellow-400/5 animate-in-fade-slide opacity-0"
          >
            <div 
              className="flex items-center gap-4 min-w-0 pr-4 flex-1 cursor-pointer"
              onClick={() => navigate({ 
                to: '/song/$artistSlug/$songSlug', 
                params: { artistSlug: song.d, songSlug: song.u },
                search: { title: song.m, artist: song.a } 
              } as any)}
            >
              <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 shrink-0">
                <Music size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-base truncate leading-tight group-hover:text-yellow-400">{song.m}</h3>
                <p className="text-zinc-600 text-[10px] font-bold uppercase truncate tracking-wider">{song.a}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="icon"
              onClick={(e) => { e.stopPropagation(); setSongToTargetSetlist(song); }} 
              className="w-12 h-12 rounded-xl bg-zinc-800 text-yellow-400 hover:bg-yellow-400 hover:text-zinc-950 shrink-0"
            >
              {isAdding === song.u ? <Loader2 className="animate-spin" size={18} /> : <ListPlus size={20} />}
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!songToTargetSetlist} onOpenChange={(open) => { if(!open) { setSongToTargetSetlist(null); setIsCreatingSetlistFromAdd(false); } }}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md w-[95%] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight uppercase">Adicionar à Lista</DialogTitle>
          </DialogHeader>
          
            {!isCreatingSetlistFromAdd ? (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto hide-scrollbar mt-2">
                <Button variant="outline" onClick={() => setIsCreatingSetlistFromAdd(true)} className="w-full py-6 rounded-2xl border-dashed border-yellow-400/30 text-yellow-400 hover:text-yellow-500 hover:bg-yellow-400/5 justify-start gap-3">
                  <PlusCircle size={20} /> <span className="font-bold text-sm uppercase tracking-wider">Nova Setlist</span>
                </Button>
                {setlists.map(sl => (
                  <Button variant="ghost" key={sl.id} onClick={() => handleAddToSetlist(songToTargetSetlist!, sl.id)} className="w-full py-6 rounded-2xl border border-zinc-800 hover:bg-zinc-800 justify-between group h-auto">
                    <span className="font-bold truncate">{sl.name}</span>
                    <span className="text-[10px] text-zinc-600 font-black">{sl.songs.length}</span>
                  </Button>
                ))}
                {setlists.length === 0 && <p className="text-center py-6 text-zinc-600 italic text-sm">Crie sua primeira lista acima.</p>}
              </div>
            ) : (
              <form onSubmit={handleCreateAndAdd} className="space-y-5 animate-in slide-in-from-bottom duration-200 mt-2">
                <Input
                  autoFocus
                  type="text"
                  placeholder="Nome da nova lista..."
                  className="bg-zinc-800 border-zinc-700 rounded-2xl py-6 text-white focus-visible:ring-yellow-400"
                  value={newSetlistName}
                  onChange={(e) => setNewSetlistName(e.target.value)}
                />
                <div className="flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => setIsCreatingSetlistFromAdd(false)} className="flex-1 py-6 rounded-2xl font-bold bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white">Voltar</Button>
                  <Button type="submit" className="flex-1 py-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg bg-yellow-400 hover:bg-yellow-500 text-zinc-950">Criar & Add</Button>
                </div>
              </form>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
