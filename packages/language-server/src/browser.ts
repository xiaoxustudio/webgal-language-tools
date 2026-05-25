import {
	createConnection,
	createServer,
	createSimpleProject
} from "@volar/language-server/browser";
import type { InitializeParams } from "@volar/language-server";
import type { StartServerOptions } from "@/types";
import { createWebgalService, registerConnectionHandlers } from "./events";
import {
	applyClientCapabilities,
	applyServerCapabilities
} from "./events/onInitialize";
import { bindCoreFileAccessorToClientVfs } from "@/utils";
import { createClientVfsFileSystem } from "./server/code";
import webgalLanguagePlugin from "./server/plugin";
import { LanguageServerSettings } from "./server/setting";

export { createConnection } from "@volar/language-server/browser";
export type { StartServerOptions, LspFeatureOptions } from "./types";

/**
 * 启动服务器并建立连接
 * @param connection - 可选的连接实例，如果未提供则会创建新的连接
 * @returns 返回连接实例
 */
export function startServer(
	connection?: ReturnType<typeof createConnection>,
	options?: StartServerOptions
) {
	const resolvedConnection = connection ?? createConnection();
	// Create a settings instance for this server
	const settings = new LanguageServerSettings();
	// Apply feature options if provided
	if (options?.features) {
		settings.setFeatureOptions(options.features);
	}
	const server = createServer(resolvedConnection);
	const documents = server.documents;
	bindCoreFileAccessorToClientVfs(resolvedConnection);

	server.fileSystem.install(
		"file",
		createClientVfsFileSystem(resolvedConnection)
	);

	resolvedConnection.onInitialize((params: InitializeParams) => {
		applyClientCapabilities(settings, params);
		const result = server.initialize(
			params,
			createSimpleProject([webgalLanguagePlugin]),
			[createWebgalService(resolvedConnection, settings)]
		);
		applyServerCapabilities(settings, result);
		return result;
	});

	resolvedConnection.onInitialized(() => {
		server.initialized();
		registerConnectionHandlers(documents, resolvedConnection, settings);
	});

	resolvedConnection.onShutdown(server.shutdown);

	resolvedConnection.listen();
	return resolvedConnection;
}
