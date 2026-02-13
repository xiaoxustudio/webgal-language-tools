import {
	createConnection,
	createServer,
	createSimpleProject
} from "@volar/language-server/browser";
import type { InitializeParams } from "@volar/language-server";
import type {
	CodeInformation,
	IScriptSnapshot,
	LanguagePlugin,
	VirtualCode
} from "@volar/language-core";
import { URI } from "vscode-uri";
import { createWebgalService, registerConnectionHandlers } from "./events";
import {
	applyClientCapabilities,
	applyServerCapabilities
} from "./events/onInitialize";
import {
	bindCoreFileAccessorToClientVfs,
	createClientVfsFileSystem
} from "@/utils";

export { createConnection } from "@volar/language-server/browser";

const fullCodeInformation: CodeInformation = {
	completion: true,
	semantic: true,
	navigation: true,
	structure: true,
	format: true,
	verification: true
};

const createIdentityVirtualCode = (
	scriptId: URI,
	languageId: string,
	snapshot: IScriptSnapshot
): VirtualCode => {
	const length = snapshot.getLength();
	return {
		id: scriptId.toString(),
		languageId,
		snapshot,
		mappings: [
			{
				sourceOffsets: [0],
				generatedOffsets: [0],
				lengths: [length],
				data: fullCodeInformation
			}
		]
	};
};

const updateIdentityVirtualCode = (
	virtualCode: VirtualCode,
	newSnapshot: IScriptSnapshot
): VirtualCode => {
	const length = newSnapshot.getLength();
	const mapping = virtualCode.mappings[0];
	if (mapping) {
		mapping.sourceOffsets[0] = 0;
		mapping.generatedOffsets[0] = 0;
		mapping.lengths[0] = length;
		mapping.data = fullCodeInformation;
	} else {
		virtualCode.mappings = [
			{
				sourceOffsets: [0],
				generatedOffsets: [0],
				lengths: [length],
				data: fullCodeInformation
			}
		];
	}
	virtualCode.snapshot = newSnapshot;
	return virtualCode;
};

export function startServer(connection?: ReturnType<typeof createConnection>) {
	if (!connection) {
		connection = createConnection();
	}
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
			return createIdentityVirtualCode(scriptId, languageId, snapshot);
		},
		updateVirtualCode(_scriptId, virtualCode, newSnapshot) {
			if (
				virtualCode.languageId !== "webgal" &&
				virtualCode.languageId !== "webgal-config"
			) {
				return;
			}
			return updateIdentityVirtualCode(virtualCode, newSnapshot);
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
		registerConnectionHandlers(documents, connection);
		server.initialized();
	});

	connection.onShutdown(server.shutdown);

	connection.listen();
	return connection;
}
