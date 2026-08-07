/* Renders every view to static HTML - catches crashes, and lets the print
   sheets be checked without a browser. Run: node scripts/ssr-check.mjs */
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync, mkdirSync } from 'fs';
import App from '../src/App.jsx';
import Home from '../src/components/Home.jsx';
import Lessons from '../src/components/Lessons.jsx';
import Reference from '../src/components/Reference.jsx';
import Practice from '../src/components/Practice.jsx';
import Translator from '../src/components/Translator.jsx';
import SettingsView from '../src/components/Settings.jsx';
import StrokeSheet from '../src/print/StrokeSheet.jsx';
import ChartSheet from '../src/print/ChartSheet.jsx';
import Flashcards from '../src/print/Flashcards.jsx';
import Worksheets from '../src/print/Worksheets.jsx';
import { load } from '../src/lib/progress.js';
import { UNITS } from '../src/data/lessons.js';

const state = load();
const noop = () => {};
const S = state.settings;

const cases = [
  // App first, and on its own line, because it is the one that catches
  // ordering mistakes in the component body - a hook listing a `const`
  // callback in its dependency array before that const is initialised throws
  // during render, so the whole app fails to mount and every other check
  // still passes. That shipped once.
  ['App', <App />],
  ['Home', <Home state={state} go={noop} />],
  ['UnitList', <Lessons state={state} update={noop} go={noop} unitId={null} />],
  ...UNITS.map((u) => [`Unit${u.id}`, <Lessons state={state} update={noop} go={noop} unitId={u.id} />]),
  ['Reference', <Reference settings={S} />],
  ['Practice', <Practice state={state} update={noop} settings={S} />],
  ['Translator', <Translator settings={S} update={noop} />],
  ['Settings', <SettingsView state={state} update={noop} />],
  ['StrokeSheet', <StrokeSheet />],
  ['ChartSheet', <ChartSheet />],
  ['Flashcards', <Flashcards />],
  ['Worksheets', <Worksheets />],
];

mkdirSync('/tmp/ssr', { recursive: true });
let fails = 0;
for (const [name, el] of cases) {
  try {
    const html = renderToStaticMarkup(el);
    writeFileSync(`/tmp/ssr/${name}.html`, html);
  } catch (e) { fails++; console.log('FAIL', name, '-', e.message); }
}
console.log(fails ? `${fails} view(s) failed` : `all ${cases.length} views render`);
process.exit(fails ? 1 : 0);
