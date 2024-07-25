import { init } from "md4w";
import { LightElement } from "@karesztrk/webcomponent-base";

class MarkdownContext extends LightElement {
  constructor() {
    super();
    this.init();
  }

  /**
   * Initializes the context.
   * @returns {Promise<void>} href
   */
  init() {
    return new Promise((resolve, reject) => {
      if (this.href) {
        init(this.href)
          .then(() => {
            resolve();
          })
          .catch(() => reject());
      } else {
        reject();
      }
    });
  }

  get href() {
    return this.getAttribute("href");
  }

  render() {}
}

export default MarkdownContext;
