# Changelog

## v0.1.x (current working branch)

- Fix html/url escaping
- Fix code block highlighting by lines
- Add `mdToJSON` function to parse markdown to JSON (#4)
  ```js
  const traverse = (node) => {
    // text node
    if (typeof node === "string") {
      console.log(node);
      return;
    }

    // element type
    console.log(node.type);

    // element attributes (may be undefined)
    console.log(node.props);

    // element children (may be undefined)
    node.children?.forEach(traverse);
  };

  const tree = mdToJSON("Stay _foolish_, stay **hungry**!");
  traverse(tree);
  ```

## v0.1.0

By implementing a html renderer in Zig, we removed the dependency on
`md4c-html.c` and some libc functions. The compiled wasm binary is now **50%
smaller** (from 98KB to 52KB).

Since we are now using a custom html renderer, we can also add some features
that are not supported by `md4c-html.c`, such as:

- Add anchor to the headers
  ```
  '# Hello World!' -> <h1>Hello World!<a class="anchor" id="hello-world" href="#hello-world"></h1>
  ```
- Sync the buffer between the host and the wasm module that introduces a
  streaming API for large markdown files or a http server to stream the
  response.
  ```js
  import { mdToReadableHtml } from "md4w";

  const largeMarkdown = `# Hello, World!\n`.repeat(1_000_000);
  const readable = mdToReadableHtml(largeMarkdown);

  // write to file
  const file = await Deno.open("/foo/bar.html", { write: true, create: true });
  readable.pipeTo(file.writable);

  // or send to client
  const response = new Response(readable, {
    headers: { "Content-Type": "text/html" },
  });
  ```
- And we can now send the code blocks to the host to highlight it. You can call
  the `setCodeHighlighter` function to add any code highlighter you like.
  ```js
  import { setCodeHighlighter } from "md4w";

  setCodeHighlighter((code, lang) => {
    return `<pre><code class="language-js"><span style="color:#green">...<span></code></pre>`;
  });
  ```

## v0.0.1

Ported [md4c](https://github.com/mity/md4c) to Zig.
