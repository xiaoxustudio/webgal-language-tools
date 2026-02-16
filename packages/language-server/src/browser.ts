import {
	createConnection,
	createServer,
	createSimpleProject
} from "@volar/language-server/browser";
import type { InitializeParams } from "@volar/language-server";
import type { LanguagePlugin } from "@volar/language-core";
import { URI } from "vscode-uri";
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

export { createConnection } from "@volar/language-server/browser";

/**
 * 启动服务器并建立连接
 * @param connection - 可选的连接实例，如果未提供则会创建新的连接
 * @returns 返回连接实例
 */
export function startServer(
	connection?: ReturnType<typeof createConnection>,
	options?: StartServerOptions
) {
	if (!connection) {
		connection = createConnection();
	}
	setFeatureOptions(options?.features);
	const server = createServer(connection);
	const documents = server.documents;
	bindCoreFileAccessorToClientVfs(connection);

	server.fileSystem.install("file", createClientVfsFileSystem(connection));

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

	connection.onInitialize((params: InitializeParams) => {
		applyClientCapabilities(params);
		const result = server.initialize(
			params,
			createSimpleProject([webgalLanguagePlugin]),
			[createWebgalService(connection)]
		);
		applyServerCapabilities(result);
		return result;
	});

	connection.onInitialized(() => {
		server.initialized();
		registerConnectionHandlers(documents, connection);
	});

	connection.onShutdown(server.shutdown);

	connection.listen();
	return connection;
}
