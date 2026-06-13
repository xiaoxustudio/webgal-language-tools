import type { Connection, Diagnostic } from "@volar/language-server";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { validateTextDocument } from "@/diagnostics";
import type { LanguageServerSettings } from "@/server/setting";
import { defaultSettings } from "@/server/setting";

export default function (settings: LanguageServerSettings) {
	return async function provideDiagnostics(
		document: TextDocument,
		connection: Connection,
		text: string
	): Promise<Diagnostic[]> {
		const config =
			(await settings.getDocumentSettings(connection, document.uri)) ??
			defaultSettings;
		if (!config.isShowWarning) {
			return [];
		}
		return validateTextDocument(
			document,
			text,
			config.maxNumberOfProblems,
			settings.hasDiagnosticRelatedInformationCapability
		);
	};
}
