import {
  assertStringIncludes,
} from "https://deno.land/std@0.200.0/testing/asserts.ts";
import { init, mdToHtml, mdToReadableHtml } from "../js/index.js";

await init();

Deno.test("markdown to html", async () => {
  // const md = await Deno.readFile(
  //   new URL("commonmark-spec.md", import.meta.url),
  // );
  const md = "# Hello, world!";
  const html = mdToHtml(md);
  console.log(html);
  assertStringIncludes(html, "<h1>Hello, world!");
  // assertStringIncludes(html, '<ol start="2');
  // assertStringIncludes(html, "<code>stack_bottom");
});

Deno.test("markdown to html stream", async () => {
  // const md = await Deno.readFile(
  //   new URL("commonmark-spec.md", import.meta.url),
  // );
  const md = "# Hello, world!";
  const stream = mdToReadableHtml(md);
  const html = await new Response(stream).text();
  console.log(html);
  assertStringIncludes(html, "<h1>Hello, world!");
  // assertStringIncludes(html, '<ol start="2');
  // assertStringIncludes(html, "<code>stack_bottom");
});
