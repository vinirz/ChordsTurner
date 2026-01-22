
export interface Song {
  id: string;
  title: string;
  artist: string;
  content: string; // Conteúdo atual (transposto ou original)
  originalContent: string; // Backup do tom original para transposição precisa
  artistSlug: string;
  songSlug: string;
  originalKeyIndex: number; // Tom detectado no momento do download
  currentKeyIndex: number;  // Tom selecionado pelo usuário (-1 para original)
  capo?: number;            // Posição do capotraste (0 = sem capo)
  isLoading?: boolean;      // UI State for optimistic updates
}

export interface Setlist {
  id: string;
  name: string;
  songs: Song[];
  hideTabs?: boolean; // Preferência de visualização da setlist
}

export type AppMode = 'SEARCH' | 'SETLISTS' | 'PERFORM';

/**
 * Mapeamento Cromático Padrão (Base C=0)
 * C=0, C#=1, D=2, D#=3, E=4, F=5, F#=6, G=7, G#=8, A=9, A#=10, B=11
 */
export const KEYS = [
  { label: 'Orig.', value: -1 }, 
  { label: 'C', value: 0 }, { label: 'C#', value: 1 }, { label: 'D', value: 2 },
  { label: 'D#', value: 3 }, { label: 'E', value: 4 }, { label: 'F', value: 5 },
  { label: 'F#', value: 6 }, { label: 'G', value: 7 }, { label: 'G#', value: 8 },
  { label: 'A', value: 9 }, { label: 'A#', value: 10 }, { label: 'B', value: 11 }
];
export interface SolrSong {
  m: string; // Music title
  a: string; // Artist name
  u: string; // URL slug
  d: string; // Artist slug
  t: string; // Type (2 is song)
}
