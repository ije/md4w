import {
  assertStringIncludes,
} from "https://deno.land/std@0.200.0/testing/asserts.ts";
import MarkdownIt from "https://esm.sh/markdown-it@14.0.0";
import { init, mdToHtml } from "../js/index.js";

const markdownit = MarkdownIt();
await init();

const md = await Deno.readFile(new URL("commonmark-spec.md", import.meta.url));
const mdStr = new TextDecoder().decode(md);

Deno.bench("md4c.wasm", () => {
  const html = mdToHtml(md);
  assertStringIncludes(html, "<h1>Introduction");
  assertStringIncludes(html, '<ol start="2');
  assertStringIncludes(html, "<code>stack_bottom");
});

Deno.bench("markdown-it", () => {
  const html = markdownit.render(mdStr);
  assertStringIncludes(html, "<h1>Introduction");
  assertStringIncludes(html, '<ol start="2');
  assertStringIncludes(html, "<code>stack_bottom");
});
