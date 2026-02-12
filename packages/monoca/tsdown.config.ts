import { defineConfig } from "tsdown";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		serverWorker: "src/serverWorker.ts"
	},
	format: ["esm", "cjs"],
	dts: true,
	outDir: "build",
	fixedExtension: true
});
