import type { Connection } from "vscode-languageserver";
import type { InitializeParams } from "@volar/language-server";

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

export function startServer(
	connection: Connection,
	useClientVfs: boolean,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	createServer: (connection: Connection) => any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	createSimpleProject: (plugins: any[]) => any,
	options?: StartServerOptions
) {
	const settings = new LanguageServerSettings();
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
		// 初始配置由客户端通过 webgal/updateConfiguration 自定义通知主动推送，
		// 不再依赖 workspace/configuration（vscode-languageclient@9 已废弃同步配置特性，
		// 且 workspace/configuration 的 WorkspaceConfiguration 序列化可能不可靠）
		server.initialized();
	});

	connection.onShutdown(server.shutdown);

	connection.listen();
}
