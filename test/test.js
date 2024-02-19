import {
  assertEquals,
  assertStringIncludes as assertIncludes,
} from "https://deno.land/std@0.200.0/testing/asserts.ts";
import {
  init,
  mdToHtml,
  mdToJSON,
  mdToReadableHtml,
  NodeType,
  setCodeHighlighter,
} from "../js/index.js";

await init();

Deno.test("render to string", async (t) => {
  await t.step("commonmark-spec", async () => {
    const specMd = await Deno.readFile(
      new URL("commonmark-spec.md", import.meta.url),
    );
    const html = mdToHtml(specMd);
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
      assertIncludes(html, '<a href="https://esm.sh">ESM&gt;CDN</a>');
    }

    {
      const html = mdToHtml('[ESM>CDN](https://esm.sh "Global ESM CDN")');
      assertIncludes(
        html,
        '<a href="https://esm.sh" title="Global ESM CDN">ESM&gt;CDN</a>',
      );
    }

    {
      const html = mdToHtml("[`code`](#code)");
      assertIncludes(html, '<a href="#code"><code>code</code></a>');
    }
  });

  await t.step("images", () => {
    {
      const html = mdToHtml("![](https://esm.sh/logo.svg)");
      assertIncludes(html, '<img src="https://esm.sh/logo.svg" alt="">');
    }

    {
      const html = mdToHtml("![logo.svg](https://esm.sh/logo.svg 'ESM logo')");
      assertIncludes(
        html,
        '<img src="https://esm.sh/logo.svg" alt="logo.svg" title="ESM logo">',
      );
    }
  });

  // todo: add more tests
});

Deno.test("render to web stream", async () => {
  const specMd = await Deno.readFile(
    new URL("commonmark-spec.md", import.meta.url),
  );
  const html = mdToHtml(specMd);
  const stream = mdToReadableHtml(specMd);
  assertEquals(html, await new Response(stream).text());
});

Deno.test("using code hightlighter", async () => {
  // unknown language
  {
    const html = mdToHtml(
      "# Code block example\n\n```\n<plain-text>Hey :)</plain-text>\n```",
    );
    assertIncludes(html, "<h1>Code block example");
    assertIncludes(
      html,
      "<pre><code>&lt;plain-text&gt;Hey :)&lt;/plain-text&gt;\n</code></pre>",
    );
  }

  // html
  {
    const html = mdToHtml(
      "# Code block example\n\n```html\n<h1>Hello, world!</h1>\n```",
    );
    assertIncludes(html, "<h1>Code block example");
    assertIncludes(
      html,
      '<pre><code class="language-html">&lt;h1&gt;Hello, world!&lt;/h1&gt;\n</code></pre>',
    );
  }

  // javascript
  {
    const html = mdToHtml(
      "# Code block example\n\n```javascript\nconst foo = bar;\nconsole.log(foo);\n```",
    );
    assertIncludes(html, "<h1>Code block example");
    assertIncludes(
      html,
      '<pre><code class="language-javascript">const foo = bar;\nconsole.log(foo);\n</code></pre>',
    );
  }

  setCodeHighlighter((lang, code) => {
    return `<pre class="language-${lang}"><code>${code}</code></pre>`;
  });

  // javascript with highlighter
  {
    const html = mdToHtml(
      "# Code block example\n\n```javascript\nconst foo = bar;\nconsole.log(foo);\n```",
    );
    assertIncludes(html, "<h1>Code block example");
    assertIncludes(
      html,
      '<pre class="language-javascript"><code>const foo = bar;\nconsole.log(foo);\n</code></pre>',
    );
  }

  // ignore highlighter for unknown language
  {
    const html = mdToHtml(
      "# Code block example\n\n```\n<plain-text>Hey :)</plain-text>\n```",
    );
    assertIncludes(html, "<h1>Code block example");
    assertIncludes(
      html,
      "<pre><code>&lt;plain-text&gt;Hey :)&lt;/plain-text&gt;\n</code></pre>",
    );
  }

  setCodeHighlighter(null);
});

