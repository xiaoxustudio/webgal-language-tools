import type { Diagnostic } from "@volar/language-server";
import { DiagnosticSeverity } from "@volar/language-server";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { source } from "@webgal/language-core";

export function removeLeadingWhitespace(text: string): string {
	return text.replace(/^[\n\r\t]+/, "");
}

export function makeDiagnostic(
	document: TextDocument,
	offset: number,
	length: number,
	message: string,
	category: string,
	hasRelatedInfo: boolean
): Diagnostic {
	const diagnostic: Diagnostic = {
		severity: DiagnosticSeverity.Warning,
		range: {
			start: document.positionAt(offset),
			end: document.positionAt(offset + length)
		},
		message: category,
		source: `${source} Lint`
	};
	if (hasRelatedInfo) {
		diagnostic.relatedInformation = [
			{
				location: {
					uri: document.uri,
					range: { ...diagnostic.range }
				},
				message
			}
		];
	}
	return diagnostic;
}
