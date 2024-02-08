const enc = new TextEncoder();
const dec = new TextDecoder();

let wasm;
let pull;
let highlighter;

/**
 * ParseFlags is a set of flags for md4c parser.
 */
export const ParseFlags = {
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
};

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
 * @param {import("./md4w").Options} options parse options
 * @returns {string} html output
 */
export function mdToHtml(input, options = {}) {
  const chunks = [];
  pull = (chunk) => chunks.push(chunk);
  wasm.render(
    allocMem(toUint8Array(input)),
    validateParseFlags(options.parseFlags),
    64 * 1024, // 64KB buffer size
    typeof highlighter === "function" ? 1 : 0,
  );
  pull = null;
  if (chunks.length === 0) {
    return "";
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
 * @param {import("./md4w").Options} options parse options
 * @returns {ReadableStream<Uint8Array>} readable stream of html output
 */
export function mdToReadableHtml(input, options = {}) {
  return new ReadableStream({
    start(controller) {
      pull = (chunk) => controller.enqueue(chunk);
      wasm.render(
        allocMem(typeof input === "string" ? enc.encode(input) : input),
        validateParseFlags(options.parseFlags),
        Math.max(1024, Number(options.bufferSize) || 1024),
        typeof highlighter === "function" ? 1 : 0,
      );
      pull = null;
      controller.close();
    },
  });
}

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
 * Sets the code highlighter for the code blocks.
 * @param {import("./md4w").CodeHighlighter} codeHighlighter
 * @returns {void}
 */
export function setCodeHighlighter(codeHighlighter) {
  highlighter = codeHighlighter;
}

/**
 * Initializes the wasm module.
 * @param {WebAssembly.Module | { render: CallableFunction }} wasmModule
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
