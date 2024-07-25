declare module 'md4wc' {
	import type { LightElement } from '@karesztrk/webcomponent-base';
	export default MarkdownContext;
	class MarkdownContext extends LightElement {
		/**
		 * Initializes the context.
		 * @returns href
		 */
		init(): Promise<void>;
		get href(): string | null;
	}
	export default MarkdownContent;
	class MarkdownContent extends LightElement {
		/**
		 * @type {string| undefined} content
		 */
		content: string | undefined;
	}

	export { MarkdownContext, MarkdownContent };
}

//# sourceMappingURL=index.d.ts.map