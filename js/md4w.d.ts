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
  EM = 100,
  STRONG = 101,
  A = 102,
  IMG = 103,
  CODE_SPAN = 104,
  DEL = 105,
  LATEXMATH = 106,
  LATEXMATH_DISPLAY = 107,
  WIKILINK = 108,
  U = 109,
}

/**
 * MDNode is a node in the markdown tree.
 */
export type MDNode = {
  readonly type: number;
  readonly children: readonly (string | MDNode)[];
} | {
  readonly type: NodeType.HR;
} | {
  readonly type: NodeType.OL;
  readonly children: readonly (string | MDNode)[];
  readonly props?: { start: number };
} | {
  readonly type: NodeType.CODE_BLOCK;
  readonly children: readonly (string | MDNode)[];
  readonly props?: { lang: string };
} | {
  readonly type: NodeType.LI;
  readonly children: readonly (string | MDNode)[];
  readonly props?: { isTask: boolean; done: boolean };
} | {
  readonly type: NodeType.TH | NodeType.TD;
  readonly children: readonly (string | MDNode)[];
  readonly props: { align: "left" | "center" | "right" | "" };
} | {
  readonly type: NodeType.A;
  readonly children: readonly (string | MDNode)[];
  readonly props: { href: string; title?: string };
} | {
  readonly type: NodeType.IMG;
  readonly props: { src: string; alt: string; title?: string };
} | {
  readonly type: NodeType.WIKILINK;
  readonly children: readonly (string | MDNode)[];
  readonly props: { target: string };
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
 * Initializes the wasm module.
 * @returns {Promise<void>}
 */
export function init(): Promise<void>;
