import {
	initServices,
	MonacoLanguageClient,
	wasVscodeApiInitialized
} from "monaco-languageclient";
import { CloseAction, ErrorAction } from "vscode-languageclient";
import {
	toSocket,
	WebSocketMessageReader,
	WebSocketMessageWriter
} from "vscode-ws-jsonrpc";
import {
	createMemoryFileSystem,
	createWebgalClientHandlers,
	registerWebgalClientHandlers,
	type VirtualFileSystem,
	type WebgalClientHandlers
} from "@webgal/language-client";
export type { VirtualFileSystem, WebgalClientHandlers } from "@webgal/language-client";

export type MonacoLike = {
	languages: {
		register: (options: { id: string }) => void;
	};
};

export type WebgalMonocaClientOptions = {
	monaco: MonacoLike;
	languageServerUrl: string;
	languageIds?: string[];
	name?: string;
	virtualFileSystem?: VirtualFileSystem;
	clientHandlers?: Partial<WebgalClientHandlers>;
};

export const defaultLanguageIds = ["webgal", "webgal-config"];
let initPromise: Promise<void> | null = null;

export function registerWebgalLanguages(
	monacoInstance: MonacoLike,
	languageIds: string[] = defaultLanguageIds
) {
	for (const id of languageIds) {
		monacoInstance.languages.register({ id });
	}
}

export async function createWebgalMonocaLanguageClient(
	options: WebgalMonocaClientOptions
) {
	const languageIds = options.languageIds ?? defaultLanguageIds;
	registerWebgalLanguages(options.monaco, languageIds);
	if (!wasVscodeApiInitialized()) {
		if (!initPromise) {
			initPromise = initServices().finally(() => {
				initPromise = null;
			});
		}
		await initPromise;
	}
	const socket = await connectWebSocket(options.languageServerUrl);
	const reader = new WebSocketMessageReader(toSocket(socket));
	const writer = new WebSocketMessageWriter(toSocket(socket));
	const languageClient = new MonacoLanguageClient({
		name: options.name ?? "WebGAL Language Client",
		clientOptions: {
			documentSelector: languageIds.map((language) => ({ language })),
			errorHandler: {
				error: () => ({ action: ErrorAction.Continue }),
				closed: () => ({ action: CloseAction.Restart })
			}
		},
		connectionProvider: {
			get: () => Promise.resolve({ reader, writer })
		}
	});
	languageClient.start();
	reader.onClose(() => languageClient.stop());
	const vfs =
		options.virtualFileSystem ?? createMemoryFileSystem({ root: "/" });
	const handlers = createWebgalClientHandlers({
		vfs,
		overrides: options.clientHandlers
	});
	registerWebgalClientHandlers(languageClient, handlers);
	return languageClient;
}

function connectWebSocket(url: string) {
	return new Promise<WebSocket>((resolve, reject) => {
		const socket = new WebSocket(url);
		socket.onopen = () => resolve(socket);
		socket.onerror = () => reject(new Error("WebSocket connection failed"));
	});
}
