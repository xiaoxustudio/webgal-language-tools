import { WebSocketMessageReader } from "vscode-ws-jsonrpc";
import {
	CloseAction,
	ErrorAction,
	MessageTransports,
	type InitializeParams
} from "vscode-languageclient/browser.js";
import { WebSocketMessageWriter } from "vscode-ws-jsonrpc";
import { toSocket } from "vscode-ws-jsonrpc";
import { MonacoLanguageClient } from "monaco-languageclient";
import * as monaco from "monaco-editor";
import {
	createMemoryFileSystem,
	createWebgalClientHandlers,
	registerWebgalClientHandlers
} from "@webgal/language-service";

export const initWebSocketAndStartClient = (
	url: string,
	editor: monaco.editor.IStandaloneCodeEditor
): { webSocket: WebSocket; vfs: ReturnType<typeof createMemoryFileSystem> } => {
	const webSocket = new WebSocket(url);
	const vfs = createMemoryFileSystem({ root: "file:///game" });
	vfs.writeFile("file:///game/scene/start.txt", "xuran");
	vfs.writeFile("file:///game/config.txt", "");

	webSocket.onopen = () => {
		// creating messageTransport
		const socket = toSocket(webSocket);
		const reader = new WebSocketMessageReader(socket);
		const writer = new WebSocketMessageWriter(socket);

		// creating language client
		const languageClient = createLanguageClient(
			{
				reader,
				writer
			},
			{ editor, vfs }
		);
		languageClient.start();

		reader.onClose(() => languageClient.stop());
	};
	return { webSocket, vfs };
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
			"client/showTip": function (message) {
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
				{ scheme: "file", language: "webgal-config" }
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
					capabilities: {
						textDocument: {
							publishDiagnostics: { relatedInformation: true },
							hover: {
								contentFormat: ["markdown", "plaintext"]
							},
							completion: {
								completionItem: {
									snippetSupport: true,
									deprecatedSupport: true,
									preselectSupport: true,
									labelDetailsSupport: true,
									commitCharactersSupport: true,
									documentationFormat: [
										"markdown",
										"plaintext"
									],
									insertReplaceSupport: true,
									resolveSupport: {
										properties: ["documentation", "detail"]
									}
								},
								contextSupport: true
							},
							documentLink: {
								tooltipSupport: true,
								dynamicRegistration: true
							},
							inlineCompletion: {
								dynamicRegistration: true
							},
							moniker: {
								dynamicRegistration: true
							},
							foldingRange: {
								dynamicRegistration: true,
								lineFoldingOnly: true
							},
							definition: {
								dynamicRegistration: true,
								linkSupport: true
							},
							references: {
								dynamicRegistration: true
							},
							documentSymbol: {
								dynamicRegistration: true,
								labelSupport: true,
								hierarchicalDocumentSymbolSupport: true
							},
							codeAction: {
								dynamicRegistration: true,
								dataSupport: true,
								isPreferredSupport: true
							},
							formatting: {
								dynamicRegistration: true
							},
							rangeFormatting: {
								dynamicRegistration: true
							},
							selectionRange: {
								dynamicRegistration: true
							},
							linkedEditingRange: {
								dynamicRegistration: true
							}
						},
						workspace: {
							applyEdit: true,
							configuration: true,
							workspaceFolders: true,
							codeLens: {
								refreshSupport: true
							},
							diagnostics: {
								refreshSupport: true
							},
							fileOperations: {
								didCreate: true,
								didRename: true,
								didDelete: true,
								willCreate: true,
								willRename: true,
								willDelete: true,
								dynamicRegistration: true
							},
							didChangeConfiguration: {
								dynamicRegistration: true
							},
							didChangeWatchedFiles: {
								dynamicRegistration: true
							},
							semanticTokens: {
								refreshSupport: true
							},
							foldingRange: {
								refreshSupport: true
							},
							inlayHint: {
								refreshSupport: true
							},
							workspaceEdit: {
								changeAnnotationSupport: {
									groupsOnLabel: true
								},
								documentChanges: true,
								failureHandling: "textOnlyTransactional"
							}
						}
					},
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
