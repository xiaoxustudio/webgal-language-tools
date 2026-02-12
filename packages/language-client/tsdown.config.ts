import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/node.ts"],
	format: ["esm", "cjs"],
	dts: true,
	outDir: "build",
	fixedExtension: true
});
