import * as serverProtocol from "@volar/language-server/protocol";
import { activateAutoInsertion, createLabsInfo } from "@volar/vscode";
import { BaseLanguageClient } from "@volar/vscode/node";
import * as vscode from "vscode";
import { createClient } from "./client";

let client: BaseLanguageClient;

export async function activate(context: vscode.ExtensionContext) {
	client = createClient(context);
	await client.start();

	activateAutoInsertion("webgal", client);

	// support for https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.volarjs-labs
	// ref: https://twitter.com/johnsoncodehk/status/1656126976774791168
	const labsInfo = createLabsInfo(serverProtocol);
	labsInfo.addLanguageClient(client);
	return labsInfo.extensionExports;
}

export function deactivate(): Thenable<any> | undefined {
	return client?.stop();
}
