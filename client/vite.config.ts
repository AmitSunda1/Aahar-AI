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
      includeAssets: ['icons/*.webp', 'offline.html'],

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
            src: '/icons/Aahar-ai-logo.webp',
            sizes: '1254x1254',
            type: 'image/webp',
            purpose: 'any',
          },
          {
            src: '/icons/Aahar-ai-logo.webp',
            sizes: '1254x1254',
            type: 'image/webp',
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
            icons: [{ src: '/icons/Aahar-ai-logo.webp', sizes: '1254x1254', type: 'image/webp' }],
          },
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'View your daily progress',
            url: '/dashboard',
            icons: [{ src: '/icons/Aahar-ai-logo.webp', sizes: '1254x1254', type: 'image/webp' }],
          },
        ],
      },

      workbox: {
        // Pre-cache all build output (JS, CSS, fonts)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],

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
