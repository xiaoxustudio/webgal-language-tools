import type { WebgalDocumentLinkCandidate, WebgalVirtualCode } from "@/types";
import {
	buildLineStarts,
	emptyDefinitionMap,
	fullCodeInformation,
	getLineCommandType,
	getLineFromOffset,
	getSnapshotText,
	getVariableDesc
} from "@/utils";
import { languageId } from "@/utils/resources";
import type { IScriptSnapshot } from "@volar/language-core";
import type { IDefinetionMap } from "@webgal/language-core";
import { FoldingRangeKind, type FoldingRange } from "vscode-languageserver";
import type { URI } from "vscode-uri";

export const analyzeWebgalText = (text: string): IDefinetionMap => {
	const map: IDefinetionMap = {
		label: {},
		setVar: {},
		choose: {}
	};
	const lines = text.split(/\r?\n/);
	for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
		const currentLine = lines[lineNumber];
		const setVarExec = /setVar:\s*(\w+)\s*=\s*([^;]*\S+);?/g.exec(
			currentLine
		);
		const labelExec = /label:\s*(\S+);/g.exec(currentLine);
		const getUserInputExec = /getUserInput:\s*([^\s;]+)/g.exec(currentLine);
		const chooseExec = /choose:\s*([^\s;]+)/g.exec(currentLine);
		if (setVarExec !== null) {
			const currentVariablePool = (map.setVar[setVarExec[1]] ??= []);
			const isGlobal = currentLine.indexOf("-global") !== -1;
			const currentToken = {
				word: setVarExec[1],
				value: setVarExec[2],
				input: setVarExec.input,
				isGlobal,
				isGetUserInput: false,
				position: { line: lineNumber, character: setVarExec.index + 7 },
				desc: getVariableDesc(lines, lineNumber)
			};
			currentVariablePool.push(currentToken);
		} else if (labelExec !== null) {
			(map.label[labelExec[1]] ??= []).push({
				word: labelExec[1],
				value: labelExec.input,
				input: labelExec.input,
				position: { line: lineNumber, character: 6 }
			});
		} else if (getUserInputExec !== null) {
			(map.setVar[getUserInputExec[1]] ??= []).push({
				word: getUserInputExec[1],
				value: getUserInputExec.input,
				input: getUserInputExec.input,
				isGetUserInput: true,
				position: { line: lineNumber, character: 13 }
			});
		} else if (chooseExec !== null) {
			const options: IDefinetionMap["choose"][number]["options"] = [];
			const text = chooseExec[1];
			for (const machChooseOption of text.split("|")) {
				const sliceArray = machChooseOption.split(":");
				options.push({
					text: sliceArray[0]?.trim(),
					value: sliceArray[1]?.trim()
				});
			}
			map.choose[lineNumber] = {
				options,
				line: lineNumber
			};
		}
	}
	return map;
};

export const analyzeWebgalDocumentLinks = (
	lines: string[]
): WebgalDocumentLinkCandidate[] => {
	const candidates: WebgalDocumentLinkCandidate[] = [];
	const regex = /\$?\{?(\w+)\.(\w+)\}?/g;
	for (let i = 0; i < lines.length; i++) {
		const currentLine = lines[i];
		const commandType = getLineCommandType(currentLine);
		let match: RegExpExecArray | null;
		while ((match = regex.exec(currentLine))) {
			if (match[0].startsWith("$")) {
				continue;
			}
			const matchText = match[0];
			candidates.push({
				line: i,
				start: match.index,
				end: match.index + matchText.length,
				text: matchText,
				command: commandType
			});
			if (regex.lastIndex === match.index) {
				regex.lastIndex++;
			}
		}
	}
	return candidates;
};

export const analyzeWebgalFoldingRanges = (text: string): FoldingRange[] => {
	const foldingRanges: FoldingRange[] = [];
	const regex = /label:([\s\S]*?)(?=(?:\r?\n|^)end|(?:\r?\n|^)label:|$)/g;
	const lineStarts = buildLineStarts(text);
	let match: RegExpExecArray | null;
	while ((match = regex.exec(text))) {
		const startLine = getLineFromOffset(lineStarts, match.index);
		const endOffset = match.index + match[0].length;
		let endLine = getLineFromOffset(lineStarts, endOffset);
		const endCharacter = endOffset - lineStarts[endLine];
		if (endCharacter === 0) {
			endLine = endLine - 1;
		}
		if (endLine > startLine) {
			foldingRanges.push({
				startLine,
				endLine,
				collapsedText:
					match[1].split("\n")[0].replace(/;/g, "").trim() || "...",
				kind: FoldingRangeKind.Region
			});
		}
	}
	return foldingRanges;
};

export const createWebgalVirtualCode = (
	scriptId: URI,
	languageId: string,
	snapshot: IScriptSnapshot
): WebgalVirtualCode => {
	const originalId = scriptId.toString();
	const normalizedId = originalId.toLowerCase();
	const length = snapshot.getLength();
	const text = getSnapshotText(snapshot);
	const lines = text.split(/\r?\n/);
	const lineCommandTypes = lines.map(getLineCommandType);
	const map =
		languageId === "webgal" ? analyzeWebgalText(text) : emptyDefinitionMap;
	const linkCandidates = analyzeWebgalDocumentLinks(lines);
	const foldingRanges = analyzeWebgalFoldingRanges(text);
	return {
		id: normalizedId,
		languageId,
		snapshot,
		mappings: [
			{
				sourceOffsets: [0],
				generatedOffsets: [0],
				lengths: [length],
				data: fullCodeInformation
			}
		],
		webgalOriginalId: originalId,
		webgalDefinitionMap: map,
		webgalDocumentLinkCandidates: linkCandidates,
		webgalFoldingRanges: foldingRanges,
		webgalLines: lines,
		webgalLineCommandTypes: lineCommandTypes
	};
};

export const updateWebgalVirtualCode = (
	virtualCode: WebgalVirtualCode,
	newSnapshot: IScriptSnapshot
): WebgalVirtualCode => {
	const length = newSnapshot.getLength();
	const mapping = virtualCode.mappings[0];
	if (mapping) {
		mapping.sourceOffsets[0] = 0;
		mapping.generatedOffsets[0] = 0;
		mapping.lengths[0] = length;
		mapping.data = fullCodeInformation;
	} else {
		virtualCode.mappings = [
			{
				sourceOffsets: [0],
				generatedOffsets: [0],
				lengths: [length],
				data: fullCodeInformation
			}
		];
	}
	virtualCode.snapshot = newSnapshot;
	if (virtualCode.languageId === languageId) {
		const text = getSnapshotText(newSnapshot);
		const lines = text.split(/\r?\n/);
		virtualCode.webgalLines = lines;
		virtualCode.webgalLineCommandTypes = lines.map(getLineCommandType);
		virtualCode.webgalDefinitionMap = analyzeWebgalText(text);
		virtualCode.webgalDocumentLinkCandidates =
			analyzeWebgalDocumentLinks(lines);
		virtualCode.webgalFoldingRanges = analyzeWebgalFoldingRanges(text);
	} else {
		virtualCode.webgalDefinitionMap = emptyDefinitionMap;
		virtualCode.webgalDocumentLinkCandidates = [];
		virtualCode.webgalFoldingRanges = [];
		virtualCode.webgalLines = [];
		virtualCode.webgalLineCommandTypes = [];
	}
	return virtualCode;
};
