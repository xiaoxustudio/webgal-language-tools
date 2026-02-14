// packages/vscode/scripts/build.js
const esbuild = require("esbuild");
const alias = require("esbuild-plugin-alias");

const production = process.argv.includes("--production");

esbuild
	.build({
		entryPoints: {
			client: "./src/extension.ts",
			server: "./src/server.ts"
		},
		bundle: true,
		platform: "node",
		format: "cjs",
		outdir: "./dist",
		minify: production,
		sourcemap: !production,
		external: [
			"vscode",
			"@webgal/language-service",
			"@webgal/language-service/node"
		],
		plugins: [
			alias({
				tsconfig: "../tsconfig.json"
			})
		]
	})
	.catch(() => process.exit(1));
