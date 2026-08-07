/* Inlines the built app into one self-contained futhorc.html — CSS, JS and the
   rune font all embedded — so it can be opened straight from disk, emailed or
   carried on a USB stick with no server. Run after `npm run build`. */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const assets = join(dist, 'assets');

const files = readdirSync(assets);
const jsName = files.find((f) => f.endsWith('.js'));
const cssName = files.find((f) => f.endsWith('.css'));
const fontName = files.find((f) => f.endsWith('.woff2'));

let css = readFileSync(join(assets, cssName), 'utf8');
const js = readFileSync(join(assets, jsName), 'utf8');

if (fontName) {
  const b64 = readFileSync(join(assets, fontName)).toString('base64');
  css = css.replace(/url\([^)]*\.woff2[^)]*\)/g, `url(data:font/woff2;base64,${b64})`);
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Futhorc — learn to read and write runes</title>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script type="module">
${js}
</script>
</body>
</html>`;

const out = join(root, 'futhorc.html');
writeFileSync(out, html);
console.log(`futhorc.html — ${(html.length / 1024).toFixed(0)} kB, self-contained`);
