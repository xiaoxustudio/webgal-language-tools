import type {
	Connection,
	InlayHint,
	InlayHintKind,
	Range
} from "@volar/language-server";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type { LanguageServerSettings } from "@/server/setting";
import { defaultSettings } from "@/server/setting";
import type { IDefinetionMap, IVToken } from "@webgal/language-core";

function inferType(token: IVToken): string {
	if (token.isGetUserInput) {
		return "string";
	}
	const value = token.value;
	if (!value) {
		return "string";
	}
	const trimmed = value.trim();
	if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
		return "number";
	}
	if (/^(true|false)$/i.test(trimmed)) {
		return "boolean";
	}
	if (/^["'].*["']$/.test(trimmed)) {
		return "string";
	}
	return "any";
}

export default function (settings: LanguageServerSettings) {
	return async function provideInlayHints(
		document: TextDocument,
		_range: Range,
		connection: Connection,
		definitionMap: IDefinetionMap,
		lines: string[]
	): Promise<InlayHint[]> {
		const config =
			(await settings.getDocumentSettings(connection, document.uri)) ??
			defaultSettings;
		if (config.isShowHint === "关闭") {
			return [];
		}

		const hints: InlayHint[] = [];
		const showHint = config.isShowHint;

		for (const [, tokens] of Object.entries(definitionMap.setVar)) {
			for (const token of tokens) {
				if (!token.position) {
					continue;
				}
				const typeLabel = inferType(token);
				const line = token.position.line;
				const lineLength = lines[line]?.length ?? 0;
				const nameEnd = token.position.character + token.word.length;

				let pos: { line: number; character: number };
				switch (showHint) {
					case "最前面":
						pos = { line, character: 0 };
						break;
					case "变量名前":
						pos = { line, character: token.position.character };
						break;
					case "变量名后":
						pos = { line, character: nameEnd };
						break;
					case "最后面":
						pos = { line, character: lineLength };
						break;
					default:
						pos = { line, character: nameEnd };
				}

				hints.push({
					position: pos,
					label: `: ${typeLabel}`,
					kind: 1 as InlayHintKind,
					paddingLeft:
						showHint === "变量名后" || showHint === "最后面",
					paddingRight:
						showHint === "最前面" || showHint === "变量名前"
				});
			}
		}

		return hints;
	};
}
