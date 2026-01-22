
import { noteToIndex, mapCifraClubKeyToIndex } from "./transposerService";

export interface ProcessedCifra {
  html: string;
  originalKeyIndex: number;
}

export const fetchCifraClubHtml = async (artistSlug: string, songSlug: string, keyIndex?: number): Promise<ProcessedCifra> => {
  const baseUrl = `https://www.cifraclub.com.br/${artistSlug}/${songSlug}/imprimir.html`;
  // Updated per user request to use hash parameters
  const targetUrl = `${baseUrl}#footerChords=false&tabs=true`;
  
  const timestamp = Date.now();
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}&cache_bust=${timestamp}`,
    `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}&timestamp=${timestamp}`
  ];

  for (const proxyUrl of proxies) {
    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) continue;

      let htmlContent = '';
      if (proxyUrl.includes('allorigins')) {
        const data = await response.json();
        htmlContent = data.contents;
      } else {
        htmlContent = await response.text();
      }

      if (htmlContent && htmlContent.length > 500) {
        return processHtml(htmlContent);
      }
    } catch (e) {
      console.warn(`Proxy falhou: ${proxyUrl}`);
    }
  }

  throw new Error("Erro ao carregar a cifra.");
};

function processHtml(html: string): ProcessedCifra {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  let originalKeyIndex = -1;
  const tomElement = doc.querySelector('#cifra_tom a') || 
                     doc.querySelector('#cifra_tom b') || 
                     doc.querySelector('#cifra_tom');

  if (tomElement && tomElement.textContent) {
    const detected = noteToIndex(tomElement.textContent);
    if (detected !== -1) originalKeyIndex = detected;
  }

  const cifraContainer = 
    doc.querySelector('.cifra') || 
    doc.querySelector('#cifra_cnt') || 
    doc.querySelector('pre') ||
    doc.querySelector('.chord-content');
  
  if (!cifraContainer) {
    return {
      html: cleanElement(doc.body).outerHTML,
      originalKeyIndex
    };
  }

  return {
    html: cleanElement(cifraContainer as HTMLElement).outerHTML,
    originalKeyIndex
  };
}

function cleanElement(el: HTMLElement): HTMLElement {
  const clean = el.cloneNode(true) as HTMLElement;
  
  const removals = clean.querySelectorAll([
    'script', 'style', 'iframe', 'button', 'input',
    '.footer-chords', '.heading', '.instrument-selector', 
    '.toolbar', '.header', '.noprint', '.social', '.ads', 
    '.banner', '.footer', '.tabs-instrumento', '.instrument-nav'
  ].join(','));
  removals.forEach(s => s.remove());
  
  // Identifica tablaturas e envolve em um container para controle de visibilidade total
  const tabElements = clean.querySelectorAll('.tablatura, .tabs, .chord-tabs, [class*="tab-"]');
  tabElements.forEach(tab => {
    tab.classList.add('tab-block');
  });

  const chords = clean.querySelectorAll('b, a, .chord, [data-chord], i, strong');
  chords.forEach(chord => {
    const span = document.createElement('span');
    span.innerHTML = chord.innerHTML;
    span.className = 'chord-highlight';
    chord.parentNode?.replaceChild(span, chord);
  });

  const pre = clean.tagName === 'PRE' ? clean : clean.querySelector('pre');
  if (pre) {
    // Normalização básica de quebras de linha para evitar espaços gigantescos
    let content = pre.innerHTML;
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n'); 
    pre.innerHTML = content;
  }

  return clean;
}

export interface SimplifiedSong {
  name: string;
  artist: string;
  artistSlug: string;
  songSlug: string;
  key?: number;  // App's key index (C=0)
  capo?: number;
}

export interface ProcessedSetlist {
  name: string;
  songs: SimplifiedSong[];
}

export const fetchCifraClubSetlist = async (url: string): Promise<ProcessedSetlist> => {
  // Normalize URL to ensure it's a valid Cifra Club setlist URL is handled by the caller or here if needed.
  // We assume the user pastes a valid URL.
  
  const timestamp = Date.now();
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(url)}&cache_bust=${timestamp}`,
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&timestamp=${timestamp}`
  ];

  for (const proxyUrl of proxies) {
    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) continue;

      let htmlContent = '';
      if (proxyUrl.includes('allorigins')) {
        const data = await response.json();
        htmlContent = data.contents;
      } else {
        htmlContent = await response.text();
      }

      if (htmlContent && htmlContent.length > 500) {
        return extractSetlistFromHtml(htmlContent);
      }
    } catch (e) {
      console.warn(`Proxy falhou: ${proxyUrl}`);
    }
  }

  throw new Error("Erro ao carregar a setlist.");
};

function extractSetlistFromHtml(html: string): ProcessedSetlist {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Validation: Check if it looks like a setlist page
  // The 'list-musics' class is central to the setlist structure.
  if (!doc.querySelector('.list-musics')) {
      throw new Error("URL inválida: Não parece ser uma página de repertório do Cifra Club.");
  }

  // Extract Setlist Name
  const titleEl = doc.querySelector('.list-title .songbook-title') || doc.querySelector('h1.t2');
  const name = titleEl?.textContent?.trim() || "Setlist Importada";

  const songs: SimplifiedSong[] = [];

  // Extract Songs from the ordered list
  const songItems = doc.querySelectorAll('.list-musics li');
  songItems.forEach(li => {
    // The data attributes are very reliable in the provided HTML snippet
    const name = li.getAttribute('data-name');
    const artist = li.getAttribute('data-artist');
    const url = li.getAttribute('data-url'); // e.g., /artist/song/
    let fullUrl = "";

    // Fallback to parsing anchor tag if data attributes are missing (less likely but robust)
    const a = li.querySelector('a');
    if (a) {
         const href = a.getAttribute('href');
         if (href) fullUrl = href;
    }

    if (name && artist && url) {
      const parts = url.split('/').filter(p => p);
      if (parts.length >= 2) {
        // Use parts[1] for songSlug to avoid capturing the ID (e.g. jhktgj.html)
        const songData: SimplifiedSong = {
          name,
          artist,
          artistSlug: parts[0],
          songSlug: parts[1],
        };

        // Extract Query/Hash Params from fullUrl (e.g. #instrument=guitar&key=8&capo=2)
        // Usually in the anchor href
        if (fullUrl) {
            const hashMatch = fullUrl.match(/#(.+)/);
            if (hashMatch) {
               const params = new URLSearchParams(hashMatch[1]);
               
               // Capo
               const capo = params.get('capo');
               if (capo) songData.capo = parseInt(capo, 10);

               // Key (Cifra Club A=0 -> App C=0)
               // CC: A=0, Bb=1, B=2, C=3 ...
               // App: C=0, C#=1 ... A=9 ...
               // Conversion: App = (CC + 9) % 12
               const key = params.get('key');
               if (key) {
                   const ccKey = parseInt(key, 10);
                   if (!isNaN(ccKey)) {
                       songData.key = mapCifraClubKeyToIndex(ccKey);
                   }
               }
            }
        }
        
        songs.push(songData);
      }
    } else if (a) {
         // Fallback logic
         const href = a.getAttribute('href');
         const parts = href?.split('/').filter(p => p && !p.startsWith('#')); // filter out empty and hash only? href usually parses well.
         
         const strong = a.querySelector('strong');
         
         if (href && parts && parts.length >= 2 && strong) {
             const songName = strong.textContent?.trim() || "";
             // Text node after strong usually contains " - Artist"
             const fullText = a.textContent || "";
             const artistName = fullText.replace(songName, '').replace(/^ - /, '').trim();
             
             const songData: SimplifiedSong = {
                name: songName,
                artist: artistName,
                artistSlug: parts[0],
                songSlug: parts[1] 
             };

             // Parse hash for key/capo from href
             const hashIndex = href.indexOf('#');
             if (hashIndex !== -1) {
                 const hash = href.substring(hashIndex + 1);
                 const params = new URLSearchParams(hash);
                 
                 const capo = params.get('capo');
                 if (capo) songData.capo = parseInt(capo, 10);

                 const key = params.get('key');
                 if (key) {
                     const ccKey = parseInt(key, 10);
                     if (!isNaN(ccKey)) {
                         songData.key = mapCifraClubKeyToIndex(ccKey);
                     }
                 }
             }
             
             songs.push(songData);
         }
    }
  });

  if (songs.length === 0) {
      throw new Error("Nenhuma música encontrada nesta lista ou a lista é privada sem acesso público.");
  }

  return { name, songs };
}
