import React, { createContext, useContext, useState, useEffect } from 'react';
import { Setlist, Song, SolrSong } from '../types';
import { fetchCifraClubHtml } from '../services/chordService';
import { transposeHtml } from '../services/transposerService';

interface SetlistContextType {
  setlists: Setlist[];
  createSetlist: (name: string) => Setlist;
  deleteSetlist: (id: string) => void;
  addToSetlist: (solrSong: SolrSong, setlistId: string, isOnline: boolean, options?: { key?: number, capo?: number }) => Promise<void>;
  removeFromSetlist: (setlistId: string, songId: string) => void;
  moveSong: (setlistId: string, songIndex: number, direction: 'up' | 'down') => void;
  updateSong: (songId: string, updatedContent: string, keyIndex: number, capo?: number) => void;
  updateSetlistPreference: (setlistId: string, hideTabs: boolean) => void;
  getSetlist: (id: string) => Setlist | undefined;
  saveSongToSetlist: (song: Song, setlistId: string) => void;
  importSetlist: (url: string) => Promise<void>;
  isLoading: boolean;
}

const SetlistContext = createContext<SetlistContextType | undefined>(undefined);

export const useSetlists = () => {
  const context = useContext(SetlistContext);
  if (!context) {
    throw new Error('useSetlists must be used within a SetlistProvider');
  }
  return context;
};

export const SetlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('cifraturner_setlists_collection');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (Array.isArray(data)) {
          setSetlists(data);
        }
      } catch (e) {
        console.error("Failed to load setlists", e);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    localStorage.setItem('cifraturner_setlists_collection', JSON.stringify(setlists));
  }, [setlists]);

  const createSetlist = (name: string) => {
    const newSl: Setlist = { id: Date.now().toString(), name, songs: [], hideTabs: false };
    setSetlists(prev => [...prev, newSl]);
    return newSl;
  };

  const deleteSetlist = (id: string) => {
    setSetlists(prev => prev.filter(sl => sl.id !== id));
  };

  const loadSongContent = async (solrSong: SolrSong, id: string, options?: { key?: number, capo?: number }): Promise<Song> => {
    const result = await fetchCifraClubHtml(solrSong.d, solrSong.u);
    
    let finalContent = result.html;
    if (options?.key !== undefined && options.key !== -1 && result.originalKeyIndex !== -1) {
      finalContent = transposeHtml(result.html, result.originalKeyIndex, options.key);
    }

    return {
      id,
      title: solrSong.m,
      artist: solrSong.a,
      artistSlug: solrSong.d,
      songSlug: solrSong.u,
      content: finalContent,
      originalContent: result.html,
      originalKeyIndex: result.originalKeyIndex,
      currentKeyIndex: options?.key ?? -1,
      capo: options?.capo ?? 0,
      isLoading: false
    };
  };

  const addToSetlist = async (solrSong: SolrSong, setlistId: string, isOnline: boolean, options?: { key?: number, capo?: number }) => {
    if (!isOnline) {
      throw new Error("Conecte-se para baixar a cifra.");
    }

    const tempId = `${solrSong.d}-${solrSong.u}-${Date.now()}`;
    const tempSong: Song = {
      id: tempId,
      title: solrSong.m,
      artist: solrSong.a,
      artistSlug: solrSong.d,
      songSlug: solrSong.u,
      content: '', // No content yet
      originalContent: '',
      originalKeyIndex: -1,
      currentKeyIndex: options?.key ?? -1,
      capo: options?.capo ?? 0,
      isLoading: true
    };

    // 1. Optimistic Update: Add temp song immediately
    setSetlists(prev => prev.map(sl => 
      sl.id === setlistId 
        ? { ...sl, songs: [...sl.songs, tempSong] } 
        : sl
    ));
    
    try {
      // 2. Perform Async Operation
      const song = await loadSongContent(solrSong, tempId, options);
      
      // 3. Success Update: Replace temp song with real data
      setSetlists(prev => prev.map(sl => 
        sl.id === setlistId 
          ? { 
              ...sl, 
              songs: sl.songs.map(s => s.id === tempId ? song : s) 
            } 
          : sl
      ));
    } catch (err) {
      // 4. Error Rollback: Remove the temp song
      setSetlists(prev => prev.map(sl => 
        sl.id === setlistId 
          ? { ...sl, songs: sl.songs.filter(s => s.id !== tempId) } 
          : sl
      ));
      throw new Error("Erro ao processar cifra.");
    }
  };

  const saveSongToSetlist = (song: Song, setlistId: string) => {
     const newSong = { ...song, id: `${song.artistSlug}-${song.songSlug}-${Date.now()}` };
     setSetlists(prev => prev.map(sl => 
        sl.id === setlistId 
          ? { ...sl, songs: [...sl.songs, newSong] } 
          : sl
      ));
  };

  const removeFromSetlist = (setlistId: string, songId: string) => {
    setSetlists(prev => prev.map(sl => 
      sl.id === setlistId ? { ...sl, songs: sl.songs.filter(s => s.id !== songId) } : sl
    ));
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

  const updateSong = (songId: string, updatedContent: string, keyIndex: number, capo?: number) => {
     setSetlists(prev => prev.map(sl => ({
        ...sl,
        songs: sl.songs.map(s => s.id === songId ? { ...s, content: updatedContent, currentKeyIndex: keyIndex, capo: capo ?? s.capo } : s)
      })));
  };

  const updateSetlistPreference = (setlistId: string, hideTabs: boolean) => {
    setSetlists(prev => prev.map(sl => 
      sl.id === setlistId ? { ...sl, hideTabs } : sl
    ));
  };

  const importSetlist = async (url: string) => {
    const { fetchCifraClubSetlist } = await import('../services/chordService');
    const data = await fetchCifraClubSetlist(url);
    
    // Create new setlist
    const newSl = createSetlist(data.name);
    
    // Process songs sequentially to avoid overwhelming the proxy
    // We can fire these off. The addToSetlist function already handles optimistic updates.
    // We just need to map NormalizedSong to SolrSong-like structure for addToSetlist
    
    for (const song of data.songs) {
       // Mock SolrSong structure required by addToSetlist
       const solrSong: SolrSong = {
         m: song.name,
         a: song.artist,
         u: song.songSlug,
         d: song.artistSlug,
         t: "2"
       };
       // We ignore errors here to allow partial imports
       addToSetlist(solrSong, newSl.id, true, { key: song.key, capo: song.capo }).catch(err => console.error(`Failed to import ${song.name}`, err));
       
       // Small delay to be nice to the proxy
       await new Promise(r => setTimeout(r, 500));
    }
  };

  const getSetlist = (id: string) => setlists.find(sl => sl.id === id);

  return (
    <SetlistContext.Provider value={{
      setlists,
      createSetlist,
      deleteSetlist,
      addToSetlist,
      removeFromSetlist,
      moveSong,
      updateSong,
      updateSetlistPreference,
      getSetlist,
      saveSongToSetlist,
      importSetlist,
      isLoading
    }}>
      {children}
    </SetlistContext.Provider>
  );
};
