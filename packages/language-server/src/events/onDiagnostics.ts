import { Connection, Diagnostic } from "@volar/language-server";
import { validateTextDocument } from "@/utils";
import { TextDocument } from "vscode-languageserver-textdocument";

export async function provideDiagnostics(
	document: TextDocument,
	connection: Connection,
	text: string
): Promise<Diagnostic[]> {
	return validateTextDocument(connection, document, text);
}
