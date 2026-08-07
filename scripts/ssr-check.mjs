// Runs scripts/ssr-check.jsx.
//
// Node can't execute .jsx, so bundle it first with the esbuild that Vite
// already depends on. Worth the extra step: rendering every view - App
// included - catches the class of crash that only shows up in the browser,
// where the first sign is a blank page and a minified variable name.
import { build } from 'esbuild';

// Minimal browser stubs. The point of this check is to catch code that throws
// while rendering, not to prove the app never touches window - so give it a
// window rather than making every component defend against not having one.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
globalThis.window = {
  location: { hash: '' },
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  scrollTo() {},
  localStorage: globalThis.localStorage,
  devicePixelRatio: 1,
};
globalThis.document = {
  documentElement: {},
  addEventListener() {},
  removeEventListener() {},
  createElement: () => ({ setAttribute() {}, click() {}, remove() {}, style: {} }),
  head: { appendChild() {} },
  body: { appendChild() {} },
};
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' });
// navigator is read-only on modern Node and already present, so leave it be.
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '.ssr-bundle.mjs');

await build({
  entryPoints: [resolve(here, 'ssr-check.jsx')],
  outfile: out,
  bundle: true,
  format: 'esm',
  platform: 'node',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime'],
  loader: { '.woff2': 'empty', '.css': 'empty' },
  logLevel: 'warning',
});

await import(pathToFileURL(out).href);
