// @ts-nocheck
import { createServer } from "http";
import path from "path";
import { createNodeFileSystem } from "@webgal/language-service/node";
import { setFeatureOptions } from "@webgal/language-server/utils";

const lspPort = Number(process.env.WEBGAL_LSP_PORT ?? "5882");
const lspPath = process.env.WEBGAL_LSP_PATH ?? "/webgal-lsp";
const apiPort = Number(process.env.WEBGAL_PLAYGROUND_PORT ?? "3000");
const treeRootUri = process.env.WEBGAL_PLAYGROUND_ROOT_URI ?? "file:///game";
const sourceRoot =
	process.env.WEBGAL_PLAYGROUND_ROOT ??
	path.resolve(process.cwd(), "../../example/game");

const vfs = createNodeFileSystem({ root: sourceRoot });
setFeatureOptions({
	completion: true,
	hover: true,
	documentLink: true,
	resourceCompletion: true,
	diagnostics: true,
	foldingRange: true,
	definition: true
});
const textExtensions = new Set([
	".txt",
	".json",
	".css",
	".scss",
	".js",
	".jsx",
	".ts",
	".tsx",
	".md",
	".yaml",
	".yml"
]);

const shouldReadContent = (name: string) =>
	textExtensions.has(path.extname(name).toLowerCase());

const loadDirectory = async (dir: string) => {
	const entries = await vfs.readDirectory(dir);
	if (!entries) return;
	for (const entry of entries) {
		const entryPath = path.join(dir, entry.name);
		if (entry.isDirectory) {
			await loadDirectory(entryPath);
		} else if (shouldReadContent(entry.name)) {
			await vfs.readFile(entryPath);
		}
	}
};

let cachedTree: any = null;
let cachedAt = 0;
const cacheTtlMs = 2000;

const getTreePayload = async (forceRefresh: boolean) => {
	if (!forceRefresh && cachedTree && Date.now() - cachedAt < cacheTtlMs) {
		return { root: treeRootUri, tree: cachedTree };
	}
	await loadDirectory(sourceRoot);
	cachedTree = vfs.getTree();
	cachedAt = Date.now();
	return { root: treeRootUri, tree: cachedTree };
};

const ensureLspServer = async () => {
	const ensureArg = (prefix: string | null, value: string) => {
		const exists = process.argv.some((arg) =>
			prefix ? arg.startsWith(prefix) : arg === value
		);
		if (!exists) {
			process.argv.push(value);
		}
	};
	ensureArg(null, "--ws");
	ensureArg("--wsPort=", `--wsPort=${lspPort}`);
	ensureArg("--wsPath=", `--wsPath=${lspPath}`);
	await import("@webgal/language-server");
};

void ensureLspServer();

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET,OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type"
};

const server = createServer(async (req, res) => {
	const requestUrl = new URL(
		req.url ?? "/",
		`http://${req.headers.host ?? "localhost"}`
	);
	if (req.method === "OPTIONS") {
		res.writeHead(204, corsHeaders);
		res.end();
		return;
	}
	if (req.method === "GET" && requestUrl.pathname === "/api/tree") {
		try {
			const forceRefresh = requestUrl.searchParams.get("refresh") === "1";
			const payload = await getTreePayload(forceRefresh);
			res.writeHead(200, {
				"Content-Type": "application/json; charset=utf-8",
				...corsHeaders
			});
			res.end(JSON.stringify(payload));
		} catch (error) {
			res.writeHead(500, {
				"Content-Type": "application/json; charset=utf-8",
				...corsHeaders
			});
			res.end(
				JSON.stringify({
					message:
						error instanceof Error ? error.message : "Unknown error"
				})
			);
		}
		return;
	}
	res.writeHead(404, { "Content-Type": "text/plain", ...corsHeaders });
	res.end("Not Found");
});

server.listen(apiPort);
