import { ConnectionHandler } from "@/types";
import { StateConfig } from "@/utils";
import {
	InitializeParams,
	InitializeResult,
	TextDocumentSyncKind
} from "@volar/language-server";

export default <ConnectionHandler>function (_, connection) {
	connection.onInitialize((params: InitializeParams) => {
		const capabilities = params.capabilities;

		StateConfig.hasConfigurationCapability = !!(
			capabilities.workspace && !!capabilities.workspace.configuration
		);
		StateConfig.hasWorkspaceFolderCapability = !!(
			capabilities.workspace && !!capabilities.workspace.workspaceFolders
		);
		StateConfig.hasDiagnosticRelatedInformationCapability = !!(
			capabilities.textDocument &&
			capabilities.textDocument.publishDiagnostics &&
			capabilities.textDocument.publishDiagnostics.relatedInformation
		);
		const result: InitializeResult = {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Incremental,
				completionProvider: {
					triggerCharacters: [".", ":", "-", "/"]
				},
				hoverProvider: true,
				diagnosticProvider: {
					identifier: "webgal-diagnostics",
					interFileDependencies: false,
					workspaceDiagnostics: false
				},
				documentLinkProvider: {
					resolveProvider: true
				},
				foldingRangeProvider: true,
				definitionProvider: true
			}
		};
		if (StateConfig.hasWorkspaceFolderCapability) {
			result.capabilities.workspace = {
				workspaceFolders: {
					supported: true
				}
			};
		}
		return result;
	});
};
