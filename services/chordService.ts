
import { noteToIndex } from "./transposerService";

export interface ProcessedCifra {
  html: string;
  originalKeyIndex: number;
}

export const fetchCifraClubHtml = async (artistSlug: string, songSlug: string, keyIndex?: number): Promise<ProcessedCifra> => {
  const baseUrl = `https://www.cifraclub.com.br/${artistSlug}/${songSlug}/imprimir.html`;
  const queryParams = `?tabs=true&footerChords=false`;
  const targetUrl = `${baseUrl}${queryParams}`;
  
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
