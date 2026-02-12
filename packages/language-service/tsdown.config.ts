import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/node.ts", "src/monaco.ts"],
	format: ["esm", "cjs"],
	dts: true,
	outDir: "build",
	fixedExtension: true,
	external: [
		"monaco-editor",
		"monaco-languageclient",
		"vscode-languageclient",
		"vscode-ws-jsonrpc",
		"vscode-languageclient/browser.js"
	]
});
