import { defineConfig } from 'vite';
import compression from 'vite-plugin-compression';
import viteImagemin from 'vite-plugin-imagemin';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  // Base URL — use '/' for GitHub Pages root deployment.
  // If deploying to a subpath (e.g., repo name), change to '/repo-name/'
  // and update the <base> tag in index.html accordingly.
  base: '/',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,

    // Manual chunk splitting for optimal caching
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three-vendor';
          if (id.includes('node_modules/gsap')) return 'gsap-vendor';
          if (id.includes('node_modules/animejs')) return 'anime-vendor';
          if (id.includes('node_modules/lenis')) return 'lenis-vendor';
          if (id.includes('node_modules/splitting')) return 'splitting-vendor';
        },
        // Hash filenames for cache-busting
        entryFileNames: 'assets/js/[name]-[hash].js',
        chunkFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },

    // Include GLSL files as importable strings
    assetsInclude: ['**/*.glsl', '**/*.vert', '**/*.frag'],
  },

  plugins: [
    // Gzip + Brotli compression for production builds
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
      deleteOriginFile: false,
    }),
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false,
    }),

    // Image optimization at build time
    viteImagemin({
      gifsicle: {
        optimizationLevel: 7,
        interlaced: false,
      },
      optipng: {
        optimizationLevel: 7,
      },
      mozjpeg: {
        quality: 80,
      },
      pngquant: {
        quality: [0.65, 0.9],
        speed: 4,
      },
      svgo: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeEmptyAttrs', active: true },
        ],
      },
    }),

    // Bundle analyzer — run with MODE=analyze
    process.env.MODE === 'analyze' &&
      visualizer({
        filename: 'stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),

  css: {
    preprocessorOptions: {
      css: {},
    },
  },

  server: {
    port: 4173,
    open: false,
  },

  preview: {
    port: 4173,
  },
});
