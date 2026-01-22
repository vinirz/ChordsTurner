import React, { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PerformanceView } from '../components/PerformanceView';
import { fetchCifraClubHtml } from '../services/chordService';
import { Song } from '../types';
import { Loader2, PlusCircle, ListPlus } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useSetlists } from '../contexts/SetlistContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SongSearch {
  title?: string;
  artist?: string;
  index?: number;
}

export const Route = createFileRoute('/song/$artistSlug/$songSlug')({
  component: SingleSongPage,
  validateSearch: (search: Record<string, unknown>): SongSearch => {
    return {
      title: search.title as string,
      artist: search.artist as string,
      index: Number(search.index) || 0,
    };
  },
});

function SingleSongPage() {
  const { artistSlug, songSlug } = Route.useParams();
  const { title, artist } = Route.useSearch();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setlists, createSetlist, saveSongToSetlist } = useSetlists();

  const [song, setSong] = useState<Song | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add to Setlist State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSetlistName, setNewSetlistName] = useState('');
  const [isCreatingSetlist, setIsCreatingSetlist] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSong = async () => {
      try {
        setIsLoading(true);
        const result = await fetchCifraClubHtml(artistSlug, songSlug);
        
        if (!isMounted) return;

        const newSong: Song = {
          id: `${artistSlug}-${songSlug}-single`,
          title: title || 'Música',
          artist: artist || 'Artista',
          artistSlug,
          songSlug,
          content: result.html,
          originalContent: result.html, // Initially same
          originalKeyIndex: result.originalKeyIndex,
          currentKeyIndex: -1, // Original key
          capo: 0,
        };
        setSong(newSong);

      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setError("Erro ao carregar a cifra.");
        showToast("Erro ao carregar a cifra.", "error");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadSong();

    return () => {
      isMounted = false;
    };
  }, [artistSlug, songSlug, title, artist, showToast]);

  const handleSongUpdate = (songId: string, updatedContent: string, keyIndex: number, capo?: number) => {
      if (!song) return;
      setSong({
          ...song,
          content: updatedContent,
          currentKeyIndex: keyIndex,
          capo: capo
      });
  };

  const handleSaveToSetlist = (setlistId: string) => {
    if (!song) return;
    saveSongToSetlist(song, setlistId);
    showToast("Salvo na setlist!", "success");
    setShowAddModal(false);
    setIsCreatingSetlist(false);
  };

  const handleCreateAndSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetlistName.trim() || !song) return;
    const newSl = createSetlist(newSetlistName);
    setNewSetlistName('');
    handleSaveToSetlist(newSl.id);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-4">
        <Loader2 className="animate-spin text-yellow-400" size={48} />
        <div className="text-center">
             <h2 className="text-xl font-bold uppercase tracking-tight">{title || 'Carregando...'}</h2>
             <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">{artist || 'Aguarde'}</p>
        </div>
      </div>
    );
  }

  if (error || !song) {
     return (
         <div className="flex items-center justify-center min-h-screen bg-black text-white">
             <div className="text-center">
                 <p className="mb-4 text-red-500 font-bold">{error || 'Música não encontrada'}</p>
                 <button onClick={() => navigate({ to: '/' })} className="bg-yellow-400 text-black px-6 py-2 rounded-full font-bold">Voltar</button>
             </div>
         </div>
     )
  }

  return (
    <>
      <PerformanceView
        songs={[song]}
        startIndex={0}
        initialHideTabs={false}
        onClose={() => navigate({ to: '/' })} // Or history.back()
        onSongUpdate={handleSongUpdate}
        onAddToSetlist={() => setShowAddModal(true)}
        onError={(msg) => showToast(msg)}
      />

      <Dialog open={showAddModal} onOpenChange={(open) => { if(!open) { setShowAddModal(false); setIsCreatingSetlist(false); } }}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md w-[95%] rounded-3xl p-6 z-[120]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight uppercase">Salvar na Lista</DialogTitle>
          </DialogHeader>
          
            {!isCreatingSetlist ? (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto hide-scrollbar mt-2">
                <Button variant="outline" onClick={() => setIsCreatingSetlist(true)} className="w-full py-6 rounded-2xl border-dashed border-yellow-400/30 text-yellow-400 hover:text-yellow-500 hover:bg-yellow-400/5 justify-start gap-3">
                  <PlusCircle size={20} /> <span className="font-bold text-sm uppercase tracking-wider">Nova Setlist</span>
                </Button>
                {setlists.map(sl => (
                  <Button variant="ghost" key={sl.id} onClick={() => handleSaveToSetlist(sl.id)} className="w-full py-6 rounded-2xl border border-zinc-800 hover:bg-zinc-800 justify-between group h-auto">
                    <span className="font-bold truncate text-zinc-100">{sl.name}</span>
                    <span className="text-[10px] text-zinc-600 font-black">{sl.songs.length}</span>
                  </Button>
                ))}
                {setlists.length === 0 && <p className="text-center py-6 text-zinc-600 italic text-sm">Crie sua primeira lista acima.</p>}
              </div>
            ) : (
              <form onSubmit={handleCreateAndSave} className="space-y-5 animate-in slide-in-from-bottom duration-200 mt-2">
                <Input
                  autoFocus
                  type="text"
                  placeholder="Nome da nova lista..."
                  className="bg-zinc-800 border-zinc-700 rounded-2xl py-6 text-white focus-visible:ring-yellow-400"
                  value={newSetlistName}
                  onChange={(e) => setNewSetlistName(e.target.value)}
                />
                <div className="flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => setIsCreatingSetlist(false)} className="flex-1 py-6 rounded-2xl font-bold bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white">Voltar</Button>
                  <Button type="submit" className="flex-1 py-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg bg-yellow-400 hover:bg-yellow-500 text-zinc-950">Criar & Salvar</Button>
                </div>
              </form>
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}
