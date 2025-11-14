````typescript
function renderedMarked(text) {
	// Simple markdown rendering logic (for demonstration purposes)
	if (!text) return ''

	return text

		.replace(/__(.*?)__/g, '<strong>$1</strong>') // bold
		.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // bold
		.replace(/_(.*?)_/g, '<em>$1</em>') // italic
		.replace(/\*(.*?)\*/g, '<em>$1</em>') // italic
		.replace(/`(.*?)`/g, '<code>$1</code>') // inline code
		.replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>') // code block
}
````

````typescript
// 只保留代码
markdown.replace(/```(?:[a-zA-Z0-9_-]+)?[ \t]*\r?\n([\s\S]*?)```/g, '$1')
````

````typescript
// 代码块（丢弃可见的语言名，只保留代码）
markdown.replace(/```(?:[a-zA-Z0-9_-]+)?[ \t]*\r?\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
````
