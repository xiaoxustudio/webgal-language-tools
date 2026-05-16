import jsBeautify = require("js-beautify");
const formatRegex = /(\s{2,}-\S+)/;

export interface FormatConfig {
	indentSize: number; // 缩进大小
	indentStyle: "space" | "tab"; // 缩进风格
	trailingSemicolon: boolean; // 是否添加尾随分号
	keyValueSpace: boolean; // 键值对之间是否添加空格
	normalizeWhitespace: boolean; // 是否规范化空白字符
}

export const defaultConfig: FormatConfig = {
	indentSize: 2,
	indentStyle: "space",
	trailingSemicolon: true,
	keyValueSpace: true,
	normalizeWhitespace: true
};

export function formatText(
	text: string,
	config: FormatConfig = defaultConfig
): string {
	if (config.normalizeWhitespace) {
		while (formatRegex.test(text)) {
			text = text.replace(formatRegex, (val) =>
				val.replace(/^[\s]+/, " ")
			);
		}
	}

	const lines = text.split("\n");
	const formattedLines: string[] = [];

	for (const line of lines) {
		formattedLines.push(formatLine(line));
	}

	return formattedLines.join("\n");
}

export function formatLine(
	line: string,
	config: FormatConfig = defaultConfig
): string {
	let processedLine = line;

	if (config.trailingSemicolon) {
		if (
			processedLine.length > 0 &&
			!processedLine.includes(";") &&
			processedLine !== "\r"
		) {
			const colonIndex = processedLine.indexOf(":");
			if (colonIndex !== -1) {
				const keyPart = processedLine.substring(0, colonIndex);
				const valuePart = processedLine.substring(colonIndex).trimEnd();
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
		if (config.keyValueSpace) {
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
			config.indentStyle === "tab" ? "\t" : " ".repeat(config.indentSize);

		const options = {
			indent_size: config.indentSize,
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
