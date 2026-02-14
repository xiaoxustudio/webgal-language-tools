import { FoldingRange } from "@volar/language-server";
import { TextDocument } from "vscode-languageserver-textdocument";

export function provideFoldingRanges(
	_doc: TextDocument,
	ranges: FoldingRange[]
): FoldingRange[] {
	return ranges;
}
