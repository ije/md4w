import {
  assertStringIncludes,
} from "https://deno.land/std@0.200.0/testing/asserts.ts";
import { init, mdToHtml } from "../js/index.js";

await init();

Deno.test("markdown to html", async () => {
  const md = await Deno.readFile(
    new URL("commonmark-spec.md", import.meta.url),
  );
  const html = mdToHtml(md);
  assertStringIncludes(html, "<h1>Introduction");
  assertStringIncludes(html, '<ol start="');
  assertStringIncludes(html, "<code>stack_bottom");
});
