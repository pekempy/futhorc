globalThis.window = globalThis;
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.structuredClone ??= (o) => JSON.parse(JSON.stringify(o));
await import('./.ssr-bundle.mjs');
