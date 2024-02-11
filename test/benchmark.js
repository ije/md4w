import MarkdownIt from "https://esm.sh/markdown-it@14.0.0";
import { init as initMarkdownWasm, parse } from "https://esm.sh/markdown-wasm-es@1.2.1";
import { init, mdToHtml } from "../js/index.js";

await init();
await initMarkdownWasm();
const markdownit = MarkdownIt();
const md = await Deno.readFile(new URL("commonmark-spec.md", import.meta.url));
const mdStr = new TextDecoder().decode(md);

// warmup runs
mdToHtml(md);
parse(md);
markdownit.render(mdStr);

Deno.bench("md4w", () => {
  mdToHtml(md);
});

Deno.bench("markdown-wasm", () => {
  parse(md);
});

Deno.bench("markdown-it", () => {
  markdownit.render(mdStr);
});
