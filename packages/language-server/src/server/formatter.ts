import { defaultConfig, formatText } from "@webgal/language-core";
import type { FormatConfig } from "@webgal/language-core";
import type { URI } from "vscode-uri";

async function loadFormatConfig(documentUri: URI): Promise<FormatConfig> {
	const uriPath =
		documentUri.scheme === "file" ? documentUri.fsPath : documentUri.path;

	if (!uriPath) {
		return defaultConfig;
	}

	const isNodeRuntime =
		typeof process !== "undefined" &&
		!!process.versions &&
		!!process.versions.node;

	if (!isNodeRuntime) {
		return defaultConfig;
	}

	const [path, fs] = await Promise.all([import("path"), import("fs")]);
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

export async function formatDocumentText(
	text: string,
	documentUri: URI
): Promise<string> {
	const config = await loadFormatConfig(documentUri);
	return formatText(text, config);
}

export { loadFormatConfig, FormatConfig, defaultConfig };
