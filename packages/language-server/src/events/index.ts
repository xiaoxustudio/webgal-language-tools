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
import {
	getWebgalDefinitionMap,
	getWebgalDocumentLinkCandidates,
	getWebgalFoldingRanges,
	getWebgalLineCommandTypes,
	getWebgalSourceUriString,
	getWebgalVirtualCodeText
} from "@/utils";
import { getWebgalVirtualCodeLines } from "@/utils";

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
		create(context) {
			const getDefinitionMap = (document: TextDocument) =>
				getWebgalDefinitionMap(context, document);
			const getVirtualCodeText = (document: TextDocument) =>
				getWebgalVirtualCodeText(context, document);
			const getVirtualCodeLines = (document: TextDocument) =>
				getWebgalVirtualCodeLines(context, document);
			const getLineCommandTypes = (document: TextDocument) =>
				getWebgalLineCommandTypes(context, document);
			const getSourceUriString = (document: TextDocument) =>
				getWebgalSourceUriString(context, document);
			const getDocumentLinkCandidates = (document: TextDocument) =>
				getWebgalDocumentLinkCandidates(context, document);
			const getFoldingRanges = (document: TextDocument) =>
				getWebgalFoldingRanges(context, document);
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
							connection,
							getDefinitionMap(document),
							getVirtualCodeLines(document),
							getLineCommandTypes(document),
							getSourceUriString(document)
						)
					};
				},
				async provideHover(
					document: TextDocument,
					position: Position,
					_token: CancellationToken
				): Promise<Hover> {
					return provideHover(
						document,
						position,
						connection,
						getDefinitionMap(document),
						getLineCommandTypes(document),
						getSourceUriString(document)
					);
				},
				provideDefinition(
					document: TextDocument,
					position: Position,
					_token: CancellationToken
				): DefinitionLink[] {
					return provideDefinition(
						document,
						position,
						getDefinitionMap(document)
					);
				},
				async provideDocumentLinks(
					document: TextDocument,
					_token: CancellationToken
				): Promise<DocumentLink[]> {
					return provideDocumentLinks(
						document,
						connection,
						getDocumentLinkCandidates(document)
					);
				},
				provideFoldingRanges(
					document: TextDocument,
					_token: CancellationToken
				): FoldingRange[] {
					return provideFoldingRanges(
						document,
						getFoldingRanges(document)
					);
				},
				async provideDiagnostics(
					document: TextDocument,
					_token: CancellationToken
				): Promise<Diagnostic[]> {
					return provideDiagnostics(
						document,
						connection,
						getVirtualCodeText(document)
					);
				}
			};
		}
	};
}
