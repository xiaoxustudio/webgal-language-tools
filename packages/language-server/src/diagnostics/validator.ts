import type { Diagnostic } from "@volar/language-server";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type { RuleContext } from "./types";
import { rules } from "./rules";

export function validateTextDocument(
	document: TextDocument,
	text: string,
	maxProblems: number,
	hasRelatedInfo: boolean
): Diagnostic[] {
	const lines = text.split(/\r\n|\n/);
	const lineOffsets: number[] = [0];
	for (let i = 0; i < text.length; i++) {
		if (text[i] === "\n") {
			lineOffsets.push(i + 1);
		}
	}
	const ctx: RuleContext = {
		document,
		text,
		lines,
		lineOffsets,
		uri: document.uri,
		hasRelatedInfo,
		maxProblems
	};
	const diagnostics: Diagnostic[] = [];
	for (const rule of rules) {
		if (diagnostics.length >= maxProblems) {break;}
		diagnostics.push(...rule.validate(ctx));
	}
	return diagnostics;
}
