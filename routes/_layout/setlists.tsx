import React, { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PlusCircle, FolderOpen, Trash2, Play, ChevronUp, ChevronDown, Trash2 as TrashIcon, Music, AlertTriangle } from 'lucide-react';
import { useSetlists } from '../../contexts/SetlistContext';
import { useToast } from '../../contexts/ToastContext';
import { KEYS } from '../../types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const Route = createFileRoute('/_layout/setlists')({
  component: Setlists,
});

function Setlists() {
  const { setlists, createSetlist, deleteSetlist, moveSong, removeFromSetlist } = useSetlists();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeSetlistId, setActiveSetlistId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSetlistName, setNewSetlistName] = useState('');
  const [setlistToDelete, setSetlistToDelete] = useState<any | null>(null); // Type 'any' for simplicity with the Setlist type or import Setlist

  const currentActiveSetlist = setlists.find(sl => sl.id === activeSetlistId);

  const handleCreateSetlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetlistName.trim()) return;
    const newSl = createSetlist(newSetlistName);
    setActiveSetlistId(newSl.id);
    setNewSetlistName('');
    setShowCreateModal(false);
    showToast("Setlist criada!", "success");
  };

  const confirmDeleteSetlist = () => {
    if (!setlistToDelete) return;
    deleteSetlist(setlistToDelete.id);
    if (activeSetlistId === setlistToDelete.id) {
       setActiveSetlistId(null);
    }
    setSetlistToDelete(null);
    showToast("Lista removida.");
  };

  const startFullPerformance = (setlistId: string, index: number = 0) => {
    const sl = setlists.find(s => s.id === setlistId);
    if (!sl || sl.songs.length === 0) return showToast("A lista está vazia.");
    navigate({ to: `/performance/${setlistId}`, search: { index } } as any);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase">Setlists</h2>
          <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">{setlists.length} listas no arquivo</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-yellow-400 hover:bg-yellow-500 text-zinc-950 w-12 h-12 rounded-2xl p-0 shadow-lg">
          <PlusCircle size={24} />
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {setlists.map((sl, idx) => (
          <Card 
            key={sl.id} 
            style={{ animationDelay: `${idx * 50}ms` }}
            className={`cursor-pointer transition-all duration-300 hover-scale-sm border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-yellow-400/30 hover:shadow-lg hover:shadow-yellow-400/5 animate-in-fade-slide opacity-0 ${activeSetlistId === sl.id ? 'border-yellow-400 bg-yellow-400/5 shadow-[0_0_15px_rgba(250,204,21,0.1)]' : ''}`} 
            onClick={() => setActiveSetlistId(sl.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                 <FolderOpen size={16} className={activeSetlistId === sl.id ? 'text-yellow-400' : 'text-zinc-700'} />
                 {activeSetlistId === sl.id && (
                   <Button 
                     variant="ghost" 
                     size="icon" 
                     onClick={(e) => { e.stopPropagation(); setSetlistToDelete(sl); }} 
                     className="h-6 w-6 text-zinc-700 hover:text-red-500 hover:bg-transparent active:scale-90 transition-transform"
                   >
                     <Trash2 size={14} />
                   </Button>
                 )}
              </div>
              <h3 className="font-bold text-sm truncate mb-1 text-zinc-100">{sl.name}</h3>
              <div className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">{sl.songs.length} Músicas</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {currentActiveSetlist && (
        <div className="mt-8 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-yellow-400 p-6 rounded-3xl flex items-center justify-between shadow-[0_10px_30px_rgba(250,204,21,0.2)]">
            <div className="text-zinc-950 overflow-hidden pr-4">
              <h3 className="text-xl font-black uppercase tracking-tight truncate leading-none mb-1">{currentActiveSetlist.name}</h3>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Pronto para o palco</p>
            </div>
            <button onClick={() => startFullPerformance(currentActiveSetlist.id)} className="w-14 h-14 bg-black text-yellow-400 rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform shrink-0">
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
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => startFullPerformance(currentActiveSetlist.id, idx)}>
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
                <button onClick={() => removeFromSetlist(currentActiveSetlist.id, song.id)} className="p-3 text-zinc-700 active:text-red-500 shrink-0"><TrashIcon size={18} /></button>
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

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md w-[95%] rounded-3xl p-8">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black tracking-tight uppercase">Nova Lista</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSetlist} className="space-y-6">
            <Input
              autoFocus
              type="text"
              placeholder="Ex: Show de Sexta"
              className="bg-zinc-800 border-zinc-700 rounded-2xl py-6 text-white focus-visible:ring-yellow-400"
              value={newSetlistName}
              onChange={(e) => setNewSetlistName(e.target.value)}
            />
            <Button type="submit" className="w-full bg-yellow-400 hover:bg-yellow-500 text-zinc-950 py-6 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg">Salvar Lista</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!setlistToDelete} onOpenChange={(open) => !open && setSetlistToDelete(null)}>
        <AlertDialogContent className="bg-zinc-900 border-red-500/20 rounded-3xl p-8 text-center max-w-xs w-full shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
             <AlertTriangle size={32} />
          </div>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black mb-2 uppercase tracking-tight text-center text-zinc-100">Apagar lista?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500 text-sm mb-8 leading-relaxed text-center">
              Isso removerá "{setlistToDelete?.name}" permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col space-y-2 sm:space-y-0 sm:flex-col gap-2">
            <AlertDialogAction onClick={confirmDeleteSetlist} className="w-full bg-red-500 hover:bg-red-600 py-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg text-white border-0">Excluir</AlertDialogAction>
            <AlertDialogCancel onClick={() => setSetlistToDelete(null)} className="w-full bg-zinc-800 hover:bg-zinc-700 py-6 rounded-2xl font-bold text-zinc-400 border-0">Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
