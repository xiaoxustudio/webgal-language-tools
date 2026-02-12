import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from "vscode-languageclient/node";
import { ExtensionContext, Uri, window, workspace } from "vscode";
import { selector, selectorConfig } from "@/utils/utils";
import {
	createWebgalClientHandlers,
	registerWebgalClientHandlers
} from "@webgal/language-client";
import { createNodeFileSystem } from "@webgal/language-client/node";

export function createClient(context: ExtensionContext): LanguageClient {
	const serverModule = Uri.joinPath(
		context.extensionUri,
		"dist",
		"server.js"
	);

	const runOptions = { execArgv: <string[]>[] };
	const debugOptions = { execArgv: ["--nolazy", "--inspect=" + 5882] };
	const serverOptions: ServerOptions = {
		run: {
			module: serverModule.fsPath,
			transport: TransportKind.ipc,
			options: runOptions
		},
		debug: {
			module: serverModule.fsPath,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};

	const clientOptions: LanguageClientOptions = {
		documentSelector: [selector, selectorConfig],
		synchronize: {
			fileEvents: workspace.createFileSystemWatcher("**/.clientrc")
		}
	};

	const client = new LanguageClient(
		"WEBGAL Language Server",
		"WEBGAL Language Server",
		serverOptions,
		clientOptions
	);

	const rootPath =
		workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
	const vfs = createNodeFileSystem({ root: rootPath });
	const handlers = createWebgalClientHandlers({
		vfs,
		showTip: (message) => window.showInformationMessage(message),
		goPropertyDoc: async (pathSegments) => {
			const { getState } = await import("@webgal/language-server/utils");
			return getState(pathSegments);
		}
	});
	registerWebgalClientHandlers(client, handlers);

	return client;
}
