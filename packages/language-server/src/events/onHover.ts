import { getPatternAtPosition, getWordAtPosition } from "@/utils";
import type { CommandNameSpecial } from "@/utils/provider";
import {
	WebGALConfigMap,
	WebGALKeywords,
	WebGALCommandPrefix,
	argsMap
} from "@/utils/provider";
import type { Connection, Hover, MarkupContent } from "@volar/language-server";
import { Position } from "@volar/language-server";
import { MarkupKind, Range } from "@volar/language-server";
import type { IDefinetionMap, StateMap } from "@webgal/language-core";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import type { WebgalDocumentLinkCandidate } from "@/types";
import {
	isImageFile,
	buildImagePreviewMarkdown,
	resolveCandidateFile
} from "./onDocumentLinks";
import type { LanguageServerSettings } from "@/server/setting";

export default function (settings: LanguageServerSettings) {
	return async function provideHover(
		document: TextDocument,
		position: Position,
		connection: Connection,
		definitionMap: IDefinetionMap,
		lineCommandTypes: string[],
		sourceUri: string,
		candidates: WebgalDocumentLinkCandidate[]
	): Promise<Hover> {
		let showImagePreview = true;
		const config = await settings.getDocumentSettings(
			connection,
			document.uri
		);
		if (config && typeof config.isShowImagePreview === "boolean") {
			showImagePreview = config.isShowImagePreview;
		}

		if (showImagePreview) {
			for (const candidate of candidates) {
				if (
					candidate.line === position.line &&
					position.character >= candidate.start &&
					position.character <= candidate.end
				) {
					// 快速检查：候选文本是否以图片扩展名结尾
					if (!isImageFile(candidate.text)) {
						break;
					}

					// 解析文件路径
					const pathArray = document.uri.split("/");
					const currentDirectory =
						await connection.sendRequest<string>(
							"client/currentDirectory"
						);
					const pathName =
						pathArray[
							pathArray.length - 3 > 0
								? pathArray.length - 3
								: pathArray.length - 2
						];
					const isConfig =
						pathArray[pathArray.length - 1] === "config.txt" &&
						pathArray[pathArray.length - 2] === "game" &&
						pathName === pathArray[pathArray.length - 3];

					const resolvedPath = await resolveCandidateFile(
						candidate,
						currentDirectory,
						isConfig,
						connection
					);

					if (resolvedPath && isImageFile(resolvedPath)) {
						const fileUri = URI.file(resolvedPath).toString();
						return {
							contents: {
								kind: MarkupKind.Markdown,
								value: buildImagePreviewMarkdown(
									fileUri,
									resolvedPath
								)
							} as MarkupContent,
							range: Range.create(
								Position.create(
									candidate.line,
									candidate.start
								),
								Position.create(candidate.line, candidate.end)
							)
						};
					}
					break;
				}
			}
		}

		const file_name = sourceUri;
		const commandType = lineCommandTypes[position.line] ?? "";

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
			const commandData =
				WebGALKeywords[commandType as CommandNameSpecial]?.args;
			const argsData = commandData
				? Object.values(commandData).find(
						(item) => item.label === findWordWithPattern!.text
					)
				: undefined;
			if (argsData) {
				return {
					contents: {
						kind: MarkupKind.Markdown,
						value: [
							`### ${argsData.label}`,
							`${argsData.documentation.value}`
						].join("\n\n")
					} as MarkupContent,
					range: Range.create(
						findWordWithPattern.startPos,
						findWordWithPattern.endPos
					)
				};
			} else {
				// 如果在指令找不到就在全局中找
				const argsData = Object.values(argsMap).find(
					(item) => item.label === findWordWithPattern!.text
				);
				if (argsData) {
					return {
						contents: {
							kind: MarkupKind.Markdown,
							value: [
								`### ${argsData.label}`,
								`${argsData.documentation.value}`
							].join("\n\n")
						} as MarkupContent,
						range: Range.create(
							findWordWithPattern.startPos,
							findWordWithPattern.endPos
						)
					};
				}
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

		const maybeCommandMap =
			WebGALKeywords[commandType as CommandNameSpecial];
		if (maybeCommandMap) {
			for (const key in WebGALKeywords) {
				if (findWord.word === key && commandType === key) {
					return {
						contents: {
							kind: MarkupKind.Markdown,
							value: [
								`### ${key}`,
								(
									maybeCommandMap.documentation as string
								)?.replace(/\t+/g, "") || maybeCommandMap.desc,
								`${WebGALCommandPrefix}${key}`
							].join("\n\n")
						} as MarkupContent
					};
				}
			}
		}

		if (findWord && `{${findWord.word}}` !== "{}") {
			const current = definitionMap.setVar[findWord.word];
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
			if (findWord.word in definitionMap.setVar) {
				const positionValue = currentVariable.position;
				const line =
					positionValue && typeof positionValue.line === "number"
						? positionValue.line
						: -1;
				const character =
					positionValue && typeof positionValue.character === "number"
						? positionValue.character
						: -1;
				hoverContent.push(`Position: ${line + 1},${character + 1}`);
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
	};
}
