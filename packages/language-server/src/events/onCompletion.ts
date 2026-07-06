import {
	findTokenRange,
	getPatternAtPosition,
	getStageCompletionContext,
	getWordAtPosition
} from "@/utils";
import type { CommandNameSpecial } from "@/utils/provider";
import {
	globalArgs,
	WebGALConfigCompletionMap,
	WebGALKeywords,
	WebgGALKeywordsCompletionMap
} from "@/utils/provider";
import { resourcesMap } from "@/utils/resources";
import type { Connection, CompletionItem } from "@volar/language-server";
import { CompletionItemKind, Position } from "@volar/language-server";
import type {
	IDefinetionMap,
	DirectoryEntry,
	StateMap
} from "@webgal/language-core";
import type { TextDocument } from "vscode-languageserver-textdocument";

export default function () {
	return async function provideCompletionItems(
		document: TextDocument,
		position: Position,
		connection: Connection,
		definitionMap: IDefinetionMap,
		lines: string[],
		lineCommandTypes: string[],
		sourceUri: string,
		enableResourceCompletion: boolean
	): Promise<CompletionItem[]> {
		const file_name = sourceUri;
		const documentTextArray = lines;

		const { token } = findTokenRange(document, position);
		const CompletionItemSuggestions: CompletionItem[] = [];

		if (file_name.endsWith("/game/config.txt")) {
			const completionItems = [];
			for (const key in WebGALConfigCompletionMap) {
				const keyData = WebGALConfigCompletionMap[key];
				if (key.toLowerCase().includes(token.toLowerCase())) {
					completionItems.push(keyData);
				}
			}
			return completionItems;
		}

		const findWordWithPattern = getPatternAtPosition(
			document,
			position,
			/\$(stage|userData)(?:\.[\w-]*)*/
		);
		const isStateMap = (
			value: StateMap | Record<string, StateMap>
		): value is StateMap => {
			return (
				typeof (value as StateMap).key === "string" &&
				typeof (value as StateMap).description === "string"
			);
		};

		if (findWordWithPattern) {
			const { replaceRange, fullSegments, querySegments, prefix } =
				getStageCompletionContext(
					document,
					position,
					findWordWithPattern
				);
			const sendPath = querySegments.length
				? querySegments
				: fullSegments;
			const info = await connection.sendRequest<
				StateMap | Record<string, StateMap>
			>("client/goPropertyDoc", sendPath);

			if (info) {
				delete info.__WG$key;
				delete info.__WG$description;
				// 如果是单个属性值，则不进行补全
				if (
					"key" in info &&
					"description" in info &&
					"type" in info &&
					"value" in info
				) {
					return CompletionItemSuggestions;
				}
				if (!isStateMap(info)) {
					for (const key in info) {
						if (prefix && !key.includes(prefix)) {
							continue;
						}
						const current = info[key] as StateMap;
						CompletionItemSuggestions.push({
							label: key,
							kind: CompletionItemKind.Constant,
							documentation: current.description,
							filterText: key,
							textEdit: {
								range: replaceRange,
								newText: key
							}
						} satisfies CompletionItem);
					}
				} else {
					if (prefix && !info.key.includes(prefix)) {
						return CompletionItemSuggestions;
					}
					CompletionItemSuggestions.push({
						label: info.key,
						kind: CompletionItemKind.Constant,
						documentation: info.description,
						filterText: info.key,
						textEdit: {
							range: replaceRange,
							newText: info.key
						}
					} satisfies CompletionItem);
				}
			}
			return CompletionItemSuggestions;
		}

		const wordMeta = getWordAtPosition(
			document,
			Position.create(position.line, 0)
		);

		const getPath = (line: string) => {
			const result = line.match("(?<=:\\s*)\\S.*/");
			return result ? result[0] : "";
		};

		const getChoosePath = (line: string) => {
			const result0 = line.match("(?<=:\\s*)[^:|\\|]*$");
			if (!result0) {
				return null;
			}
			const result1 = result0[0].match(".*/");
			return result1 ? result1[0] : "";
		};

		const getAnimationArgInput = (line: string) => {
			const result = line.match(/(?:^|\s)-(?:enter|exit)=([^\s;]*)$/);
			return result ? result[1] : null;
		};

		const currentLine = documentTextArray[position.line] ?? "";
		const commandType = lineCommandTypes[position.line] ?? "";
		const isResourceCommand =
			Object.keys(resourcesMap).includes(commandType);
		const animationCommandTypes = new Set<string>([
			WebGALKeywords.changeBg.label!,
			WebGALKeywords.changeFigure.label!,
			WebGALKeywords.setTransition.label!
		]);
		const isAnimationArgCompletion =
			!!currentLine.match(/\s-(enter|exit)=[^\s;]*$/) &&
			animationCommandTypes.has(commandType);

		// 输入 - 时仅展示参数补全（-next, -when, -continue 等），不与资源文件补全混合
		if (token.startsWith("-") && wordMeta) {
			const keyData =
				WebGALKeywords[wordMeta.word as CommandNameSpecial] ??
				WebGALKeywords["say"];
			const data = [...keyData.args, ...globalArgs].map((arg) => {
				return {
					label: arg.label,
					kind: CompletionItemKind.Constant,
					documentation: arg.documentation,
					detail: arg.detail
				};
			}) as CompletionItem[];
			const uniqueData = data.filter(
				(parentItem, index, self) =>
					index ===
					self.findIndex(
						(item) => item.label === parentItem.label
					)
			);
			CompletionItemSuggestions.push(...uniqueData);
			return CompletionItemSuggestions;
		}

		if (
			isResourceCommand ||
			isAnimationArgCompletion
		) {
			let hasResourceResults = false;
			if (enableResourceCompletion) {
				let resourceBaseDir: string | undefined;
				let subDir = "";
				let filterPrefix: string | null = null;
				let isAnimationSuggestion = false;

				if (isAnimationArgCompletion) {
					const argInput = getAnimationArgInput(currentLine);
					if (argInput !== null) {
						resourceBaseDir = "animation";
						isAnimationSuggestion = true;
						const lastSlashIndex = argInput.lastIndexOf("/");
						subDir =
							lastSlashIndex >= 0
								? argInput.slice(0, lastSlashIndex + 1)
								: "";
						filterPrefix =
							lastSlashIndex >= 0
								? argInput.slice(lastSlashIndex + 1)
								: argInput;
					}
				} else if (isResourceCommand) {
					resourceBaseDir =
						resourcesMap[commandType as CommandNameSpecial];
					if (commandType === WebGALKeywords.choose.label) {
						const path = getChoosePath(currentLine);
						if (path !== null) {
							subDir = path;
						}
					} else {
						subDir = getPath(currentLine);
					}
					// 从用户正在输入的 token 中提取过滤前缀
					if (token && !token.startsWith("-")) {
						const lastSlash = token.lastIndexOf("/");
						filterPrefix =
							lastSlash >= 0
								? token.slice(lastSlash + 1)
								: token;
					}
				}
				if (resourceBaseDir) {
					const requestUrls = subDir
						? [resourceBaseDir, subDir]
						: [resourceBaseDir];
					try {
						const dirs =
							await connection.sendRequest<DirectoryEntry[]>(
								"client/getResourceDirectory",
								requestUrls
							);
						if (dirs && dirs.length > 0) {
							const visibleDirs = dirs.filter(
								(dir) => !dir.name.startsWith(".")
							);
							if (isAnimationSuggestion) {
								const filtered = visibleDirs
									.filter(
										(file) =>
											file.name !==
											"animationTable.json"
									)
									.filter((file) =>
										filterPrefix
											? file.name.startsWith(
													filterPrefix
												)
											: true
									);
								for (const file of filtered) {
									if (file.isDirectory) {
										const dirName = `${file.name}/`;
										CompletionItemSuggestions.push({
											label: dirName,
											insertText: dirName,
											kind: CompletionItemKind.Folder
										} satisfies CompletionItem);
									} else {
										const insertName = file.name.endsWith(
											".json"
										)
											? file.name.slice(0, -5)
											: file.name;
										CompletionItemSuggestions.push({
											label: insertName,
											insertText: insertName,
											kind: CompletionItemKind.File
										} satisfies CompletionItem);
									}
								}
							} else {
								// 通用资源/场景文件补全：按用户输入前缀过滤
								const filtered = filterPrefix
									? visibleDirs.filter((entry) =>
											entry.name
												.toLowerCase()
												.startsWith(
													filterPrefix.toLowerCase()
												)
										)
									: visibleDirs;
								for (const dir of filtered) {
									CompletionItemSuggestions.push({
										label: dir.name,
										insertText: dir.name,
										kind: dir.isDirectory
											? CompletionItemKind.Folder
											: CompletionItemKind.File
									} satisfies CompletionItem);
								}
							}
							hasResourceResults =
								CompletionItemSuggestions.length > 0;
						}
					} catch {
						// 资源目录请求失败（VFS 未就绪、路径不存在等），回退到基础补全
					}
				}
			}
			// 仅在确实获得了资源补全结果时才提前返回；
			// 否则回退到基础补全（变量 + 命令 + $stage/$userData）
			if (hasResourceResults) {
				return CompletionItemSuggestions;
			}
			// fall through → 基础补全
		}

		if (token) {
			const currentPool = definitionMap.setVar;
			for (const key in currentPool) {
				if (key.includes(token)) {
					const latest =
						definitionMap.setVar[key][
							definitionMap.setVar[key].length - 1
						];
					CompletionItemSuggestions.push({
						label: key,
						kind: CompletionItemKind.Variable,
						documentation: latest.desc
					} satisfies CompletionItem);
				}
			}
		}

		if (
			(!wordMeta && position.character === 0) ||
			(token && !~currentLine.indexOf(":"))
		) {
			CompletionItemSuggestions.push(...WebgGALKeywordsCompletionMap);
		}

		CompletionItemSuggestions.push(
			{
				label: "$stage",
				kind: CompletionItemKind.Variable
			},
			{
				label: "$userData",
				kind: CompletionItemKind.Variable
			}
		);
		return CompletionItemSuggestions;
	};
}
