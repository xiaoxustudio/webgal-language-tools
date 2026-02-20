import { defineConfig } from "rolldown";

export default defineConfig({
	input: {
		extension: "./src/extension.ts",
		server: "./src/server.ts"
	},
	output: {
		format: "cjs",
		minify: true
	},
	external: ["vscode"],
	tsconfig: "tsconfig.json",
	checks: {
		eval: false
	}
});
