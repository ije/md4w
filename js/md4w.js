const enc = new TextEncoder();
const dec = new TextDecoder();

let wasm;
let write;
let highlighter;

/**
 * ParseFlags is a set of flags for md4c parser.
 */
export const ParseFlags = Object.freeze({
  /** Collapse non-trivial whitespace into single space. */
  COLLAPSE_WHITESPACE: 0x0001,
  /** Do not require space in ATX headers ( ###header ) */
  PERMISSIVE_ATX_HEADERS: 0x0002,
  /** Recognize URLs as links. */
  PERMISSIVE_URL_AUTO_LINKS: 0x0004,
  /** Recognize e-mails as links.*/
  PERMISSIVE_EMAIL_AUTO_LINKS: 0x0008,
  /** Disable indented code blocks. (Only fenced code works.) */
  NO_INDENTED_CODE_BLOCKS: 0x0010,
  /** Disable raw HTML blocks. */
  NO_HTML_BLOCKS: 0x0020,
  /** Disable raw HTML (inline). */
  NO_HTML_SPANS: 0x0040,
  /** Support GitHub-style tables. */
  TABLES: 0x0100,
  /** Support strike-through spans (text enclosed in tilde marks, e.g. ~foo bar~). */
  STRIKETHROUGH: 0x0200,
  /** Support WWW autolinks (without proto; just 'www.') */
  PERMISSIVE_WWW_AUTO_LINKS: 0x0400,
  /** Support GitHub-style task lists. */
  TASKLISTS: 0x0800,
  /** Support LaTeX math spans ($...$) and LaTeX display math spans ($$...$$) are supported. (Note though that the HTML renderer outputs them verbatim in a custom tag <x-equation>.) */
  LATEX_MATH_SPANS: 0x1000,
  /** Support wiki-style links ([[link label]] and [[target article|link label]]) are supported. (Note that the HTML renderer outputs them in a custom tag <x-wikilink>.) */
  WIKI_LINKS: 0x2000,
  /** Denotes an underline instead of an ordinary emphasis or strong emphasis. */
  UNDERLINE: 0x4000,
  /** Using hard line breaks. */
  HARD_SOFT_BREAKS: 0x8000,
  /** Shorthand for NO_HTML_BLOCKS | NO_HTML_SPANS */
  NO_HTML: 0x00200 | 0x0040,
  /** Default flags: COLLAPSE_WHITESPACE | PERMISSIVE_ATX_HEADERS | PERMISSIVE_URL_AUTO_LINKS | STRIKETHROUGH | TABLES | TASK_LISTS */
  DEFAULT: 0x0001 | 0x0002 | 0x0004 | 0x0100 | 0x0200 | 0x0800,
});

/**
 * NodeType is a type of the markdown node.
 */
export const NodeType = Object.freeze({
  QUOTE: 1,
  UL: 2,
  OL: 3,
  LI: 4,
  HR: 5,
  CODE_BLOCK: 7,
  HTML: 8,
  P: 9,
  TABLE: 10,
  THEAD: 11,
  TBODY: 12,
  TR: 13,
  TH: 14,
  TD: 15,
  H1: 21,
  H2: 22,
  H3: 23,
  H4: 24,
  H5: 25,
  H6: 26,
  EM: 30,
  STRONG: 31,
  A: 32,
  IMG: 33,
  CODE_SPAN: 34,
  DEL: 35,
  LATEXMATH: 36,
  LATEXMATH_DISPLAY: 37,
  WIKILINK: 38,
  U: 39,
});

/**
 * Validates the parse flags.
 * @param {number | object} parseFlags
 * @returns {number} validated parse flags
 */
