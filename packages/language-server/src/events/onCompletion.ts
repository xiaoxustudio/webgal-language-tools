import {
	findTokenRange,
	getPatternAtPosition,
	getStageCompletionContext,
	getWordAtPosition
} from "@/utils";
import {
	CommandNameSpecial,
	globalArgs,
	WebGALConfigCompletionMap,
	WebGALKeywords,
	WebgGALKeywordsCompletionMap
} from "@/utils/provider";
import { resourcesMap } from "@/utils/resources";
import {
	Connection,
	CompletionItem,
	CompletionItemKind,
	Position
} from "@volar/language-server";
import type { IDefinetionMap } from "@webgal/language-core";
import type { StateMap } from "@webgal/language-service/utils";
import { TextDocument } from "vscode-languageserver-textdocument";

export async function provideCompletionItems(
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
			getStageCompletionContext(document, position, findWordWithPattern);
		const sendPath = querySegments.length ? querySegments : fullSegments;
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

	const currentLine = documentTextArray[position.line] ?? "";
	const commandType = lineCommandTypes[position.line] ?? "";
	const isSayCommandType = !resourcesMap[commandType as CommandNameSpecial];

	if (
		token.startsWith("./") ||
		!!~token.indexOf("/") ||
		Object.keys(resourcesMap).includes(commandType) ||
		token.startsWith("-")
	) {
		if (enableResourceCompletion) {
			const resourceBaseDir = isSayCommandType
				? "vocal"
				: resourcesMap[commandType];
			if (resourceBaseDir) {
				const dirs = await connection.sendRequest<any>(
					"client/getResourceDirectory",
					[resourceBaseDir, token]
				);
				if (dirs) {
					for (const dir of dirs) {
						CompletionItemSuggestions.push({
							label: dir.name,
							kind: dir.isDirectory
								? CompletionItemKind.Folder
								: CompletionItemKind.File
						} satisfies CompletionItem);
					}
				}
			}
		}

		if (wordMeta && token.startsWith("-")) {
			let keyData =
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
					self.findIndex((item) => item.label === parentItem.label)
			);
			CompletionItemSuggestions.push(...uniqueData);
		}
		return CompletionItemSuggestions;
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
}
