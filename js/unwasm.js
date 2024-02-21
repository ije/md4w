import * as wasm from "./md4w-fast.wasm";
import { initWasm } from "./md4w.js";

export function init() {
  initWasm(wasm);
}

export * from "./md4w.js";
