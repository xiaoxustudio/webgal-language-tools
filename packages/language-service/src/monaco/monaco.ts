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
	createMemoryVolarFileSystem,
	createVirtualFileSystem,
	VirtualEntry,
	VirtualFileSystem
} from "@/vfs";
import {
	createWebgalClientHandlers,
	registerWebgalClientHandlers
} from "@/client-handlers";

export interface CreateWebgalMonacoLanguageClientOptions {
	languageServerUrl: string;
	editor: any;
	virtualFileSystem?: VirtualFileSystem;
}

/**
 * 创建虚拟文件系统
 * @param options - 配置选项
 * @param options.root - 根目录路径，默认为 "file:///"
 * @param options.tree - 可选的虚拟文件树结构
 * @returns 返回一个虚拟文件系统实例
 */
export function createMemoryFileSystem(options?: {
	root?: string;
	tree?: VirtualEntry;
}): VirtualFileSystem {
	const fs = createMemoryVolarFileSystem(options);
	return createVirtualFileSystem(fs);
}

/**
 * 创建WebGAL Monaco语言客户端（WebSocket连接模式）
 * @param options - 配置选项
 * @param options.languageServerUrl - 语言服务器WebSocket URL
 * @param options.editor - Monaco编辑器实例
 * @param options.virtualFileSystem - 可选的虚拟文件系统，未提供时将创建默认的内存文件系统
 * @returns 返回包含WebSocket连接和虚拟文件系统的对象
 */
export const createWebgalMonacoLanguageClient = (
	options: CreateWebgalMonacoLanguageClientOptions
): { webSocket: WebSocket; vfs: VirtualFileSystem } => {
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
	editor: any;
	worker: Worker;
	virtualFileSystem?: VirtualFileSystem;
}

/**
 * 创建WebGAL Monaco语言客户端（Worker模式）
 * @param options - 配置选项
 * @param options.editor - Monaco编辑器实例
 * @param options.worker - Web Worker实例
 * @param options.virtualFileSystem - 可选的虚拟文件系统，未提供时将创建默认的内存文件系统
 * @returns 返回包含Worker实例和虚拟文件系统的对象
 */
export const createWebgalMonacoLanguageClientWithWorker = (
	options: CreateWebgalMonacoLanguageClientWorkerOptions
): { worker: Worker; vfs: VirtualFileSystem } => {
	const { worker, editor } = options;
	const editorInstance = editor;
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

	worker.onerror = () => languageClient.stop();
	worker.onmessageerror = () => languageClient.stop();
	return { worker, vfs };
};

const createLanguageClient = (
	messageTransports: MessageTransports,
	options: {
		editor: monaco.editor.IStandaloneCodeEditor;
		vfs: VirtualFileSystem;
	}
): MonacoLanguageClient => {
	const handlers = createWebgalClientHandlers({
		vfs: options.vfs,
		overrides: {
			"client/showTip": function (message: string) {
				console.log(message);
			},
			"workspace/documentLink/refresh": () => {
				const model = options.editor.getModel();
				if (!model) {
					return null;
				}
				options.editor.setModel(model);
				return null;
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
	options.vfs.onDidChange(() => {
		client.sendNotification("webgal/vfsChanged");
	});
	return client;
};
