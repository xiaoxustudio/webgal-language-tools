// packages/vscode/scripts/build.js
const esbuild = require("esbuild");
const alias = require("esbuild-plugin-alias");

const production = process.argv.includes("--production");

esbuild
	.build({
		entryPoints: {
			client: "./src/extension.ts",
			server: "../language-server/src/index.ts",
		},
		bundle: true,
		platform: "node",
		format: "cjs",
		outdir: "./dist",
		minify: production,
		sourcemap: !production,
		external: [
			"vscode",
			"@webgal/language-client",
			"@webgal/language-client/node"
		],
		plugins: [
			alias({
				tsconfig: "../tsconfig.json",
			}),
		],
	})
	.catch(() => process.exit(1));

// require("esbuild")
// 	.context({
// 		sourcemap: true,
// 		bundle: true,
// 		metafile: process.argv.includes("--metafile"),
// 		outdir: "./dist",
// 		external: ["vscode"],
// 		format: "cjs",
// 		platform: "node",
// 		tsconfig: "./tsconfig.json",
// 		define: { "process.env.NODE_ENV": '"production"' },
// 		minify: process.argv.includes("--minify"),
// 		plugins: [
// 			{
// 				name: "umd2esm",
// 				setup(build) {
// 					build.onResolve(
// 						{ filter: /^(vscode-.*-languageservice|jsonc-parser)/ },
// 						args => {
// 							const pathUmdMay = require.resolve(args.path, {
// 								paths: [args.resolveDir],
// 							});
// 							// Call twice the replace is to solve the problem of the path in Windows
// 							const pathEsm = pathUmdMay
// 								.replace("/umd/", "/esm/")
// 								.replace("\\umd\\", "\\esm\\");
// 							return { path: pathEsm };
// 						},
// 					);
// 				},
// 			},
// 		],
// 	})
// 	.then(async ctx => {
// 		console.log("building...");
// 		if (process.argv.includes("--watch")) {
// 			await ctx.watch();
// 			console.log("watching...");
// 		} else {
// 			await ctx.rebuild();
// 			await ctx.dispose();
// 			console.log("finished.");
// 		}
// 	});
