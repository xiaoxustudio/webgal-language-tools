import type {
	Connection,
	CompletionList,
	DefinitionLink,
	Diagnostic,
	DocumentLink,
	FoldingRange,
	Hover,
	Position,
	LanguageServicePlugin
} from "@volar/language-server";
import type { ConnectionDocumentsType } from "@/types";
import type { TextDocument } from "vscode-languageserver-textdocument";
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
import onDocumentFormattingConnection from "./onDocumentFormattingConnection";
import { provideCompletionItems } from "./onCompletion";
import { provideDefinition } from "./onDefinition";
import { provideDocumentLinks } from "./onDocumentLinks";
import { provideFoldingRanges } from "./onFoldingRanges";
import { provideHover } from "./onHover";
import { provideDiagnostics } from "./onDiagnostics";
import { StateConfig } from "@/server/setting";

export function registerConnectionHandlers(
	documents: ConnectionDocumentsType,
	connection: Connection
) {
	onInitialized(documents, connection);
	onDid(documents, connection);
	onDocumentFormattingConnection(documents, connection);
}

export function createWebgalService(
	connection: Connection
): LanguageServicePlugin {
	const featureOptions = StateConfig.featureOptions;
	const services: LanguageServicePlugin = {
		name: "webgal-service",
		capabilities: {
			...(featureOptions.completion
				? {
						completionProvider: {
							triggerCharacters: [".", ":", "-", "/"]
						}
					}
				: {}),
			...(featureOptions.hover ? { hoverProvider: true } : {}),
			...(featureOptions.diagnostics
				? {
						diagnosticProvider: {
							interFileDependencies: false,
							workspaceDiagnostics: false
						}
					}
				: {}),
			...(featureOptions.documentLink
				? {
						documentLinkProvider: {
							resolveProvider: true
						}
					}
				: {}),
			...(featureOptions.foldingRange
				? { foldingRangeProvider: true }
				: {}),
			...(featureOptions.definition ? { definitionProvider: true } : {}),
		},
		create(context) {
			connection.sendRequest("client/showTip", "Create webgal-service");
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
				...(featureOptions.completion
					? {
							async provideCompletionItems(
								document: TextDocument,
								position: Position
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
										getSourceUriString(document),
										featureOptions.resourceCompletion
									)
								};
							}
						}
					: {}),
				...(featureOptions.hover
					? {
							async provideHover(
								document: TextDocument,
								position: Position
							): Promise<Hover> {
								return provideHover(
									document,
									position,
									connection,
									getDefinitionMap(document),
									getLineCommandTypes(document),
									getSourceUriString(document)
								);
							}
						}
					: {}),
				...(featureOptions.definition
					? {
							provideDefinition(
								document: TextDocument,
								position: Position
							): DefinitionLink[] {
								return provideDefinition(
									document,
									position,
									getDefinitionMap(document)
								);
							}
						}
					: {}),
				...(featureOptions.documentLink
					? {
							async provideDocumentLinks(
								document: TextDocument
							): Promise<DocumentLink[]> {
								return provideDocumentLinks(
									document,
									connection,
									getDocumentLinkCandidates(document)
								);
							}
						}
					: {}),
				...(featureOptions.foldingRange
					? {
							provideFoldingRanges(
								document: TextDocument
							): FoldingRange[] {
								return provideFoldingRanges(
									document,
									getFoldingRanges(document)
								);
							}
						}
					: {}),
				...(featureOptions.diagnostics
					? {
							async provideDiagnostics(
								document: TextDocument
							): Promise<Diagnostic[]> {
								return provideDiagnostics(
									document,
									connection,
									getVirtualCodeText(document)
								);
							}
						}
					: {}),
			};
		}
	};
	return services;
}
