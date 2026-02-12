import {
	CancellationToken,
	Connection,
	CompletionContext,
	CompletionList,
	DefinitionLink,
	Diagnostic,
	DocumentLink,
	FoldingRange,
	Hover,
	Position,
	LanguageServicePlugin
} from "@volar/language-server";
import { ConnectionDocumentsType } from "@/types";
import { TextDocument } from "vscode-languageserver-textdocument";

import onDid from "./onDid";
import onInitialized from "./onInitialized";
import { provideCompletionItems } from "./onCompletion";
import { provideDefinition } from "./onDefinition";
import { provideDocumentLinks } from "./onDocumentLinks";
import { provideFoldingRanges } from "./onFoldingRanges";
import { provideHover } from "./onHover";
import { provideDiagnostics } from "./onDiagnostics";

export function registerConnectionHandlers(
	documents: ConnectionDocumentsType,
	connection: Connection
) {
	onInitialized(documents, connection);
	onDid(documents, connection);
}

export function createWebgalService(
	connection: Connection
): LanguageServicePlugin {
	return {
		name: "webgal-service",
		capabilities: {
			completionProvider: {
				triggerCharacters: [".", ":", "-", "/"]
			},
			hoverProvider: true,
			diagnosticProvider: {
				interFileDependencies: false,
				workspaceDiagnostics: false
			},
			documentLinkProvider: {
				resolveProvider: true
			},
			foldingRangeProvider: true,
			definitionProvider: true
		},
		create() {
			return {
				async provideCompletionItems(
					document: TextDocument,
					position: Position,
					_context: CompletionContext,
					_token: CancellationToken
				): Promise<CompletionList> {
					return {
						isIncomplete: false,
						items: await provideCompletionItems(
							document,
							position,
							connection
						)
					};
				},
				async provideHover(
					document: TextDocument,
					position: Position,
					_token: CancellationToken
				): Promise<Hover> {
					return provideHover(document, position, connection);
				},
				provideDefinition(
					document: TextDocument,
					position: Position,
					_token: CancellationToken
				): DefinitionLink[] {
					return provideDefinition(document, position);
				},
				async provideDocumentLinks(
					document: TextDocument,
					_token: CancellationToken
				): Promise<DocumentLink[]> {
					return provideDocumentLinks(document, connection);
				},
				provideFoldingRanges(
					document: TextDocument,
					_token: CancellationToken
				): FoldingRange[] {
					return provideFoldingRanges(document);
				},
				async provideDiagnostics(
					document: TextDocument,
					_token: CancellationToken
				): Promise<Diagnostic[]> {
					return provideDiagnostics(document, connection);
				}
			};
		}
	};
}
