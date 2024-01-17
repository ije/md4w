import { initWasm, mdToHtml } from "./md4c.js";

// universal FS
const fs = globalThis.Deno || {};
if (!fs.readFile) {
  if (globalThis.Bun) {
    // bun
    fs.readFile = async (path) =>
      new Uint8Array(await Bun.file(path).arrayBuffer());
  } else if (globalThis.process) {
    // nodejs
    const { readFile } = await import("node:fs/promises");
    fs.readFile = readFile;
  } else {
    // browser
    fs.readFile = async (path) => {
      const cacheBase64 = localStorage.getItem(path);
      if (cacheBase64) {
        return Uint8Array.from(atob(cacheBase64), (c) => c.charCodeAt(0));
      }
      const bytes = new Uint8Array(await (await fetch(path)).arrayBuffer());
      localStorage.setItem(path, btoa(String.fromCodePoint(...bytes)));
      return bytes;
    };
  }
}

/** Initializes md4c wasm module. */
export async function init() {
  const wasmURL = new URL("md4c.wasm", import.meta.url);
  const wasBytes = await fs.readFile(wasmURL);
  initWasm(await WebAssembly.compile(wasBytes));
}

export { mdToHtml };
