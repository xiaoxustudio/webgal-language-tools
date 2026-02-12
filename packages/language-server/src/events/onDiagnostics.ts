import { Connection, Diagnostic } from "@volar/language-server";
import { validateTextDocument } from "@/utils";
import { TextDocument } from "vscode-languageserver-textdocument";

export async function provideDiagnostics(
	document: TextDocument,
	connection: Connection
): Promise<Diagnostic[]> {
	// 使用 volar.js 的服务式诊断入口
	return validateTextDocument(connection, document);
}
