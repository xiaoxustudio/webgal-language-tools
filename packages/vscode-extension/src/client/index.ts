import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from "vscode-languageclient/node";
import requests from "./requests";
import { ExtensionContext, Uri, workspace } from "vscode";
import { selector, selectorConfig } from "@/utils/utils";

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

	for (const bindingFunction of requests) {
		bindingFunction(client);
	}

	return client;
}
