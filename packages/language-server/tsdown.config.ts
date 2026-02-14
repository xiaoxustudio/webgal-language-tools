import { defineConfig } from "tsdown";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		utils: "src/utils/index.ts",
		browser: "src/browser.ts"
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
