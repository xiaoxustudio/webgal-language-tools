import { defineConfig } from "tsdown";

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/node.ts",
		"src/monaco/index.ts",
		"src/syntaxes.ts",
		"src/themes.ts"
	],
	format: ["esm", "cjs"],
	dts: true,
	outDir: "build",
	fixedExtension: true,
	external: ["monaco-editor", "vscode"]
});
