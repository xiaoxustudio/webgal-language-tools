import type { ConnectionHandler } from "@/types";
import { formatFullDocument } from "./onDocumentFormatting";
import { URI } from "vscode-uri";

export default <ConnectionHandler>function (documents, connection) {
	connection.onDocumentFormatting(async (params) => {
		const uri = URI.parse(params.textDocument.uri);
		const document = documents.get(uri);
		if (!document) {
			return null;
		}
		const edits = await formatFullDocument(document.getText(), uri);
		if (!edits.length) {
			return [];
		}
		return edits[0]?.newText === document.getText() ? [] : edits;
	});
};
