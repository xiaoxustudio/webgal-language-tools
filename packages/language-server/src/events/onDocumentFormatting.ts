import type { TextEdit } from "@volar/language-server";
import type { URI } from "vscode-uri";
import { formatDocumentText } from "@/server/formatter";

export function formatFullDocument(
	documentText: string,
	documentUri: URI
): TextEdit[] {
	const formatted = formatDocumentText(documentText, documentUri);
	const documentLines = documentText.split(/\r?\n/);
	const endLine = documentLines.length - 1;
	const endCharacter = documentLines[documentLines.length - 1]?.length ?? 0;
	return [
		{
			range: {
				start: { line: 0, character: 0 },
				end: { line: endLine, character: endCharacter }
			},
			newText: formatted
		}
	];
}

export { formatDocumentText };
