import { defineConfig } from "rolldown";

export default defineConfig({
	input: {
		extension: "./src/extension.ts",
		server: "./src/server.ts",
		debugger: "./src/debug/debugAdapter.ts"
	},
	output: {
		format: "cjs",
		minify: true,
		dir: "./build"
	},
	external: ["vscode"],
	tsconfig: "tsconfig.json",
	checks: {
		eval: false
	}
});
