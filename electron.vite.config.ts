import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import type { Plugin } from 'vite';

// Instances can live anywhere, so the renderer may connect to any https/wss origin; everything else is locked down.
function contentSecurityPolicy(dev: boolean): string {
  const local = 'http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*';
  return [
    "default-src 'self'",
    `script-src 'self'${dev ? " 'unsafe-inline'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' https: data: blob: http://localhost:* http://127.0.0.1:*`,
    "font-src 'self' data:",
    `connect-src 'self' https: wss: ${local}`,
    "object-src 'none'",
    "base-uri 'none'",
    "frame-src 'none'",
    "form-action 'none'",
  ].join('; ');
}

const csp = (dev: boolean): Plugin => ({
  name: 'jolt-csp',
  transformIndexHtml: (html) => html.replace('%CSP%', contentSecurityPolicy(dev)),
});

export default defineConfig(({ command }) => ({
  main: {},
  preload: {},
  renderer: {
    resolve: { alias: { '@': resolve('src/renderer/src') } },
    plugins: [react(), tailwindcss(), csp(command === 'serve')],
    build: { minify: true },
  },
}));
