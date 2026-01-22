import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        TanStackRouterVite({
          routesDirectory: './routes',
          generatedRouteTree: './routeTree.gen.ts',
        }),
        react(),
        VitePWA({ 
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
          manifest: {
            name: 'CifraTurner Pro',
            short_name: 'CifraTurner',
            description: 'Visualizador de cifras para performances ao vivo com suporte a pedal.',
            theme_color: '#facc15',
            background_color: '#09090b',
            display: 'fullscreen',
            orientation: 'portrait',
            icons: [
              {
                src: 'https://cdn-icons-png.flaticon.com/512/3293/3293810.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ]
          },
          workbox: {
             globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
             runtimeCaching: [
                {
                  urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'google-fonts-cache',
                    expiration: {
                      maxEntries: 10,
                      maxAgeSeconds: 60 * 60 * 24 * 365
                    },
                    cacheableResponse: {
                      statuses: [0, 200]
                    }
                  }
                },
                {
                  urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'gstatic-fonts-cache',
                    expiration: {
                      maxEntries: 10,
                      maxAgeSeconds: 60 * 60 * 24 * 365
                    },
                    cacheableResponse: {
                      statuses: [0, 200]
                    }
                  }
                },
                 {
                  urlPattern: /^https:\/\/cdn\.tailwindcss\.com.*/i,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'tailwind-cdn-cache',
                    expiration: {
                      maxEntries: 1,
                      maxAgeSeconds: 60 * 60 * 24 * 365
                    },
                    cacheableResponse: {
                      statuses: [0, 200]
                    }
                  }
                }
             ]
          }
        })
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
