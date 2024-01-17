import wasm from "./md4c.wasm";
import { initWasm, mdToHtml } from "./md4c.js";

initWasm(wasm);

export function init() {}

export { mdToHtml };
