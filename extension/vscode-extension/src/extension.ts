import * as serverProtocol from "@volar/language-server/protocol";
import { activateAutoInsertion, createLabsInfo } from "@volar/vscode";
import { BaseLanguageClient } from "@volar/vscode/node";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { createClient } from "./client";
import { XRDebugAdapterDescriptorFactory } from "./debug/activeDebug";
import { DocumentFormatter, defaultConfig } from "./formatter";

let client: BaseLanguageClient;

export async function activate(context: vscode.ExtensionContext) {
	client = await createClient(context);
	await client.start();

	activateAutoInsertion("webgal", client);

	context.subscriptions.push(
		vscode.debug.registerDebugAdapterDescriptorFactory(
			"webgal",
			new XRDebugAdapterDescriptorFactory()
		)
	);

	context.subscriptions.push(
		vscode.languages.registerDocumentFormattingEditProvider(
			"webgal",
			new DocumentFormatter()
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.initFmtConfig", () => {
			initFmtConfig();
		})
	);

	const labsInfo = createLabsInfo(serverProtocol);
	labsInfo.addLanguageClient(client);
	return labsInfo.extensionExports;
}

export function deactivate(): Thenable<any> | undefined {
	return client?.stop();
}

async function initFmtConfig() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showErrorMessage("没有打开的工作区");
		return;
	}

	const workspaceFolder = workspaceFolders[0];
	const configPath = path.join(workspaceFolder.uri.fsPath, "fmt.json");

	if (fs.existsSync(configPath)) {
		const choice = await vscode.window.showInformationMessage(
			"fmt.json 已存在，是否覆盖？",
			"覆盖",
			"取消"
		);
		if (choice !== "覆盖") {
			return;
		}
	}

	try {
		fs.writeFileSync(
			configPath,
			JSON.stringify(defaultConfig, null, "\t") + "\n"
		);
		vscode.window.showInformationMessage("fmt.json 已成功创建");
	} catch (e) {
		vscode.window.showErrorMessage(`创建 fmt.json 失败: ${e}`);
	}
}
