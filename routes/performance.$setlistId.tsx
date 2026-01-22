import React from 'react';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { PerformanceView } from '../components/PerformanceView';
import { useSetlists } from '../contexts/SetlistContext';
import { useToast } from '../contexts/ToastContext';
import { Button } from '@/components/ui/button';

interface PerformanceSearch {
    index: number;
}

export const Route = createFileRoute('/performance/$setlistId')({
  component: PerformancePage,
  validateSearch: (search: Record<string, unknown>): PerformanceSearch => {
      // validate and parse search params
      return {
          index: Number(search?.index) || 0
      }
  }
});

function PerformancePage() {
  const { setlistId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { getSetlist, updateSong, updateSetlistPreference } = useSetlists();
  const { showToast } = useToast();

  const setlist = getSetlist(setlistId);

  if (!setlist) {
      return (
          <div className="flex items-center justify-center min-h-screen text-white">
              <div className="text-center">
                  <h2 className="text-xl font-bold">Setlist não encontrada</h2>
                  <Button onClick={() => navigate({ to: '/setlists' })} className="mt-4 bg-yellow-400 hover:bg-yellow-500 text-black">Voltar</Button>
              </div>
          </div>
      )
  }

  return (
    <PerformanceView 
      songs={setlist.songs} 
      startIndex={search.index} 
      initialHideTabs={setlist.hideTabs}
      onClose={() => navigate({ to: '/setlists' })} 
      onSongUpdate={(songId, content, keyIndex, capo) => updateSong(songId, content, keyIndex, capo)}
      onSetlistPreferenceUpdate={(hideTabs) => updateSetlistPreference(setlistId, hideTabs)}
      onError={(msg) => showToast(msg)}
    />
  );
}
