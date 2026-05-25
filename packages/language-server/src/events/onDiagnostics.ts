import type { Connection, Diagnostic } from "@volar/language-server";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type { LanguageServerSettings } from "@/server/setting";

export default function (settings: LanguageServerSettings) {
	return async function provideDiagnostics(
		document: TextDocument,
		connection: Connection,
		text: string
	): Promise<Diagnostic[]> {
		return settings.validateTextDocument(connection, document, text);
	};
}
