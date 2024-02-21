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
    const Deno = globalThis.Deno;
    const browser = !Deno && globalThis.localStorage;
    if (url.protocol === "file:" && Deno) {
      return Deno.readFile(url);
    }
    if (browser) {
      const cache = localStorage.getItem(url.href);
      if (cache) {
        return Uint8Array.from(atob(cache), (c) => c.charCodeAt(0));
      }
    }
    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
    if (browser) {
      localStorage.setItem(
        url.href,
        btoa(String.fromCodePoint(...bytes)),
      );
    }
    return bytes;
  };
}

/** Initializes the wasm module. */
export async function init(wasmMode) {
  if (wasmMode !== "fast" && wasmMode !== "small") {
    wasmMode = import.meta.url.startsWith("file:") ? "fast" : "small";
  }
  const wasmURL = new URL(`md4w-${wasmMode}.wasm`, import.meta.url);
  const wasmBytes = await fs.readFile(wasmURL);
  const wasmModule = await WebAssembly.compile(wasmBytes);
  initWasm(wasmModule);
}

export * from "./md4w.js";
