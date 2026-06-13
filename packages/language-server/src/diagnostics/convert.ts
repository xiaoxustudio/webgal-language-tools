import type { Diagnostic } from "@volar/language-server";
import { DiagnosticSeverity } from "@volar/language-server";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type { DiagnosticItem } from "@webgal/language-core";
import { source } from "@webgal/language-core";

function makeDiagnostic(
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

export function toLspDiagnostics(
	items: DiagnosticItem[],
	document: TextDocument,
	hasRelatedInfo: boolean
): Diagnostic[] {
	return items.map((item) =>
		makeDiagnostic(
			document,
			item.offset,
			item.length,
			item.message,
			item.category,
			hasRelatedInfo
		)
	);
}
