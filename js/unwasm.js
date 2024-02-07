import wasm from "./md4c.wasm";
import { initWasm } from "./md4c.js";

initWasm(wasm);

export function init() {}
export * from "./md4c.js";
