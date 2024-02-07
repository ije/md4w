const enc = new TextEncoder();
const dec = new TextDecoder();

let wasm;
let pull;
let highlighter;

/**
 * encode the input to Uint8Array if it is a string
 * @param {string | Uint8Array} input
 * @returns {Uint8Array}
 */
function toUint8Array(vinput) {
  return typeof vinput === "string" ? enc.encode(vinput) : vinput;
}

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
 * Converts markdown to html.
 * @param {string | Uint8Array} input markdown input
 * @options {object} options
 * @returns {string} html output
 */
export function mdToHtml(input, options = {}) {
  const chunks = [];
  pull = (chunk) => chunks.push(chunk);
  wasm.mdToHtml(
    allocMem(toUint8Array(input)),
    options.flags || 0,
    64 * 1024, // 64KB buffer size
    typeof highlighter === "function" ? 1 : 0,
  );
  pull = null;
  if (chunks.length === 0) {
    return ""
  }
  if (chunks.length === 1) {
    return dec.decode(chunks[0]);
  }
  const buf = new Uint8Array(
    chunks.reduce((acc, chunk) => acc + chunk.length, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    buf.set(chunk, offset);
    offset += chunk.length;
  }
  return dec.decode(buf);
}

/**
 * Converts markdown to html as a readable stream.
 * @param {string | Uint8Array} input markdown input
 * @options {object} options
 * @returns {ReadableStream<Uint8Array>} html stream
 */
export function mdToReadableHtml(input, options = {}) {
  return new ReadableStream({
    start(controller) {
      pull = (chunk) => controller.enqueue(chunk);
      wasm.mdToHtml(
        allocMem(typeof input === "string" ? enc.encode(input) : input),
        options.flags || 0,
        Math.max(1024, Number(options.bufferSize) || 1024),
        typeof highlighter === "function" ? 1 : 0,
      );
      pull = null;
      controller.close();
    },
  });
}

/**
 * Sets the code block highlighter function.
 * @param {(language: string, code: string) => string | Uint8Array} highlight
 * @returns {void}
 */
export function setCodeHighlighter(highlight) {
  highlighter = highlight;
}

/**
 * Initializes md4c wasm module.
 * @param {WebAssembly.Module | { mdToHtml: CallableFunction }} wasmModule
 * @returns {void}
 */
export function initWasm(wasmModule) {
  if (wasmModule instanceof WebAssembly.Module) {
    const instance = new WebAssembly.Instance(wasmModule, {
      env: {
        push: (ptrLen) => {
          pull(new Uint8Array(readMem(ptrLen)));
        },
        pushCodeBlock: (languagePtrLen, codePtrLen) => {
          const language = readMem(languagePtrLen);
          const code = readMem(codePtrLen);
          const output = highlighter(dec.decode(language), dec.decode(code));
          pull(toUint8Array(output));
        },
      },
    });
    wasm = instance.exports;
  } else {
    wasm = wasmModule;
  }
}
