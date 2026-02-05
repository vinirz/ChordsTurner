
export interface ProxyResponse {
  content: string;
  source: string;
}

const PROXIES = [
  // Primary: AllOrigins - Returns JSON with "contents" field
  {
    url: (targetId: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(targetId)}`,
    isJsonWrapper: true,
  },
  // Secondary/Fallback: CodeTabs - Returns raw content
  {
    url: (targetId: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetId)}`,
    isJsonWrapper: false,
  }
];

/**
 * Fetches external content using a rotation of free CORS proxies.
 * @param targetUrl The URL to fetch
 * @returns The text content of the response
 */
export const fetchWithProxy = async (targetUrl: string): Promise<string> => {
  const timestamp = Date.now();
  const urlWithCacheBust = targetUrl.includes('?') 
    ? `${targetUrl}&cache_bust=${timestamp}` 
    : `${targetUrl}?cache_bust=${timestamp}`;

  for (const proxy of PROXIES) {
    try {
      const proxyUrl = proxy.url(urlWithCacheBust);
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        console.warn(`Proxy ${proxyUrl} returned status ${response.status}`);
        continue;
      }

      let content = '';
      if (proxy.isJsonWrapper) {
        const data = await response.json();
        // AllOrigins returns the actual content in the 'contents' field
        content = data.contents;
      } else {
        content = await response.text();
      }

      if (content && content.length > 0) {
        return content;
      }
    } catch (error) {
      console.warn(`Proxy failed:`, error);
    }
  }

  throw new Error(`Failed to fetch ${targetUrl} after trying all proxies.`);
};
