import wasm from "./md4w.wasm";
import { initWasm } from "./md4w.js";

export function init() {
  initWasm(wasm);
}

export * from "./md4w.js";
