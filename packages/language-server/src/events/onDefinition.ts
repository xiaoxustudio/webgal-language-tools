import { getWordAtPosition, updateGlobalMap } from "@/utils";
import {
	DefinitionLink,
	LocationLink,
	Range,
	Position
} from "@volar/language-server";
import { GlobalMap } from "@webgal/language-core";
import { TextDocument } from "vscode-languageserver-textdocument";

export function provideDefinition(
	document: TextDocument,
	position: Position
): DefinitionLink[] {
	// 使用 volar.js 的服务式定义跳转入口
	const text = document.getText();
	const findWord = getWordAtPosition(document, position);
	const definitionLinks: DefinitionLink[] = [];
	if (!findWord) {
		return definitionLinks;
	}
	const documentTextArray = text.split("\n");
	const currentLine = documentTextArray[position.line];

	const commandType = currentLine.substring(
		0,
		currentLine.indexOf(":") !== -1
			? currentLine.indexOf(":")
			: currentLine.indexOf(";")
	);

	updateGlobalMap(documentTextArray);
	const jumpLabelMap = GlobalMap.label;
	const setVarMap = GlobalMap.setVar;

	const targetPool = ["jumpLabel", "choose"].includes(commandType)
		? jumpLabelMap
		: setVarMap;
	if (!targetPool) {
		return definitionLinks;
	}
	const targetPoolArray = targetPool[findWord.word];
	if (!targetPoolArray) {
		return definitionLinks;
	}
	for (const current of targetPoolArray) {
		if (current.word === findWord.word) {
			definitionLinks.push(
				LocationLink.create(
					document.uri,
					Range.create(
						Position.create(position.line, findWord.start),
						Position.create(position.line, findWord.end)
					),
					Range.create(current.position, current.position),
					Range.create(Position.create(0, 0), Position.create(0, 0))
				)
			);
		}
	}
	return definitionLinks;
}
