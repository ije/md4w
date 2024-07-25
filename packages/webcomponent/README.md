# md4wc

A Web component for rendering Markdown to HTML.

## Features

- ⚡ Insane fast rendering using [md4w](https://github.com/ije/md4w) (written in Zig)
- ✨ Declarative usage
- 💡 Lightweight
- 📘 ESM modules

## Installation

```sh
npm install md4wc md4c
# or pnpm install md4wc md4c
```

## How to use

### Register

Register the `MarkdownContent` and optionally `MarkdownContext`.

```js
import { MarkdownContent } from "md4wc";
customElements.define("md-content", new MarkdownContent());
```

Or you can use the static helper

```js
import { MarkdownContent } from "md4wc";
class YourComponent extends MarkdownContent {
  static {
    this.register("md-content", YourComponent);
  }
}

export default MarkdownContextComponent;
```

### Usage

Declare your markup and pass the `WASM` module path as `href`. This will initialize the `md4c` module under to hood. But you can do the same thing manually using `import { init } from "md4w`.

```html
<md-context href="/path/to/md4w.wasm">
  <md-content></md-content>
</md-context>
```

```js
const md = this.querySelector("md-content");
md.dispatchEvent(new CustomEvent("render", { detail: "Markdown content" }));
```

## References

- https://developer.mozilla.org/en-US/docs/Web/API/Web_components

```

```
