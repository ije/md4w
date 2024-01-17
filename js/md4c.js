const enc = new TextEncoder();
const dec = new TextDecoder();

let wasm;

/**
 * readMem returns a Uint8Array view of the wasm memory.
 *
 * @param {bigint} ptrLen pointer(32-bit) and length(32-bit) encoded as a single 64-bit int (BigInt)
 * @returns {Uint8Array} view of the wasm memory
 */
const readMem = (ptrLen) => {
  const ptr = Number(ptrLen & 0xffffffffn);
  const len = Number(ptrLen >> 32n);
  return new Uint8Array(wasm.memory.buffer, ptr, len);
};

/**
 * allocMem allocates memory in Zig and copies the data into it
 *
 * @param {Uint8Array} data data to be copied into the memory
 * @returns {bigint} pointer(32-bit) and length(32-bit) encoded as a single 64-bit int (BigInt)
 */
const allocMem = (data) => {
  const ptrLen = wasm.allocMem(data.length); // ask Zig to allocate memory with the given data length
  const mem = readMem(ptrLen);
  mem.set(data);
  return ptrLen;
};

/**
 * freeMem frees the memory allocated by Zig
 *
 * @param {bigint} ptrLen pointer(32-bit) and length(32-bit) encoded as a single 64-bit int (BigInt)
 * @param {boolean|undefined} sync if `true`, the memory will be freed synchronously
 */
const freeMem = (ptrLen, sync) => {
  if (!sync) {
    queueMicrotask(() => wasm.freeMem(ptrLen));
  } else {
    wasm.free(ptrLen);
  }
};

/**
 * Converts markdown to html.
 * @param {string | Uint8Array} input markdown input
 * @returns {string} html output
 */
export function mdToHtml(input) {
  const ptrLen = wasm.mdToHtml(
    allocMem(typeof input === "string" ? enc.encode(input) : input),
  );
  const html = dec.decode(readMem(ptrLen));
  freeMem(ptrLen);
  return html;
}

/**
 * Initializes md4c wasm module synchronously.
 * @param {WebAssembly.Module | { mdToHtml: CallableFunction }} wasmModule
 * @returns {void}
 */
export function initWasm(wasmModule) {
  if (wasmModule instanceof WebAssembly.Module) {
    const instance = new WebAssembly.Instance(wasmModule);
    wasm = instance.exports;
  } else {
    wasm = wasmModule;
  }
}
