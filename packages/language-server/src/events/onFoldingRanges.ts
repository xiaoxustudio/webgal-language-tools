import { FoldingRange, FoldingRangeKind } from "@volar/language-server";
import { TextDocument } from "vscode-languageserver-textdocument";

export function provideFoldingRanges(doc: TextDocument): FoldingRange[] {
	// 使用 volar.js 的服务式折叠入口
	const docText = doc.getText();
	const foldingRanges: FoldingRange[] = [];

	const regex = /label:([\s\S]*?)(?=(?:\r?\n|^)end|(?:\r?\n|^)label:|$)/g;

	let match: RegExpExecArray | null;
	while ((match = regex.exec(docText))) {
		if (match !== null) {
			const startLine = doc.positionAt(match.index).line;
			const endPos = doc.positionAt(match.index + match[0].length);
			let endLine = endPos.line;

			if (endPos.character === 0) {
				endLine = endPos.line - 1;
			}

			if (endLine > startLine) {
				foldingRanges.push({
					startLine: startLine,
					endLine: endLine,
					collapsedText:
						match[1].split("\n")[0].replace(/;/g, "").trim() || "...",
					kind: FoldingRangeKind.Region
				});
			}
		}
	}

	return foldingRanges;
}
