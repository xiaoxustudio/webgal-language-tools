import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { defaultConfig, formatText } from "@webgal/language-core";
import type { FormatConfig } from "@webgal/language-core";

function loadFormatConfig(
	workspaceFolder: vscode.WorkspaceFolder | undefined
): FormatConfig {
	if (!workspaceFolder) {
		return defaultConfig;
	}

	let currentDir = workspaceFolder.uri.fsPath;
	while (currentDir) {
		const configPath = path.join(currentDir, "fmt.json");
		try {
			if (fs.existsSync(configPath)) {
				const content = fs.readFileSync(configPath, "utf-8");
				const userConfig = JSON.parse(content);
				return { ...defaultConfig, ...userConfig };
			}
		} catch (e) {
			console.error("Failed to load fmt.json:", e);
		}
		const parentDir = path.dirname(currentDir);
		if (parentDir === currentDir) {
			break;
		}
		currentDir = parentDir;
	}
	return defaultConfig;
}

class DocumentFormatter implements vscode.DocumentFormattingEditProvider {
	private config: FormatConfig = defaultConfig;

	constructor(config: FormatConfig = defaultConfig) {
		this.config = config;
	}

	static async create(
		document: vscode.TextDocument
	): Promise<DocumentFormatter> {
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(
			document.uri
		);
		const config = loadFormatConfig(workspaceFolder);
		return new DocumentFormatter(config);
	}

	provideDocumentFormattingEdits(
		document: vscode.TextDocument
	): vscode.ProviderResult<vscode.TextEdit[]> {
		const text = document.getText();
		const formattedText = formatText(text, this.config);
		const edit = new vscode.TextEdit(
			new vscode.Range(
				document.positionAt(0),
				document.positionAt(text.length)
			),
			formattedText
		);
		return [edit];
	}
}

export { DocumentFormatter, FormatConfig, defaultConfig };
