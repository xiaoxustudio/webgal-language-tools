import * as serverProtocol from "@volar/language-server/protocol";
import { activateAutoInsertion, createLabsInfo } from "@volar/vscode";
import type { BaseLanguageClient } from "@volar/vscode/node";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { createClient } from "./client";
import { DebugAdapterDescriptorFactory } from "./debug/activeDebug";
import { debug } from "vscode";
import { selector } from "./utils/utils";
import { DebugConfigurationProvider } from "./ws/config";
import { defaultConfig } from "@webgal/language-core";

let client: BaseLanguageClient;

export async function activate(context: vscode.ExtensionContext) {
	client = await createClient(context);
	await client.start();
	activateAutoInsertion("webgal", client);

	context.subscriptions.push(
		vscode.debug.registerDebugAdapterDescriptorFactory(
			"webgal",
			new DebugAdapterDescriptorFactory()
		)
	);

	context.subscriptions.push(
		debug.registerDebugConfigurationProvider(
			selector.language,
			new DebugConfigurationProvider()
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

export function deactivate() {
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

	const configObject = {
		$schema:
			"https://github.com/xiaoxustudio/webgal-language-tools/raw/refs/heads/master/extension/vscode-extension/fmt.schema.json",
		...defaultConfig
	};
	try {
		fs.writeFileSync(
			configPath,
			JSON.stringify(configObject, null, "\t") + "\n"
		);
		vscode.window.showInformationMessage("fmt.json 已成功创建");
	} catch (e) {
		vscode.window.showErrorMessage(`创建 fmt.json 失败: ${e}`);
	}
}
