import { initWasm } from "./md4w.js";

// universal FS
const fs = {};
if (globalThis.Bun) {
  // bun
  fs.readFile = async (url) =>
    new Uint8Array(await Bun.file(url.pathname).arrayBuffer());
} else if (globalThis.process && !globalThis.Deno) {
  // nodejs
  const u = "node:fs/promises";
  const p = import(u); // <- use variable to skip deno-lsp analyzing
  fs.readFile = async (url) => {
    const { readFile } = await p;
    return readFile(url.pathname);
  };
} else {
  // browser or deno
  fs.readFile = async (url) => {
    if (url.protocol === "file:" && globalThis.Deno) {
      return Deno.readFile(url);
    }
    return fetch(url);
  };
}

/**
 * Initializes md4w wasm from fs/CDN.
 * @param {"fast" | "small" | URL | Uint8Array | ArrayBuffer | Response | Promise<Response> | string | undefined} wasm The wasm module.
 * @returns {Promise<void>}
 */
export async function init(wasm) {
  if (wasm === "fast" || wasm === "small" || !wasm) {
    const mode = wasm ??
      (import.meta.url.startsWith("file:") ? "fast" : "small");
    wasm = `md4w-${mode}.wasm`;
  }
  if (wasm instanceof Promise) {
    wasm = await wasm;
  }
  let wasmRes;
  if (typeof wasm === "string" || wasm instanceof URL) {
    wasmRes = await fs.readFile(new URL(wasm, import.meta.url));
  } else {
    wasmRes = wasm;
  }
  const compiling = wasmRes instanceof Response
    ? WebAssembly.compileStreaming(wasmRes)
    : WebAssembly.compile(wasmRes);
  initWasm(await compiling);
}

/**
 * Initializes md4w wasm with a wasm module.
 * @param {WebAssembly.Module} wasmModule The wasm module.
 * @returns {void}
 */
export function initSync(wasmModule) {
  initWasm(wasmModule);
}

export * from "./md4w.js";