Deno.test("render to json", async () => {
  const simpleMd = `
# Jobs
Stay _foolish_, stay **hungry**!

![image.png](https://example.com/image.png 'this is an image')
![](https://example.com/image.png)

[Apple](https://apple.com)
<a href="https://apple.com">Apple</a>
<!-- comment -->

\`\`\`javascript
// comment

console.log('Hello, world!');
\`\`\`

---

- fruit
  - Apple
  - Orange
  - Banana

2. Apple
3. Orange
4. Banana

- [ ] Make apple pie
  - [x] Buy apples
  - [ ] Make the crust

| Command | Description |
| :--- | ---: |
| \`git status\` | List all *new or modified* files |
| \`git diff\` | Show file differences that **haven't been** staged |

This is hardly a "corner case," for some reason.
`;

  const tree = mdToJSON(simpleMd);
  assertEquals(tree, {
    children: [
      { type: NodeType.H1, children: ["Jobs"] },
      {
        type: NodeType.P,
        children: [
          "Stay ",
          { type: NodeType.EM, children: ["foolish"] },
          ", stay ",
          { type: NodeType.STRONG, children: ["hungry"] },
          "!",
        ],
      },
      {
        type: NodeType.P,
        children: [
          {
            type: NodeType.IMG,
            props: {
              src: "https://example.com/image.png",
              alt: "image.png",
              title: "this is an image",
            },
          },
          "\n",
          {
            type: NodeType.IMG,
            props: {
              src: "https://example.com/image.png",
              alt: "",
            },
          },
        ],
      },
      {
        type: NodeType.P,
        children: [
          {
            type: NodeType.A,
            props: { href: "https://apple.com" },
            children: ["Apple"],
          },
          "\n",
          { type: NodeType.HTML, children: ['<a href="https://apple.com">'] },
          "Apple",
          { type: NodeType.HTML, children: ["</a>"] },
        ],
      },
      {
        type: NodeType.HTML,
        children: [
          "<!-- comment -->",
          "\n",
        ],
      },
      {
        type: NodeType.CODE_BLOCK,
        props: {
          lang: "javascript",
        },
        children: [
          "// comment",
          "\n",
          "\n",
          "console.log('Hello, world!');",
          "\n",
        ],
      },
      {
        type: NodeType.HR,
      },
      {
        type: NodeType.UL,
        children: [
          {
            type: NodeType.LI,
            children: [
              "fruit",
              {
                type: NodeType.UL,
                children: [
                  {
                    type: NodeType.LI,
                    children: [
                      "Apple",
                    ],
                  },
                  {
                    type: NodeType.LI,
                    children: [
                      "Orange",
                    ],
                  },
                  {
                    type: NodeType.LI,
                    children: [
                      "Banana",
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: NodeType.OL,
        props: {
          start: 2,
        },
        children: [
          {
            children: [
              "Apple",
            ],
            type: NodeType.LI,
          },
          {
            children: [
              "Orange",
            ],
            type: NodeType.LI,
          },
          {
            children: [
              "Banana",
            ],
            type: NodeType.LI,
          },
        ],
      },
      {
        type: NodeType.UL,
        children: [
          {
            type: NodeType.LI,
            props: {
              done: false,
              isTask: true,
            },
            children: [
              "Make apple pie",
              {
                type: NodeType.UL,
                children: [
                  {
                    type: NodeType.LI,
                    props: {
                      done: true,
                      isTask: true,
                    },
                    children: [
                      "Buy apples",
                    ],
                  },
                  {
                    type: NodeType.LI,
                    props: {
                      done: false,
                      isTask: true,
                    },
                    children: [
                      "Make the crust",
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: NodeType.TABLE,
        children: [
          {
            type: NodeType.THEAD,
            children: [
              {
                type: NodeType.TR,
                children: [
                  {
                    type: NodeType.TH,
                    props: {
                      align: "left",
                    },
                    children: [
                      "Command",
                    ],
                  },
                  {
                    type: NodeType.TH,
                    props: {
                      align: "right",
                    },
                    children: [
                      "Description",
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: NodeType.TBODY,
            children: [
              {
                type: NodeType.TR,
                children: [
                  {
                    type: NodeType.TD,
                    props: {
                      align: "left",
                    },
                    children: [
                      {
                        type: NodeType.CODE_SPAN,
                        children: [
                          "git status",
                        ],
                      },
                    ],
                  },
                  {
                    type: NodeType.TD,
                    props: {
                      align: "right",
                    },
                    children: [
                      "List all ",
                      {
                        type: NodeType.EM,
                        children: [
                          "new or modified",
                        ],
                      },
                      " files",
                    ],
                  },
                ],
              },
              {
                type: NodeType.TR,
                children: [
                  {
                    type: NodeType.TD,
                    props: {
                      align: "left",
                    },
                    children: [
                      {
                        type: NodeType.CODE_SPAN,
                        children: [
                          "git diff",
                        ],
                      },
                    ],
                  },
                  {
                    type: NodeType.TD,
                    props: {
                      align: "right",
                    },
                    children: [
                      "Show file differences that ",
                      {
                        type: NodeType.STRONG,
                        children: [
                          "haven't been",
                        ],
                      },
                      " staged",
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: NodeType.P,
        children: [
          "This is hardly a \"corner case,\" for some reason.",
        ],
      }
    ],
  });

  // Make sure spec can be parsed
  // const specMd = await Deno.readFile(
  //   new URL("commonmark-spec.md", import.meta.url),
  // );
  // mdToJSON(specMd);
});
