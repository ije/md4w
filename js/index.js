import { initWasm } from "./md4w.js";

// universal FS
const fs = {};
if (globalThis.Bun) {
  // bun
  fs.readFile = async (url) =>
    new Uint8Array(await Bun.file(url.pathname).arrayBuffer());
} else if (globalThis.process && !globalThis.Deno) {
  // nodejs
  const m = "node:fs/promises";
  const { readFile } = await import(m);
  fs.readFile = (url) => readFile(url.pathname);
} else {
  // browser or deno
  fs.readFile = async (url) => {
    if (url.protocol === "file:" && globalThis.Deno) {
      return Deno.readFile(url);
    }
    return fetch(url);
  };
}

/** Initializes the wasm module. */
export async function init(wasmMode) {
  if (wasmMode !== "fast" && wasmMode !== "small") {
    wasmMode = import.meta.url.startsWith("file:") ? "fast" : "small";
  }
  const wasmURL = new URL(`md4w-${wasmMode}.wasm`, import.meta.url);
  const wasmRes = await fs.readFile(wasmURL);
  const wasmModule = wasmRes instanceof Response
    ? WebAssembly.compileStreaming(wasmRes)
    : WebAssembly.compile(wasmRes);
  initWasm(await wasmModule);
}

export * from "./md4w.js";
