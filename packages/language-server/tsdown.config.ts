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
	fixedExtension: true
});
