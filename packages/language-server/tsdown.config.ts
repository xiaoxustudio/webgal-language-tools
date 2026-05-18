import { defineConfig } from "tsdown";

export default defineConfig({
	entry: {
		utils: "src/utils/index.ts",
		browser: "src/browser.ts",
		node: "src/node.ts"
	},
	format: ["esm", "cjs"],
	dts: true,
	outDir: "build",
	fixedExtension: true,
	env: {
		WEBGAL_LSP_WS_PATH: "/webgal-lsp",
		WEBGAL_LSP_WS_PORT: 5882
	}
});
