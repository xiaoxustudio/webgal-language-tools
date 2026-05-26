import { createServer, createSimpleProject } from "@volar/language-server/node";
import type { InitializeParams } from "@volar/language-server";

import {
	createConnection as createVscodeConnection,
	type Connection
} from "vscode-languageserver/node";
import type { IncomingMessage } from "http";
import type { StartServerOptions } from "@/types";
import { createWebgalService, registerConnectionHandlers } from "../events";
import {
	applyClientCapabilities,
	applyServerCapabilities
} from "../events/onInitialize";
import { bindCoreFileAccessorToClientVfs } from "@/utils";
import { createClientVfsFileSystem } from "./code";
import webgalLanguagePlugin from "./plugin";
import { LanguageServerSettings } from "./setting";

type WsOptions = {
	port: number;
	path: string | null;
};

/**
 * 启动WebSocket服务器
 *
 * @param options - WebSocket服务器配置选项，包含端口和路径等信息
 * @returns void
 */
export async function startWebSocketServer(options: WsOptions) {
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

export function getWsOptions(argv: string[]): WsOptions {
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

export function startServer(
	connection: Connection,
	useClientVfs: boolean,
	options?: StartServerOptions
) {
	// Create a settings instance for this server
	const settings = new LanguageServerSettings();
	// Apply feature options if provided
	if (options?.features) {
		settings.setFeatureOptions(options.features);
	}
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
		applyClientCapabilities(settings, params);

		const result = server.initialize(
			params,
			createSimpleProject([webgalLanguagePlugin]),
			[createWebgalService(connection, settings)]
		);
		applyServerCapabilities(settings, result);
		return result;
	});

	connection.onInitialized(() => {
		registerConnectionHandlers(documents, connection, settings);
		server.initialized();
	});

	connection.onShutdown(server.shutdown);

	connection.listen();
}
