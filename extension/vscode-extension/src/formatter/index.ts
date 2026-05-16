import * as vscode from "vscode";
import jsBeautify = require("js-beautify");
import * as fs from "fs";
import * as path from "path";

const _format_p = /(\s{2,}-\S+)/;

interface FormatConfig {
	indentSize: number; // 缩进大小
	indentStyle: "space" | "tab"; // 缩进风格
	trailingSemicolon: boolean; // 是否添加尾随分号
	keyValueSpace: boolean; // 键值对之间是否添加空格
	normalizeWhitespace: boolean; // 是否规范化空白字符
}

const defaultConfig: FormatConfig = {
	indentSize: 2,
	indentStyle: "space",
	trailingSemicolon: true,
	keyValueSpace: true,
	normalizeWhitespace: true
};

function loadFormatConfig(
	workspaceFolder: vscode.WorkspaceFolder | undefined
): FormatConfig {
	if (!workspaceFolder) {
		return defaultConfig;
	}

	const configPath = path.join(workspaceFolder.uri.fsPath, "fmt.json");
	try {
		if (fs.existsSync(configPath)) {
			const content = fs.readFileSync(configPath, "utf-8");
			const userConfig = JSON.parse(content);
			return { ...defaultConfig, ...userConfig };
		}
	} catch (e) {
		console.error("Failed to load fmt.json:", e);
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
		const formattedText = this.formatText(text);
		const edit = new vscode.TextEdit(
			new vscode.Range(
				document.positionAt(0),
				document.positionAt(text.length)
			),
			formattedText
		);
		return [edit];
	}

	private formatText(text: string): string {
		if (this.config.normalizeWhitespace) {
			while (_format_p.test(text)) {
				text = text.replace(_format_p, (val) =>
					val.replace(/^[\s]+/, " ")
				);
			}
		}

		const lines = text.split("\n");
		const formattedLines: string[] = [];

		for (const line of lines) {
			formattedLines.push(this.formatLine(line));
		}

		return formattedLines.join("\n");
	}

	private formatLine(line: string): string {
		let processedLine = line;

		if (this.config.trailingSemicolon) {
			if (
				processedLine.length > 0 &&
				!processedLine.includes(";") &&
				processedLine !== "\r"
			) {
				const colonIndex = processedLine.indexOf(":");
				if (colonIndex !== -1) {
					const keyPart = processedLine.substring(0, colonIndex);
					const valuePart = processedLine
						.substring(colonIndex)
						.trimEnd();
					processedLine = keyPart + valuePart + ";";
				} else {
					processedLine = processedLine.trimEnd() + ";";
				}
			}
		}

		if (processedLine.includes(":")) {
			const colonIndex = processedLine.indexOf(":");
			const key = processedLine.substring(0, colonIndex).trim();
			const value = processedLine.substring(colonIndex + 1).trimEnd();
			if (this.config.keyValueSpace) {
				processedLine = `${key}: ${value}`;
			} else {
				processedLine = `${key}:${value}`;
			}
		}

		if (processedLine.startsWith("setVar") && processedLine.includes("=")) {
			const equalIndex = processedLine.indexOf("=");
			const leftPart = processedLine.substring(0, equalIndex);
			const rightPart = processedLine.substring(equalIndex + 1);

			const indentStr =
				this.config.indentStyle === "tab"
					? "\t"
					: " ".repeat(this.config.indentSize);

			const options = {
				indent_size: this.config.indentSize,
				indent_char: indentStr,
				space_in_empty_paren: true
			};
			const beautifiedCode = jsBeautify(rightPart, options);

			processedLine = leftPart + "=" + beautifiedCode;
		}

		if (processedLine.startsWith(" ")) {
			processedLine = processedLine.trimStart();
		}

		return processedLine;
	}
}

export { DocumentFormatter, FormatConfig, defaultConfig };
