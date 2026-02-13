import { FoldingRange } from "@volar/language-server";
import { TextDocument } from "vscode-languageserver-textdocument";

export function provideFoldingRanges(
	_doc: TextDocument,
	ranges: FoldingRange[]
): FoldingRange[] {
	// 使用 volar.js 的服务式折叠入口
	return ranges;
}