function validateParseFlags(parseFlags) {
  if (typeof parseFlags === "number") {
    return parseFlags;
  }
  if (typeof parseFlags === "object" && parseFlags !== null) {
    const keys = (Array.isArray(parseFlags)
      ? parseFlags
      : Object.entries(parseFlags).filter(([, v]) =>
        !!v
      ).map(([k]) => k)).filter((k) => k in ParseFlags);
    return keys.reduce((acc, k) => acc | ParseFlags[k], 0);
  }
  return ParseFlags.DEFAULT;
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
 * Render markdown to string.
 * @param {string | Uint8Array} input markdown input
 * @param {import("./md4w").Options} options parse options
 * @param {number} renderer 0 for html, 2 for json
 * @returns {string}
 */
export function renderToString(input, options = {}, renderer = 0) {
  const data = typeof input === "string" ? enc.encode(input) : input;
  if (!(data instanceof Uint8Array)) {
    throw new TypeError("input must be a string or Uint8Array");
  }
  let estHtmlSize = Math.ceil(data.length * 1.5);
  let buffer = new Uint8Array(estHtmlSize);
  let len = 0;
  write = (chunk) => {
    const chunkSize = chunk.length;
    if (len + chunkSize > buffer.length) {
      const newBuffer = new Uint8Array(Math.ceil((len + chunkSize) * 1.5));
      newBuffer.set(buffer.subarray(0, len));
      buffer = newBuffer;
    }
    buffer.set(chunk, len);
    len += chunkSize;
  };
  const ptrLen = wasm.render(
    allocMem(data),
    validateParseFlags(options.parseFlags),
    Math.max(estHtmlSize, 512),
    typeof highlighter === "function" ? 1 : 0,
    renderer,
  );
  write(new Uint8Array(readMem(ptrLen)));
  write = null;
  return dec.decode(buffer.subarray(0, len));
}

/**
 * Converts markdown to html.
 * @param {string | Uint8Array} input markdown input
 * @param {import("./md4w").Options} options parse options
 * @returns {string} html output
 */
export function mdToHtml(input, options = {}) {
  return renderToString(input, options);
}

/**
 * Converts markdown to html as a readable stream.
 * @param {string | Uint8Array} input markdown input
 * @param {import("./md4w").Options} options parse options
 * @returns {ReadableStream<Uint8Array>} readable stream of html output
 */
export function mdToReadableHtml(input, options = {}) {
  return new ReadableStream({
    start(controller) {
      Promise.resolve().then(() => {
        write = (chunk) => controller.enqueue(new Uint8Array(chunk));
        const ptrLen = wasm.render(
          allocMem(typeof input === "string" ? enc.encode(input) : input),
          validateParseFlags(options.parseFlags),
          Math.max(1024, Number(options.bufferSize) || 4 * 1024),
          typeof highlighter === "function" ? 1 : 0,
          0, // html
        );
        write(new Uint8Array(readMem(ptrLen)));
        controller.close();
        write = null;
      });
    },
  });
}

/**
 * Converts markdown to json.
 * @param {string | Uint8Array} input markdown input
 * @param {import("./md4w").Options} options parse options
 * @returns {import("./md4w").MDTree} json output
 */
export function mdToJSON(input, options = {}) {
  const output = renderToString(input, options, 2);
  const children = JSON.parse(output);
  return { children };
}

/**
 * Sets the code highlighter for the code blocks.
 * @param {import("./md4w").CodeHighlighter} codeHighlighter
 * @returns {void}
 */
export function setCodeHighlighter(codeHighlighter) {
  highlighter = codeHighlighter;
}

/**
 * Initializes the wasm module.
 * @param {WebAssembly.Module | { allocMem: CallableFunction }} wasmModule
 * @returns {void}
 */
export function initWasm(wasmModule) {
  const env = {
    emitChunk: (ptrLen) => {
      write(readMem(ptrLen));
    },
    emitCodeBlock: (languagePtrLen, codePtrLen) => {
      const language = readMem(languagePtrLen);
      const code = readMem(codePtrLen);
      const output = highlighter(dec.decode(language), dec.decode(code));
      write(enc.encode(output));
    },
  };
  if (wasmModule instanceof WebAssembly.Module) {
    const instance = new WebAssembly.Instance(wasmModule, { env });
    wasm = instance.exports;
  } else if (wasmModule.default && wasmModule.allocMem) {
    // unwasm specific
    wasmModule.default(env);
    wasm = wasmModule;
  }
}
