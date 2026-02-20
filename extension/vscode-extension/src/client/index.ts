import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from "vscode-languageclient/node";
import { ExtensionContext, Uri, window, workspace } from "vscode";
import { selector, selectorConfig } from "@/utils/utils";

export async function createClient(
	context: ExtensionContext
): Promise<LanguageClient> {
	const serverModule = Uri.joinPath(
		context.extensionUri,
		"dist",
		"server.js"
	);

	const runOptions = { execArgv: <string[]>[] };
	const debugOptions = {
		execArgv: ["--nolazy", "--inspect=" + 5882]
	};
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

	const { createWebgalClientHandlers, registerWebgalClientHandlers } =
		await import("@webgal/language-service");
	const { createNodeFileSystem } =
		await import("@webgal/language-service/node");

	const rootPath =
		workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
	const vfs = createNodeFileSystem({ root: rootPath });
	const handlers = createWebgalClientHandlers({
		vfs,
		showTip: (message: string) => window.showInformationMessage(message)
	});

	registerWebgalClientHandlers(client, handlers);

	return client;
}
