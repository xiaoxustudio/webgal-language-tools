import {
	createConnection,
	createServer,
	createSimpleProject
} from "@volar/language-server/node";
import type { InitializeParams } from "@volar/language-server";
import type { LanguagePlugin } from "@volar/language-core";
import { URI } from "vscode-uri";
import {
	createConnection as createVscodeConnection,
	type Connection
} from "vscode-languageserver/node";
import { IncomingMessage } from "http";
import type { StartServerOptions } from "@/types";
import { createWebgalService, registerConnectionHandlers } from "./events";
import {
	applyClientCapabilities,
	applyServerCapabilities
} from "./events/onInitialize";
import {
	bindCoreFileAccessorToClientVfs,
	createClientVfsFileSystem,
	createWebgalVirtualCode,
	updateWebgalVirtualCode,
	setFeatureOptions
} from "@/utils";

type WsOptions = {
	port: number;
	path: string | null;
};

const args = process.argv.slice(2);
const useWs = args.some((arg) => arg === "--ws" || arg.startsWith("--ws="));
if (useWs) {
	void startWebSocketServer(getWsOptions(args));
} else {
	startServer(createConnection(), false);
}

/**
 * 启动WebSocket服务器
 *
 * @param options - WebSocket服务器配置选项，包含端口和路径等信息
 * @returns void
 */
async function startWebSocketServer(options: WsOptions) {
	const [
		{ WebSocketServer },
		{ WebSocketMessageReader, WebSocketMessageWriter, toSocket }
	] = await Promise.all([import("ws"), import("vscode-ws-jsonrpc")]);
	const server = new WebSocketServer({ port: options.port });
	server.on("connection", (socket: WebSocket, request: IncomingMessage) => {
		if (options.path && request.url && request.url !== options.path) {
			socket.close();
			return;
		}
		const reader = new WebSocketMessageReader(toSocket(socket));
		const writer = new WebSocketMessageWriter(toSocket(socket));
		const connection = createVscodeConnection(reader, writer);
		startServer(connection, true);
		reader.onClose(() => connection.dispose());
	});
}

function getWsOptions(argv: string[]): WsOptions {
	let port = Number(process.env.WEBGAL_LSP_WS_PORT ?? 5882);
	let path = process.env.WEBGAL_LSP_WS_PATH ?? "/webgal-lsp";
	for (const arg of argv) {
		if (arg.startsWith("--ws=")) {
			const value = Number(arg.slice("--ws=".length));
			if (!Number.isNaN(value)) {
				port = value;
			}
		}
		if (arg.startsWith("--wsPort=")) {
			const value = Number(arg.slice("--wsPort=".length));
			if (!Number.isNaN(value)) {
				port = value;
			}
		}
		if (arg.startsWith("--wsPath=")) {
			path = arg.slice("--wsPath=".length);
		}
	}
	return {
		port,
		path: path === "" ? null : path
	};
}

function startServer(
	connection: Connection,
	useClientVfs: boolean,
	options?: StartServerOptions
) {
	setFeatureOptions(options?.features);
	const server = createServer(connection);
	const documents = server.documents;
	bindCoreFileAccessorToClientVfs(connection);
	if (useClientVfs) {
		server.fileSystem.install(
			"file",
			createClientVfsFileSystem(connection)
		);
	}

	connection.onInitialize((params: InitializeParams) => {
		applyClientCapabilities(params);
		const webgalLanguagePlugin: LanguagePlugin<URI> = {
			getLanguageId(scriptId) {
				const path = scriptId.path.toLowerCase();
				if (scriptId.scheme !== "file") {
					if (
						path.endsWith("/game/config.txt") ||
						path.endsWith("config.txt")
					) {
						return "webgal-config";
					}
					if (path.endsWith(".txt")) {
						return "webgal";
					}
					return "webgal";
				}
				if (path.endsWith("/game/config.txt")) {
					return "webgal-config";
				}
				if (path.endsWith(".txt") && path.includes("/game/scene/")) {
					return "webgal";
				}
				return undefined;
			},
			createVirtualCode(scriptId, languageId, snapshot) {
				if (languageId !== "webgal" && languageId !== "webgal-config") {
					return;
				}
				return createWebgalVirtualCode(scriptId, languageId, snapshot);
			},
			updateVirtualCode(_scriptId, virtualCode, newSnapshot) {
				if (
					virtualCode.languageId !== "webgal" &&
					virtualCode.languageId !== "webgal-config"
				) {
					return;
				}
				return updateWebgalVirtualCode(virtualCode, newSnapshot);
			}
		};
		const result = server.initialize(
			params,
			createSimpleProject([webgalLanguagePlugin]),
			[createWebgalService(connection)]
		);
		applyServerCapabilities(result);
		return result;
	});

	connection.onInitialized(() => {
		registerConnectionHandlers(documents, connection);
		server.initialized();
	});

	connection.onShutdown(server.shutdown);

	connection.listen();
}
