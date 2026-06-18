import type { WebgalDocumentLinkCandidate, WebgalVirtualCode } from "@/types";
import {
	analyzeWebgalText
} from "@webgal/language-core";
import {
	buildLineStarts,
	emptyDefinitionMap,
	fullCodeInformation,
	getLineCommandType,
	getLineFromOffset,
	getSnapshotText
} from "@/utils";
import { languageId } from "@/utils/resources";
import type { IScriptSnapshot } from "@volar/language-core";
import { FoldingRangeKind, type FoldingRange } from "vscode-languageserver";
import type { URI } from "vscode-uri";

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
