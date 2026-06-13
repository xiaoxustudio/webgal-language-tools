import type { Diagnostic } from "@volar/language-server";
import type { TextDocument } from "vscode-languageserver-textdocument";

export interface RuleContext {
	document: TextDocument;
	text: string;
	lines: string[];
	lineOffsets: number[];
	uri: string;
	hasRelatedInfo: boolean;
	maxProblems: number;
}

export interface DiagnosticRule {
	id: string;
	label: string;
	validate(ctx: RuleContext): Diagnostic[];
}
