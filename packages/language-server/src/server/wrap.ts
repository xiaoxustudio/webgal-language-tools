import { createConnection as createVscodeConnection } from "vscode-languageserver/node";
import {
	createServer,
	createSimpleProject
} from "@volar/language-server/node";
import type { IncomingMessage } from "http";
import { startServer } from "./startServer";
export { startServer } from "./startServer";

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
		startServer(connection, true, createServer, createSimpleProject);
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
