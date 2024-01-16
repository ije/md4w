# md4w

This is a [WebAssembly](https://webassembly.org/) port of [md4c](https://github.com/mity/md4c) - a Markdown parser written in C.


## Development

The wasm binding layer is written in [Zig](https://ziglang.org/), ensure you have it installed.

```bash
zig build && deno run -A md4c.js
```
