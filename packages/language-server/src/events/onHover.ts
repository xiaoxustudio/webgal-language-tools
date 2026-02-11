import {
	getPatternAtPosition,
	getWordAtPosition,
	updateGlobalMap
} from "@/utils";
import {
	argsMap,
	WebGALConfigMap,
	WebGALKeywords,
	CommandNameSpecial,
	WebGALCommandPrefix
} from "@/utils/provider";
import { StateMap } from "@/utils/providerState";
import {
	Connection,
	Hover,
	MarkupKind,
	MarkupContent,
	Position,
	Range
} from "@volar/language-server";
import { GlobalMap } from "@webgal/language-core";
import { TextDocument } from "vscode-languageserver-textdocument";

export async function provideHover(
	document: TextDocument,
	position: Position,
	connection: Connection
): Promise<Hover> {
	// 使用 volar.js 的服务式 hover 入口
	const file_name = document.uri;
	const text = document.getText();
	const documentTextArray = text.split("\n");
	const currentLine = documentTextArray[position.line];

	const commandType = currentLine.substring(
		0,
		currentLine.indexOf(":") !== -1
			? currentLine.indexOf(":")
			: currentLine.indexOf(";")
	);

	let findWordWithPattern = getPatternAtPosition(
		document,
		position,
		/\{([^}]*)\}/
	);

	findWordWithPattern = getPatternAtPosition(
		document,
		position,
		/(?<=-)[\w]+/
	);
	if (findWordWithPattern) {
		const argsData = argsMap[findWordWithPattern.text];
		if (argsData) {
			return {
				contents: {
					kind: MarkupKind.Markdown,
					value: [
						`### ${argsData.label}`,
						`${argsData?.documentation}`,
						`\`${argsData.detail}\``
					].join("\n\n")
				} as MarkupContent,
				range: Range.create(
					findWordWithPattern.startPos,
					findWordWithPattern.endPos
				)
			};
		}
	}

	findWordWithPattern = getPatternAtPosition(
		document,
		position,
		/\$(stage|userData)((?:\.[\w-]+)+|\b)/
	);
	if (findWordWithPattern) {
		const strArray = findWordWithPattern.text.slice(1).split(".");
		const info = await connection.sendRequest<StateMap>(
			"client/goPropertyDoc",
			strArray
		);
		if (info) {
			return {
				contents: {
					kind: MarkupKind.Markdown,
					value: [
						`### ${info.key ?? findWordWithPattern.text}`,
						`\`${info.__WG$key ?? info.type?.key ?? ""}\``,
						`${info?.description ?? info.__WG$description}`
					].join("\n\n")
				} as MarkupContent,
				range: Range.create(
					findWordWithPattern.startPos,
					findWordWithPattern.endPos
				)
			};
		}
	}

	const findWord = getWordAtPosition(document, position);
	if (!findWord) {
		return { contents: [] };
	}

	if (file_name.endsWith("/game/config.txt")) {
		for (const i in WebGALConfigMap) {
			const kw_val = WebGALConfigMap[i];
			if (findWord.word === i) {
				return {
					contents: {
						kind: MarkupKind.Markdown,
						value: [`**${i}**`, `\n${kw_val.desc}`].join("\n")
					} as MarkupContent
				};
			}
		}
		return { contents: [] };
	}

	const maybeCommandMap = WebGALKeywords[commandType as CommandNameSpecial];
	if (maybeCommandMap) {
		for (const key in WebGALKeywords) {
			if (findWord.word === key && commandType === key) {
				return {
					contents: {
						kind: MarkupKind.Markdown,
						value: [
							`### ${key}`,
							(maybeCommandMap.documentation as string)?.replace(
								/\t+/g,
								""
							) || maybeCommandMap.desc,
							`${WebGALCommandPrefix}${key}`
						].join("\n\n")
					} as MarkupContent
				};
			}
		}
	}

	updateGlobalMap(documentTextArray);

	if (findWord && `{${findWord.word}}` !== "{}") {
		const current = GlobalMap.setVar[findWord.word];
		if (!current || current.length <= 0) {
			return { contents: [] };
		}
		const currentVariable = current[current.length - 1];
		const hoverContent = [`### ${findWord.word}`];
		if (!currentVariable) {
			return { contents: [] };
		}
		if (currentVariable.desc && currentVariable.desc.length > 0) {
			hoverContent.push("<hr>");
			hoverContent.push(currentVariable.desc);
		}
		hoverContent.push("<hr>");
		if (findWord.word in GlobalMap.setVar) {
			hoverContent.push(
				`Position: ${currentVariable.position?.line + 1},${currentVariable.position?.character + 1}`
			);
			hoverContent.push("```webgal");
			hoverContent.push(
				`${currentVariable.input?.replace(/\t\r\n/g, "")}\n\n\`\`\``
			);
		}
		return {
			contents: {
				kind: MarkupKind.Markdown,
				value: hoverContent.join("\n\n")
			} as MarkupContent
		};
	}

	return { contents: [] };
}
