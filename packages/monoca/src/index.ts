import {
	MonacoLanguageClient,
	type MonacoLanguageClientOptions
} from "monaco-languageclient";
import { CloseAction, ErrorAction } from "vscode-languageclient";
import {
	BrowserMessageReader,
	BrowserMessageWriter
} from "vscode-jsonrpc/browser.js";
import type { MessageReader, MessageWriter } from "vscode-jsonrpc";
import {
	createMemoryFileSystem,
	createWebgalClientHandlers,
	registerWebgalClientHandlers,
	type VirtualFileSystem,
	type WebgalClientHandlers
} from "@webgal/language-client";
export type {
	VirtualFileSystem,
	WebgalClientHandlers
} from "@webgal/language-client";

export type MonacoLike = {
	languages: {
		register: (options: { id: string }) => void;
	};
};

export type WebgalMonocaClientOptions = {
	monaco: MonacoLike;
	mode?: "worker" | "ws";
	languageServerUrl?: string;
	languageIds?: string[];
	name?: string;
	id?: string;
	virtualFileSystem?: VirtualFileSystem;
	clientHandlers?: Partial<WebgalClientHandlers>;
	worker?: Worker;
};

export const defaultLanguageIds = ["webgal", "webgal-config"];

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
	const mode = options.mode ?? (options.languageServerUrl ? "ws" : "worker");

	let reader: MessageReader;
	let writer: MessageWriter;
	let stopServer: (() => void) | null = null;

	if (mode === "ws") {
		if (!options.languageServerUrl) {
			throw new Error("languageServerUrl is required in ws mode");
		}
		const { toSocket, WebSocketMessageReader, WebSocketMessageWriter } =
			await import("vscode-ws-jsonrpc");
		const socket = await connectWebSocket(options.languageServerUrl);
		reader = new WebSocketMessageReader(toSocket(socket));
		writer = new WebSocketMessageWriter(toSocket(socket));
	} else {
		if (typeof Worker === "undefined") {
			throw new Error("Worker is not available");
		}
		const workerUrl =
			import.meta.url.includes("/deps/") ||
			import.meta.url.includes("\\deps\\")
				? new URL(
						"@webgal/monoca/build/serverWorker.mjs",
						import.meta.url
					)
				: new URL("./serverWorker.mjs", import.meta.url);
		const worker =
			options.worker ??
			new Worker(workerUrl, {
				type: "module"
			});
		stopServer = () => worker.terminate();
		reader = new BrowserMessageReader(worker);
		writer = new BrowserMessageWriter(worker);
	}
	const languageClientOptions: MonacoLanguageClientOptions = {
		id: options.id,
		name: options.name ?? "WebGAL Language Client",
		clientOptions: {
			documentSelector: languageIds.map((language) => ({ language })),
			errorHandler: {
				error: () => ({ action: ErrorAction.Continue }),
				closed: () => ({ action: CloseAction.Restart })
			}
		},
		messageTransports: { reader, writer }
	};
	const languageClient = new MonacoLanguageClient(languageClientOptions);
	languageClient.start();
	reader.onClose(() => {
		stopServer?.();
		languageClient.stop();
	});
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
