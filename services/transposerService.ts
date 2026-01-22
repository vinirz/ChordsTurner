
import { KEYS } from "../types";

// Escala cromática padrão começando de C (Dó = 0)
const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const FLAT_MAP: Record<string, string> = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
  'Cb': 'B',  'Fb': 'E'
};

const SHARP_TO_FLAT: Record<string, string> = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'
};

/**
 * Transpõe um único acorde
 */
function transposeChord(chord: string, semitones: number, preferFlats: boolean): string {
  // Regex: Raiz[Acidente], Sufixo, /Baixo[Acidente]
  const chordRegex = /^([A-G][#b]?)([^/]*)(?:\/(.*))?$/;
  const match = chord.match(chordRegex);

  if (!match) return chord;

  const [, root, suffix, bass] = match;

  const transposeNote = (note: string) => {
    let normalized = FLAT_MAP[note] || note;
    let index = CHROMATIC_SCALE.indexOf(normalized);
    
    if (index === -1) return note;

    let newIndex = (index + semitones) % 12;
    if (newIndex < 0) newIndex += 12;

    let transposed = CHROMATIC_SCALE[newIndex];
    
    // Decisão de usar bemol ou sustenido para legibilidade
    if (preferFlats && SHARP_TO_FLAT[transposed]) {
      return SHARP_TO_FLAT[transposed];
    }
    return transposed;
  };

  const newRoot = transposeNote(root);
  const newBass = bass ? `/${transposeNote(bass)}` : '';

  return `${newRoot}${suffix}${newBass}`;
}

/**
 * Processa o HTML da cifra e transpõe todos os elementos .chord-highlight
 */
export const transposeHtml = (html: string, fromKeyIndex: number, toKeyIndex: number): string => {
  if (toKeyIndex === -1 || fromKeyIndex === -1 || fromKeyIndex === toKeyIndex) return html;

  const semitones = toKeyIndex - fromKeyIndex;
  
  // Tons que preferem bemóis: F (5), Bb (10), Eb (3), Ab (8), Db (1)
  const preferFlats = [5, 10, 3, 8, 1].includes(toKeyIndex);

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const chordElements = doc.querySelectorAll('.chord-highlight');

  chordElements.forEach((el) => {
    const originalChord = el.textContent || '';
    if (originalChord.trim()) {
      el.textContent = transposeChord(originalChord.trim(), semitones, preferFlats);
    }
  });

  return doc.body.innerHTML;
};

/**
 * Converte um nome de nota (Ex: "C#") para o index numérico (C=0)
 */
export const noteToIndex = (note: string): number => {
  if (!note) return -1;
  
  // Limpeza profunda da string
  let normalized = note.trim()
    .replace(/^Tom:\s*/i, '') // Remove o prefixo "Tom: "
    .replace(/m$/, '')         // Remove "m" de menor
    .replace(/[0-9]/g, '')     // Remove números (sétimas, nonas, etc)
    .split('/')[0]             // Pega apenas a raiz, ignora o baixo se houver
    .trim();
  
  // Normaliza acidentes bemóis para sustenidos para comparação na escala
  normalized = FLAT_MAP[normalized] || normalized;
  
  return CHROMATIC_SCALE.indexOf(normalized);
};

/**
 * Converte o índice de tom do Cifra Club (A=0) para o índice interno do app (C=0)
 * CC: A=0, Bb=1, B=2, C=3 ...
 * App: A=9, Bb=10, B=11, C=0 ...
 */
export const mapCifraClubKeyToIndex = (ccIndex: number): number => {
  // A=0 -> App A=9. Diferença = +9.
  // (index + 9) % 12
  let mapped = (ccIndex + 9) % 12;
  return mapped;
};
