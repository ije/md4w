import { init, mdToHtml } from "./index.js";

// test
if (import.meta.main) {
  await init();
  const md = await Deno.readFile(new URL("../README.md", import.meta.url));
  const html = mdToHtml(md);
  console.log(
    html,
    "ratio:",
    (new TextEncoder()).encode(html).length / md.length,
  );
}
