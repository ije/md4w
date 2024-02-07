import {
  assertStringIncludes as assertIncludes,
} from "https://deno.land/std@0.200.0/testing/asserts.ts";
import { getHighlighter } from "https://esm.sh/shiki@1.0.0-rc.0/bundle/web";
import {
  init,
  mdToHtml,
  mdToReadableHtml,
  setCodeHighlighter,
} from "../js/index.js";

await init();

Deno.test("markdown to html", async (t) => {
  await t.step("commonmark-spec", async () => {
    const md = await Deno.readFile(
      new URL("commonmark-spec.md", import.meta.url),
    );
    const html = mdToHtml(md);
    assertIncludes(html, "<h1>Introduction"); // main heading
    assertIncludes(html, '<ol start="2"');
    assertIncludes(html, "<p>After we're done"); // last paragraph
  });

  await t.step("title", () => {
    for (let i = 1; i <= 6; i++) {
      const html = mdToHtml("#".repeat(i) + " Hello, world! " + "#".repeat(i));
      assertIncludes(html, `<h${i}>Hello, world! <a class="anchor"`);
      assertIncludes(html, 'id="hello-world" href="#hello-world"');
      assertIncludes(html, `</a></h${i}>`);
    }
  });

  await t.step("links", () => {
    {
      const html = mdToHtml("[ESM>CDN](https://esm.sh)");
      assertIncludes(html, '<a href="https://esm.sh"');
      assertIncludes(html, "ESM&gt;CDN</a>");
    }

    {
      const html = mdToHtml('[ESM>CDN](https://esm.sh "Global ESM CDN")');
      assertIncludes(html, '<a href="https://esm.sh"');
      assertIncludes(html, '" title="Global ESM CDN"');
      assertIncludes(html, "ESM&gt;CDN</a>");
    }

    {
      const html = mdToHtml("[`code`](#code)");
      assertIncludes(html, '<a href="#code"');
      assertIncludes(html, "<code>code</code></a>");
    }
  });

  // todo: add more tests
});

Deno.test("markdown to html stream", async () => {
  const stream = mdToReadableHtml("# Hello, world!");
  const html = await new Response(stream).text();
  assertIncludes(html, "<h1>Hello, world!");
});

Deno.test("code hightlighter", async () => {
  const highlighter = await getHighlighter({
    themes: ["vitesse-dark"],
    langs: ["javascript"],
  });

  {
    const html = mdToHtml("# Code block example\n\n```\n<plain-text>Hey :)</plain-text>\n```");
    assertIncludes(html, "<h1>Code block example");
    assertIncludes(html, "<pre><code>");
    assertIncludes(html, "&lt;plain-text&gt;Hey :)&lt;/plain-text&gt;");
    assertIncludes(html, "</code></pre>");
  }

  {
    const html = mdToHtml(
      "# Code block example\n\n```html\n<h1>Hello, world!</h1>\n```",
    );
    assertIncludes(html, "<h1>Code block example");
    assertIncludes(html, '<pre><code class="language-html">');
    assertIncludes(html, "&lt;h1&gt;Hello, world!&lt;/h1&gt;");
    assertIncludes(html, "</code></pre>");
  }

  {
    const html = mdToHtml(
      "# Code block example\n\n```javascript\nconst a = 1;\n```",
    );
    assertIncludes(html, "<h1>Code block example");
    assertIncludes(html, '<pre><code class="language-javascript">');
    assertIncludes(html, "const a = 1;");
    assertIncludes(html, "</code></pre>");
  }

  setCodeHighlighter((lang, code) => {
    return highlighter.codeToHtml(code, { lang, theme: "vitesse-dark" });
  });

  {
    const html = mdToHtml(
      "# Code block example\n\n```javascript\nconst a = 1;\n```",
    );
    assertIncludes(html, "<h1>Code block example");
    assertIncludes(html, '<pre class="shiki vitesse-dark"');
    assertIncludes(html, '<code><span class="line"');
    assertIncludes(html, "</code></pre>");
  }

  {
    const html = mdToHtml("# Code block example\n\n```\n<plain-text>Hey :)</plain-text>\n```");
    assertIncludes(html, "<h1>Code block example");
    assertIncludes(html, "<pre><code>");
    assertIncludes(html, "&lt;plain-text&gt;Hey :)&lt;/plain-text&gt;");
    assertIncludes(html, "</code></pre>");
  }

  setCodeHighlighter(null);
});
