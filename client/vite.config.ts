import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Inject the SW registration script automatically
      injectRegister: 'auto',

      // Include all files from the public directory in the SW precache
      includeAssets: ['icons/*.png', 'offline.html'],

      manifest: {
        name: 'Aahar AI',
        short_name: 'Aahar AI',
        description: 'AI-powered personalised nutrition and fitness tracking',
        theme_color: '#0B5FFF',
        background_color: '#0A0A0A',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/dashboard',
        id: 'aahar-ai-pwa',
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        categories: ['health', 'fitness', 'food'],
        shortcuts: [
          {
            name: 'Log Food',
            short_name: 'Log Food',
            description: 'Quickly log what you ate',
            url: '/log-food',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
          },
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'View your daily progress',
            url: '/dashboard',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
          },
        ],
      },

      workbox: {
        // Pre-cache all build output (JS, CSS, fonts)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],

        // Don't let the SW intercept API calls with a stale cache
        // — we handle that with runtimeCaching below
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],

        runtimeCaching: [
          // ── Google Fonts ── Stale While Revalidate
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },

          // ── Dashboard API ── Network First (fresh data preferred, fall back to cache)
          {
            urlPattern: /\/api\/v1\/dashboard\/home/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'dashboard-api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          // ── All other API calls ── Network Only (never serve stale auth/mutation data)
          {
            urlPattern: /\/api\/v1\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },

      // Dev options — show the SW in development for easier testing
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
