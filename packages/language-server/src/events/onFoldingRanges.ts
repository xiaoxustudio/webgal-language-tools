import type { FoldingRange } from "@volar/language-server";
import type { TextDocument } from "vscode-languageserver-textdocument";

export function provideFoldingRanges(
	_doc: TextDocument,
	ranges: FoldingRange[]
): FoldingRange[] {
	return ranges;
}
