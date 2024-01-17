# md4w

This is a [WebAssembly](https://webassembly.org/) port of
[md4c](https://github.com/mity/md4c) - a Markdown parser written in C.

## Usage

```js
// npm i md4w
import { init, mdToHtml } from "md4w";
// or use the CDN
import { init, mdToHtml } from "https://esm.sh/md4w";


await init();
console.log(mdToHtml("# Hello, World!"));
```

## Development

The wasm binding layer is written in [Zig](https://ziglang.org/), ensure you
have it installed.

```bash
zig build && deno run -A js/test.js
```
