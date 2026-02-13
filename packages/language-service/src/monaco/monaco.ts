import {
	WebSocketMessageReader,
	WebSocketMessageWriter,
	toSocket
} from "vscode-ws-jsonrpc";
import {
	CloseAction,
	ErrorAction,
	MessageTransports,
	BrowserMessageReader,
	BrowserMessageWriter,
	type InitializeParams
} from "vscode-languageclient/browser.js";
import { MonacoLanguageClient } from "monaco-languageclient";
import type * as monaco from "monaco-editor";
import {
	createMemoryFileSystem,
	createWebgalClientHandlers,
	registerWebgalClientHandlers
} from "../index.js";

export interface CreateWebgalMonacoLanguageClientOptions {
	languageServerUrl: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	editor: any;
	virtualFileSystem?: ReturnType<typeof createMemoryFileSystem>;
}

export const createWebgalMonacoLanguageClient = (
	options: CreateWebgalMonacoLanguageClientOptions
): { webSocket: WebSocket; vfs: ReturnType<typeof createMemoryFileSystem> } => {
	const { languageServerUrl, editor } = options;
	const editorInstance = editor as monaco.editor.IStandaloneCodeEditor;
	const vfs =
		options.virtualFileSystem ||
		createMemoryFileSystem({ root: "file:///game" });

	if (!options.virtualFileSystem) {
		vfs.writeFile("file:///game/scene/start.txt", "WebGal:Start;");
		vfs.writeFile("file:///game/config.txt", "");
	}

	const webSocket = new WebSocket(languageServerUrl);

	webSocket.onopen = () => {
		const socket = toSocket(webSocket);
		const reader = new WebSocketMessageReader(socket);
		const writer = new WebSocketMessageWriter(socket);

		const languageClient = createLanguageClient(
			{
				reader,
				writer
			},
			{ editor: editorInstance, vfs }
		);
		languageClient.start();

		reader.onClose(() => languageClient.stop());
	};

	return { webSocket, vfs };
};

export interface CreateWebgalMonacoLanguageClientWorkerOptions {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	editor: any;
	worker: Worker;
	virtualFileSystem?: ReturnType<typeof createMemoryFileSystem>;
}

export const createWebgalMonacoLanguageClientWithWorker = (
	options: CreateWebgalMonacoLanguageClientWorkerOptions
): { worker: Worker; vfs: ReturnType<typeof createMemoryFileSystem> } => {
	const { worker, editor } = options;
	const editorInstance = editor as monaco.editor.IStandaloneCodeEditor;
	const vfs =
		options.virtualFileSystem ||
		createMemoryFileSystem({ root: "file:///game" });

	if (!options.virtualFileSystem) {
		vfs.writeFile("file:///game/scene/start.txt", "WebGal:Start;");
		vfs.writeFile("file:///game/config.txt", "");
	}

	const reader = new BrowserMessageReader(worker);
	const writer = new BrowserMessageWriter(worker);

	const languageClient = createLanguageClient(
		{
			reader,
			writer
		},
		{ editor: editorInstance, vfs }
	);
	languageClient.start();

	(worker as any).onerror = () => languageClient.stop();
	(worker as any).onmessageerror = () => languageClient.stop();
	return { worker, vfs };
};

export interface CreateWebgalMonacoLanguageClientPortOptions {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	editor: any;
	port: MessagePort;
	virtualFileSystem?: ReturnType<typeof createMemoryFileSystem>;
}

export const createWebgalMonacoLanguageClientWithPort = (
	options: CreateWebgalMonacoLanguageClientPortOptions
): { port: MessagePort; vfs: ReturnType<typeof createMemoryFileSystem> } => {
	const { port, editor } = options;
	const editorInstance = editor as monaco.editor.IStandaloneCodeEditor;
	const vfs =
		options.virtualFileSystem ||
		createMemoryFileSystem({ root: "file:///game" });

	if (!options.virtualFileSystem) {
		vfs.writeFile("file:///game/scene/start.txt", "WebGal:Start;");
		vfs.writeFile("file:///game/config.txt", "");
	}

	const reader = new BrowserMessageReader(port);
	const writer = new BrowserMessageWriter(port);

	const languageClient = createLanguageClient(
		{
			reader,
			writer
		},
		{ editor: editorInstance, vfs }
	);
	languageClient.start();

	port.onmessageerror = () => languageClient.stop();
	return { port, vfs };
};

const createLanguageClient = (
	messageTransports: MessageTransports,
	options: {
		editor: monaco.editor.IStandaloneCodeEditor;
		vfs: ReturnType<typeof createMemoryFileSystem>;
	}
): MonacoLanguageClient => {
	const handlers = createWebgalClientHandlers({
		vfs: options.vfs,
		overrides: {
			"client/showTip": function (message: any) {
				console.log(message);
			}
		}
	});
	const client = new MonacoLanguageClient({
		name: "WebGAL Language Client",
		clientOptions: {
			// use a language id as a document selector
			documentSelector: [
				{ scheme: "file", language: "webgal" },
				{ scheme: "file", language: "webgal-config" },
				{ scheme: "inmemory", language: "webgal" },
				{ scheme: "inmemory", language: "webgal-config" }
			],
			// disable the default error handler
			errorHandler: {
				error: () => ({ action: ErrorAction.Continue }),
				closed: () => ({ action: CloseAction.DoNotRestart })
			},
			synchronize: {
				configurationSection: ["webgal", "http"]
			},
			initializationOptions() {
				const model = options.editor.getModel();
				const initParams: InitializeParams = {
					processId: Math.random(),
					rootPath: "file:///game",
					rootUri: "file:///game",
					capabilities: {},
					workspaceFolders: [
						{
							uri: "file:///game",
							name: "example"
						}
					],
					...(model
						? { textDocument: { uri: model.uri.toString() } }
						: {})
				};
				return initParams;
			}
		},
		// create a language client connection from the JSON RPC connection on demand
		messageTransports
	});
	registerWebgalClientHandlers(client, handlers);
	return client;
};
