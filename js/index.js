import { initWasm } from "./md4w.js";

// universal FS
const fs = globalThis.Deno || {};
if (!fs.readFile) {
  if (globalThis.Bun) {
    // bun
    fs.readFile = async (path) =>
      new Uint8Array(await Bun.file(path).arrayBuffer());
  } else if (globalThis.process) {
    // nodejs
    const m = "node:fs/promises";
    const { readFile } = await import(m);
    fs.readFile = readFile;
  } else {
    // browser
    fs.readFile = async (path) => {
      const cache = localStorage.getItem(path);
      if (cache) {
        return Uint8Array.from(atob(cache), (c) => c.charCodeAt(0));
      }
      const bytes = new Uint8Array(await (await fetch(path)).arrayBuffer());
      localStorage.setItem(path, btoa(String.fromCodePoint(...bytes)));
      return bytes;
    };
  }
}

/** Initializes the wasm module. */
export async function init() {
  const wasmURL = new URL("md4w.wasm", import.meta.url);
  const wasmBytes = await fs.readFile(wasmURL);
  initWasm(await WebAssembly.compile(wasmBytes));
}

export * from "./md4w.js";
