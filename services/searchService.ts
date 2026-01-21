
export interface SolrSong {
  m: string; // Music title
  a: string; // Artist name
  u: string; // URL slug
  d: string; // Artist slug
  t: string; // Type (2 is song)
}

export const searchSongsExternal = async (query: string): Promise<SolrSong[]> => {
  const targetUrl = `https://solr.sscdn.co/cc/h2/?q=${encodeURIComponent(query)}`;
  // Adding proxy to prevent CORS/NetworkError issues during search
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
  
  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error("Search proxy failed");
    
    const text = await response.text();
    
    // Extract JSON from JSONP-style response "callback({...})"
    const start = text.indexOf('(');
    const end = text.lastIndexOf(')');
    
    let data;
    if (start !== -1 && end !== -1) {
      const jsonStr = text.substring(start + 1, end);
      data = JSON.parse(jsonStr);
    } else {
      // Handle cases where the proxy might have stripped the callback or returned direct JSON
      data = JSON.parse(text);
    }
    
    return (data.response?.docs || []).filter((doc: any) => doc.t === "2");
  } catch (error) {
    console.error("Error searching songs via Solr:", error);
    return [];
  }
};
