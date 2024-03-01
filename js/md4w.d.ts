/**
 * ParseFlags is a set of flags for md4c parser.
 */
export enum ParseFlags {
  /** Collapse non-trivial whitespace into single space. */
  COLLAPSE_WHITESPACE,
  /** Do not require space in ATX headers ( ###header ) */
  PERMISSIVE_ATX_HEADERS,
  /** Recognize URLs as links. */
  PERMISSIVE_URL_AUTO_LINKS,
  /** Recognize e-mails as links.*/
  PERMISSIVE_EMAIL_AUTO_LINKS,
  /** Disable indented code blocks. (Only fenced code works.) */
  NO_INDENTED_CODE_BLOCKS,
  /** Disable raw HTML blocks. */
  NO_HTML_BLOCKS,
  /** Disable raw HTML (inline). */
  NO_HTML_SPANS,
  /** Support GitHub-style tables. */
  TABLES,
  /** Support strike-through spans (text enclosed in tilde marks, e.g. ~foo bar~). */
  STRIKETHROUGH,
  /** Support WWW autolinks (without proto; just 'www.') */
  PERMISSIVE_WWW_AUTO_LINKS,
  /** Support GitHub-style task lists. */
  TASKLISTS,
  /** Support LaTeX math spans ($...$) and LaTeX display math spans ($$...$$) are supported. (Note though that the HTML renderer outputs them verbatim in a custom tag <x-equation>.) */
  LATEX_MATH_SPANS,
  /** Support wiki-style links ([[link label]] and [[target article|link label]]) are supported. (Note that the HTML renderer outputs them in a custom tag <x-wikilink>.) */
  WIKI_LINKS,
  /** Denotes an underline instead of an ordinary emphasis or strong emphasis. */
  UNDERLINE,
  /** Using hard line breaks. */
  HARD_SOFT_BREAKS,
  /** Shorthand for NO_HTML_BLOCKS | NO_HTML_SPANS */
  NO_HTML,
  /** Default flags COLLAPSE_WHITESPACE | PERMISSIVE_ATX_HEADERS | PERMISSIVE_URL_AUTO_LINKS | STRIKETHROUGH | TABLES | TASK_LISTS */
  DEFAULT,
}

/**
 * Options for md4w.
 */
export interface Options {
  /** parse flags for the md4c parser. */
  parseFlags?:
    | number
    | Partial<Record<keyof typeof ParseFlags, true>>
    | Array<keyof typeof ParseFlags>;
  /** buffer size for the stream API. */
  bufferSize?: number;
}

/**
 * Converts markdown to html.
 * @param {string | Uint8Array} input markdown input
 * @param {Options} options
 * @returns {string} html output
 */
export function mdToHtml(input: string | Uint8Array, options?: Options): string;

/**
 * Converts markdown to html as a readable stream.
 * @param {string | Uint8Array} input markdown input
 * @param {Options} options
 * @returns {ReadableStream<Uint8Array>} readable stream of html output
 */
export function mdToReadableHtml(
  input: string | Uint8Array,
  options?: Options,
): ReadableStream<Uint8Array>;

/**
 * NodeType is a type of the markdown node.
 */
export enum NodeType {
  QUOTE = 1,
  UL = 2,
  OL = 3,
  LI = 4,
  HR = 5,
  CODE_BLOCK = 7,
  HTML = 8,
  P = 9,
  TABLE = 10,
  THEAD = 11,
  TBODY = 12,
  TR = 13,
  TH = 14,
  TD = 15,
  H1 = 21,
  H2 = 22,
  H3 = 23,
  H4 = 24,
  H5 = 25,
  H6 = 26,
  EM = 30,
  STRONG = 31,
  A = 32,
  IMG = 33,
  CODE_SPAN = 34,
  DEL = 35,
  LATEXMATH = 36,
  LATEXMATH_DISPLAY = 37,
  WIKILINK = 38,
  U = 39,
}

/**
 * NodeProps is a type of the node properties.
 */
export type NodeProps<T> = Record<string, undefined> & T;

/**
 * MDNode is a node in the markdown tree.
 */
export type MDNode = {
  readonly type: Exclude<
    number,
    | NodeType.CODE_BLOCK
    | NodeType.OL
    | NodeType.LI
    | NodeType.TH
    | NodeType.TD
    | NodeType.HR
    | NodeType.A
    | NodeType.IMG
    | NodeType.WIKILINK
  >;
  readonly props?: Record<string, undefined>;
  readonly children?: readonly (string | MDNode)[];
} | {
  readonly type: NodeType.CODE_BLOCK;
  readonly props?: NodeProps<{ lang: string }>;
  readonly children: readonly string[];
} | {
  readonly type: NodeType.OL;
  readonly props?: NodeProps<{ start: number }>;
  readonly children: readonly (string | MDNode)[];
} | {
  readonly type: NodeType.LI;
  readonly props?: NodeProps<{ isTask: boolean; done: boolean }>;
  readonly children: readonly (string | MDNode)[];
} | {
  readonly type: NodeType.TH | NodeType.TD;
  readonly props: NodeProps<{ align: "left" | "center" | "right" | "" }>;
  readonly children: readonly (string | MDNode)[];
} | {
  readonly type: NodeType.HR;
  readonly props: undefined;
  readonly children: undefined;
} | {
  readonly type: NodeType.A;
  readonly props: NodeProps<{ href: string; title?: string }>;
  readonly children: readonly (string | MDNode)[];
} | {
  readonly type: NodeType.IMG;
  readonly props: NodeProps<{ src: string; alt: string; title?: string }>;
  readonly children: undefined;
} | {
  readonly type: NodeType.WIKILINK;
  readonly props: NodeProps<{ target: string }>;
  readonly children: readonly (string | MDNode)[];
};

/**
 * MDTree is a parsed markdown tree.
 */
export interface MDTree {
  readonly children: MDNode[];
}

/**
 * Converts markdown to json.
 * @param {string | Uint8Array} input markdown input
 * @param {Options} options parse options
 * @returns {MDTree} json output
 */
export function mdToJSON(input: string | Uint8Array, options?: Options): MDTree;

/**
 * Code highlighter interface.
 */
export interface CodeHighlighter {
  (language: string, code: string): string;
}

/**
 * Sets the code highlighter for the code blocks.
 * @param {CodeHighlighter} highlighter
 * @returns {void}
 */
export function setCodeHighlighter(highlighter: CodeHighlighter): void;

/**
 * Initializes md4w wasm from fs/CDN.
 * @param {"fast" | "small" | URL | Uint8Array | ArrayBuffer | Response | Promise<Response> | string | undefined} wasm The wasm module.
 * @returns {Promise<void>}
 */
export async function init(
  wasm?: "fast" | "small" | URL | Uint8Array | ArrayBuffer | Response | Promise<Response> | string,
): Promise<void>;

/**
 * Initializes md4w wasm with a wasm module.
 * @param {WebAssembly.Module} wasmModule The wasm module.
 * @returns {void}
 */
export function initSync(wasmModule: WebAssembly.Module): void;
