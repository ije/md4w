# md4w

This is a WebAssembly port of
[md4c](https://github.com/mity/md4c) - a Markdown parser written in C.

- **Fast**: written in C, compiled to WebAssembly (it's about 2x faster than markdown-it, see [benchmark](#benchmark))
- **Simple**: input markdown, output HTML
- **Small**: `~25KB` gzipped
- **Universal**: works in any JavaScript environment
- **Extensible**: supports custom extensions (WIP)

## Usage

```js
// npm i md4w (Node.js, Bun, Cloudflare Workers, etc.)
import { init, mdToHtml } from "md4w";
// or use the CDN version (Deno, Modern Browsers)
import { init, mdToHtml } from "https://esm.sh/md4w";

await init();
console.log(mdToHtml("# Hello, World!"));
```

## Development

The wasm binding layer is written in [Zig](https://ziglang.org/), ensure you
have it installed. Also the [wasm-opt](https://github.com/WebAssembly/binaryen) is
required to optimize the generated WebAssembly binary.

```bash
zig build && deno test -A
```

## Benchmark

![](./test/benchmark-screenshot.png)

```bash
zig build && deno bench -A test/benchmark.js
```
