import { defineConfig } from "tsdown";

export default defineConfig({
	entry: {
		node: "src/node.ts",
		browser: "src/browser.ts",
		"browser-worker": "src/browser.worker.ts",
		utils: "src/utils/index.ts"
	},
	format: ["esm", "cjs"],
	dts: true,
	outDir: "build",
	fixedExtension: true,
	env: {
		WEBGAL_LSP_WS_PATH: "/webgal-lsp",
		WEBGAL_LSP_WS_PORT: 5882
	},
	deps: {
		neverBundle: ["fs", "fs/promises", "path", "url"]
	}
});
