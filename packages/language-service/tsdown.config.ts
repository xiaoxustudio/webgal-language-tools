import { defineConfig } from "tsdown";

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/node.ts",
		"src/monaco.ts",
		"src/monaco-init.ts",
		"src/syntaxes.ts",
		"src/themes.ts"
	],
	format: ["esm", "cjs"],
	dts: true,
	outDir: "build",
	fixedExtension: true,
	external: [
		"monaco-editor",
		"monaco-languageclient",
		"vscode-languageclient",
		"vscode-ws-jsonrpc",
		"vscode-languageclient/browser.js",
		"@codingame/monaco-vscode-api",
		"@codingame/monaco-vscode-api/extensions",
		"vscode/localExtensionHost",
		"@codingame/monaco-vscode-languages-service-override",
		"@codingame/monaco-vscode-theme-service-override",
		"@codingame/monaco-vscode-textmate-service-override"
	]
});
