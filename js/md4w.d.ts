/**
 * ParseFlags is a set of flags for md4c parser.
 */
export enum ParseFlags {
  /** Collapse non-trivial whitespace into single space. */
  COLLAPSE_WHITESPACE = 0x0001,
  /** Do not require space in ATX headers ( ###header ) */
  PERMISSIVE_ATX_HEADERS = 0x0002,
  /** Recognize URLs as links. */
  PERMISSIVE_URL_AUTO_LINKS = 0x0004,
  /** Recognize e-mails as links.*/
  PERMISSIVE_EMAIL_AUTO_LINKS = 0x0008,
  /** Disable indented code blocks. (Only fenced code works.) */
  NO_INDENTED_CODE_BLOCKS = 0x0010,
  /** Disable raw HTML blocks. */
  NO_HTML_BLOCKS = 0x0020,
  /** Disable raw HTML (inline). */
  NO_HTML_SPANS = 0x0040,
  /** Support GitHub-style tables. */
  TABLES = 0x0100,
  /** Support strike-through spans (text enclosed in tilde marks, e.g. ~foo bar~). */
  STRIKE_THROUGH = 0x0200,
  /** Support WWW autolinks (without proto; just 'www.') */
  PERMISSIVE_WWW_AUTO_LINKS = 0x0400,
  /** Support GitHub-style task lists. */
  TASKLISTS = 0x0800,
  /** Support LaTeX math spans ($...$) and LaTeX display math spans ($$...$$) are supported. (Note though that the HTML renderer outputs them verbatim in a custom tag <x-equation>.) */
  LATEX_MATHS_PANS = 0x1000,
  /** Support wiki-style links ([[link label]] and [[target article|link label]]) are supported. (Note that the HTML renderer outputs them in a custom tag <x-wikilink>.) */
  WIKI_LINKS = 0x2000,
  /** Denotes an underline instead of an ordinary emphasis or strong emphasis. */
  UNDERLINE = 0x4000,
  /** Using hard line breaks. */
  HARD_SOFT_BREAKS = 0x8000,
  /** Shorthand for NO_HTML_BLOCKS | NO_HTML_SPANS */
  NO_HTML = 0x00200 | 0x0040,
  /** Default flags COLLAPSE_WHITESPACE | PERMISSIVE_ATX_HEADERS | PERMISSIVE_URL_AUTO_LINKS | STRIKETHROUGH | TABLES | TASK_LISTS */
  DEFAULT = 0x0001 | 0x0002 | 0x0004 | 0x0100 | 0x0200 | 0x0800,
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
 * Code highlighter interface.
 */
export interface CodeHighlighter {
  (language: string, code: string): string | Uint8Array;
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
