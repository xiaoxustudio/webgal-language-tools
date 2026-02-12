import {
	findTokenRange,
	getPatternAtPosition,
	getStageCompletionContext,
	getWordAtPosition,
	updateGlobalMap
} from "@/utils";
import {
	CommandNameSpecial,
	globalArgs,
	WebGALConfigCompletionMap,
	WebGALKeywords,
	WebgGALKeywordsCompletionMap
} from "@/utils/provider";
import { StateMap } from "@/utils/providerState";
import { resourcesMap } from "@/utils/resources";
import {
	Connection,
	CompletionItem,
	CompletionItemKind,
	Position
} from "@volar/language-server";
import { GlobalMap } from "@webgal/language-core";
import { TextDocument } from "vscode-languageserver-textdocument";

export async function provideCompletionItems(
	document: TextDocument,
	position: Position,
	connection: Connection
): Promise<CompletionItem[]> {
	// 使用 volar.js 的服务式补全入口，保留原有 WebGAL 逻辑
	const file_name = document.uri;
	const documentTextArray = document.getText().split("\n");

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
		const info = await connection.sendRequest<
			StateMap | Record<string, StateMap>
		>(
			"client/goPropertyDoc",
			querySegments.length ? querySegments : fullSegments
		);

		if (info) {
			delete info.__WG$key;
			delete info.__WG$description;
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

	const currentLine = documentTextArray[position.line];
	const commandType = currentLine.substring(
		0,
		currentLine.indexOf(":") !== -1
			? currentLine.indexOf(":")
			: currentLine.indexOf(";")
	);
	const isSayCommandType = !resourcesMap[commandType as CommandNameSpecial];

	if (
		token.startsWith("./") ||
		!!~token.indexOf("/") ||
		Object.keys(resourcesMap).includes(commandType) ||
		token.startsWith("-")
	) {
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

		if (wordMeta && token.startsWith("-")) {
			let keyData =
				WebGALKeywords[wordMeta.word as CommandNameSpecial] ??
				WebGALKeywords["say"];

			const data = [...keyData.args, ...globalArgs].map((arg) => {
				return {
					label: arg.arg,
					kind: CompletionItemKind.Constant,
					documentation: arg.desc,
					detail: arg.desc
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
		updateGlobalMap(documentTextArray);
		const currentPool = GlobalMap.setVar;
		for (const key in currentPool) {
			if (key.includes(token)) {
				const latest =
					GlobalMap.setVar[key][GlobalMap.setVar[key].length - 1];
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
