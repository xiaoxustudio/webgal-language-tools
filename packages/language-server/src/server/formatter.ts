import * as fs from "fs";
import * as path from "path";
import { defaultConfig, formatText } from "@webgal/language-core";
import type { FormatConfig } from "@webgal/language-core";
import type { URI } from "vscode-uri";

function loadFormatConfig(documentUri: URI): FormatConfig {
	const uriPath =
		documentUri.scheme === "file" ? documentUri.fsPath : documentUri.path;

	if (!uriPath) {
		return defaultConfig;
	}

	let currentDir = path.dirname(uriPath);
	while (currentDir) {
		const configPath = path.join(currentDir, "fmt.json");
		try {
			if (fs.existsSync(configPath)) {
				const content = fs.readFileSync(configPath, "utf-8");
				const userConfig = JSON.parse(content);
				console.log("Loaded fmt.json config:", userConfig);
				return { ...defaultConfig, ...userConfig };
			}
		} catch (e) {
			console.log("Failed to load fmt.json config:", e);
		}
		const parentDir = path.dirname(currentDir);
		if (parentDir === currentDir) {
			break;
		}
		currentDir = parentDir;
	}
	return defaultConfig;
}

export function formatDocumentText(text: string, documentUri: URI): string {
	const config = loadFormatConfig(documentUri);
	return formatText(text, config);
}

export { loadFormatConfig, FormatConfig, defaultConfig };
