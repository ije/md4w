import wasm from "./md4w.wasm";
import { initWasm } from "./md4w.js";

initWasm(wasm);

export function init() {}
export * from "./md4w.js";
