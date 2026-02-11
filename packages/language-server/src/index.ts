import {
	createConnection,
	createServer,
	createSimpleProject
} from "@volar/language-server/node";
import { LanguagePlugin } from "@volar/language-core";
import { URI } from "vscode-uri";
import { createWebgalService, registerConnectionHandlers } from "./events";
import {
	applyClientCapabilities,
	applyServerCapabilities
} from "./events/onInitialize";

const connection = createConnection();
const server = createServer(connection);
const documents = server.documents;

const webgalLanguagePlugin: LanguagePlugin<URI> = {
	getLanguageId(scriptId) {
		const path = scriptId.path.toLowerCase();
		console.log(`徐然 ${path}`);
		if (path.endsWith("/game/config.txt")) {
			return "webgal-config";
		}
		if (path.endsWith(".txt") && path.includes("/game/scene/")) {
			return "webgal";
		}
		return undefined;
	}
};

registerConnectionHandlers(documents, connection);

// 初始化并挂接 WebGAL 服务
connection.onInitialize((params) => {
	applyClientCapabilities(params);
	const result = server.initialize(
		params,
		createSimpleProject([webgalLanguagePlugin]),
		[createWebgalService(connection)]
	);
	applyServerCapabilities(result);
	return result;
});

// 服务初始化
connection.onInitialized(() => {
	server.initialized();
});

connection.onShutdown(server.shutdown);

connection.listen();
