import * as vscode from "vscode";
import jsBeautify from "js-beautify";

const _format_p = /(\s{2,}\-\S+)/;

class DocumentFormatter implements vscode.DocumentFormattingEditProvider {
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
		while (_format_p.test(text)) {
			text = text.replace(_format_p, (val) => val.replace(/^[\s]+/, " "));
		}

		const lines = text.split("\n");
		const formattedLines: string[] = [];

		for (const line of lines) {
			formattedLines.push(this.formatLine(line));
		}

		return formattedLines.join("\n");
	}

	/**
	 * 格式化单行代码
	 */
	private formatLine(line: string): string {
		let processedLine = line;

		// 1. 处理行末分号缺失的情况
		// 仅处理非空且不含分号的行
		if (
			processedLine.length > 0 &&
			!processedLine.includes(";") &&
			processedLine !== "\r"
		) {
			const colonIndex = processedLine.indexOf(":");
			if (colonIndex !== -1) {
				// 如果包含冒号，去除冒号后的尾部空格再加分号 (处理 key: value 情况)
				const keyPart = processedLine.substring(0, colonIndex);
				const valuePart = processedLine.substring(colonIndex).trimEnd();
				processedLine = keyPart + valuePart + ";";
			} else {
				// 如果不包含冒号，直接去除尾部空格并加分号 (处理简单语句)
				processedLine = processedLine.trimEnd() + ";";
			}
		}

		// 2. 规范化冒号两侧的空格 (格式化为 "key: value")
		if (processedLine.includes(":")) {
			const colonIndex = processedLine.indexOf(":");
			const key = processedLine.substring(0, colonIndex).trim();
			const value = processedLine.substring(colonIndex + 1).trimEnd();
			if (value.startsWith("-")) {
				processedLine = `${key}: ${value}`;
			} else {
				processedLine = `${key}:${value}`;
			}
		}

		// 3. 处理特定关键字 (setVar) 后的等号表达式
		if (processedLine.startsWith("setVar") && processedLine.includes("=")) {
			const equalIndex = processedLine.indexOf("=");
			const leftPart = processedLine.substring(0, equalIndex);
			const rightPart = processedLine.substring(equalIndex + 1);

			const options = {
				indent_size: 2,
				space_in_empty_paren: true
			};
			const beautifiedCode = jsBeautify(rightPart, options);

			processedLine = leftPart + "=" + beautifiedCode;
		}

		// 4. 去除行首空格
		if (processedLine.startsWith(" ")) {
			processedLine = processedLine.trimStart();
		}

		return processedLine;
	}
}

export default DocumentFormatter;
