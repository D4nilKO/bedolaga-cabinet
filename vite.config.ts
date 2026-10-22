import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import packageJson from './package.json' with { type: 'json' };
import { brandingHtml } from './vite-plugins/brandingHtml.ts';

// Vendor-чанки: [имя, какие модули в него идут]. Порядок = приоритет группы.
// Rolldown по умолчанию забирает в группу и все зависимости её модулей, поэтому
// базовые чанки (react, utils) стоят первыми: общие пакеты (clsx,
// use-sync-external-store) должны достаться им, а не тяжёлым ленивым
// recharts/tiptap — иначе стартовая страница тянет чанк графиков.
const VENDOR_CHUNKS: ReadonlyArray<readonly [string, RegExp]> = [
  ['vendor-react', /node_modules\/(react|react-dom|react-router|scheduler)\//],
  [
    'vendor-utils',
    /node_modules\/(axios|zustand|clsx|tailwind-merge|class-variance-authority|dompurify)\//,
  ],
  ['vendor-query', /@tanstack\/react-query/],
  ['vendor-i18n', /i18next/],
  ['vendor-motion', /framer-motion/],
  ['vendor-radix', /@radix-ui\//],
  ['vendor-telegram', /@telegram-apps\/|\/@tma\.js\//],
  ['vendor-twemoji', /node_modules\/.*twemoji/],
  ['vendor-crypto', /\/jsencrypt\/|@kastov\//],
  ['vendor-cmdk', /\/cmdk\//],
  ['vendor-dnd', /@dnd-kit\//],
  ['vendor-table', /@tanstack\/react-table/],
  ['vendor-webgl', /\/ogl\//],
  ['vendor-lottie', /@lottiefiles\//],
  // Heavy admin-only deps — split so they don't bloat the shared
  // chunks of other lazy admin pages that don't use them.
  ['vendor-recharts', /\/recharts\/|\/d3-/],
  ['vendor-tiptap', /@tiptap\/|\/prosemirror-/],
];

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Переменные из .env и из окружения сборки (Docker передаёт их через ENV);
  // окружение сильнее файла — как и у самого Vite.
  const env = { ...loadEnv(mode, import.meta.dirname, ''), ...process.env };
  const proxyTarget = env.PROXY_TARGET || 'http://localhost:8080';
  const isRemote = Boolean(env.PROXY_TARGET);
  const androidTvProxyTarget = env.ANDROID_TV_BOT_API_URL || 'http://localhost:8090';

  return {
    plugins: [
      react(),
      brandingHtml({
        name: env.VITE_APP_NAME ?? '',
        apiUrl: env.VITE_API_URL ?? '',
      }),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
      },
    },
    // Base path - use '/' for standalone Docker deployment
    // Change to '/cabinet/' if serving from a sub-path
    base: '/',
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          // Set PROXY_TARGET in .env to point at a remote backend for local dev,
          // e.g. PROXY_TARGET=https://cabinet-9f3k.tagtagcore.com
          // When PROXY_TARGET is set the /api prefix is kept (remote nginx handles it).
          // When not set, requests go to local backend on :8080 with /api stripped.
          target: proxyTarget,
          changeOrigin: true,
          rewrite: isRemote ? undefined : (path) => path.replace(/^\/api/, ''),
        },
        '/android-tv-api': {
          target: androidTvProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/android-tv-api/, ''),
        },
        // The backend serves its liveness endpoint at the host root (not under
        // /api). Proxy it too so the "service unavailable" detection probe hits the
        // real backend in dev instead of the Vite server (which would mask outages).
        '/health': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 550,
      rolldownOptions: {
        // Barrel-файлы src/**/index.ts(x) — чистые реэкспорты без побочных эффектов.
        // Без этой пометки Rolldown считает их побочными, и неиспользуемый
        // реэкспорт тянет модуль в стартовый чанк: StatCard из '@/components/stats'
        // на дашборде приводил в стартовую загрузку DailyChart и весь recharts.
        treeshake: {
          moduleSideEffects: (id: string) =>
            /\/src\/.+\/index\.tsx?$/.test(id) ? false : undefined,
        },
        output: {
          codeSplitting: {
            groups: VENDOR_CHUNKS.map(([name, test], index) => ({
              name,
              test,
              priority: VENDOR_CHUNKS.length - index,
            })),
          },
        },
      },
    },
  };
});
