import { validateTextDocument } from "@/server/setting";
import type { Connection, Diagnostic } from "@volar/language-server";
import type { TextDocument } from "vscode-languageserver-textdocument";

export async function provideDiagnostics(
	document: TextDocument,
	connection: Connection,
	text: string
): Promise<Diagnostic[]> {
	return validateTextDocument(connection, document, text);
}
