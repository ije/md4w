import { mdToHtml } from "md4w";
import { LightElement } from "@karesztrk/webcomponent-base";

class MarkdownContent extends LightElement {
  /**
   * @type {string| undefined} content
   */
  content;

  constructor() {
    super();

    this.addEventListener("render", (e) => {
      if (e instanceof CustomEvent) {
        const content = e.detail;
        this.content = content;
        this.render();
      }
    });
  }

  render() {
    if (this.content) {
      this.innerHTML = mdToHtml(this.content);
    }
  }
}

export default MarkdownContent;
