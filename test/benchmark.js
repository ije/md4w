import MarkdownIt from "https://esm.sh/markdown-it@14.0.0";
import { init, mdToHtml } from "../js/index.js";

const markdownit = MarkdownIt();
await init();

const md = await Deno.readFile(new URL("commonmark-spec.md", import.meta.url));
const mdStr = new TextDecoder().decode(md);

// warmup runs
mdToHtml(md);
markdownit.render(mdStr);

Deno.bench("md4c.wasm", () => {
  mdToHtml(md);
});

Deno.bench("markdown-it", () => {
  markdownit.render(mdStr);
});
