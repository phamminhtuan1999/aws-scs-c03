import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const CSP =
  "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'";

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      // CSP is injected for the production build only (the dev server needs inline HMR scripts).
      name: 'inject-csp',
      transformIndexHtml: {
        order: 'post',
        handler(html, ctx) {
          if (!ctx.bundle) return html;
          return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`);
        },
      },
    },
  ],
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    globals: false,
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
