import type {
	Connection,
	CompletionList,
	DefinitionLink,
	Diagnostic,
	DocumentLink,
	FoldingRange,
	Hover,
	InlayHint,
	Position,
	Range,
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
import onCompletion from "./onCompletion";
import onDefinition from "./onDefinition";
import onDocumentLinks from "./onDocumentLinks";
import onFoldingRanges from "./onFoldingRanges";
import onHover from "./onHover";
import onInlayHint from "./onInlayHint";
import onDiagnostics from "./onDiagnostics";
import type { LanguageServerSettings } from "../server/setting";

export function registerConnectionHandlers(
	documents: ConnectionDocumentsType,
	connection: Connection,
	settings: LanguageServerSettings
) {
	const onDidHandler = onDid(settings);
	const onInitializedHandler = onInitialized(settings);

	onInitializedHandler(documents, connection);
	onDidHandler(documents, connection);
	onDocumentFormattingConnection(documents, connection);
}

export function createWebgalService(
	connection: Connection,
	settings: LanguageServerSettings
): LanguageServicePlugin {
	const featureOptions = settings.getFeatureOptions();
	const onCompletionHandler = onCompletion();
	const onHoverHandler = onHover(settings);
	const onDefinitionHandler = onDefinition();
	const onDocumentLinksHandler = onDocumentLinks();
	const onFoldingRangesHandler = onFoldingRanges();
	const onDiagnosticsHandler = onDiagnostics(settings);
	const onInlayHintHandler = onInlayHint(settings);
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
			...(featureOptions.inlayHint ? { inlayHintProvider: {} } : {})
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
				...(featureOptions.completion
					? {
							async provideCompletionItems(
								document: TextDocument,
								position: Position
							): Promise<CompletionList> {
								return {
									isIncomplete: false,
									items: await onCompletionHandler(
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
									return onHoverHandler(
										document,
										position,
										connection,
										getDefinitionMap(document),
										getLineCommandTypes(document),
										getSourceUriString(document),
										getDocumentLinkCandidates(document)
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
								return onDefinitionHandler(
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
								return onDocumentLinksHandler(
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
								return onFoldingRangesHandler(
									document,
									getFoldingRanges(document)
								);
							}
						}
					: {}),
				...(featureOptions.inlayHint
					? {
							async provideInlayHints(
								document: TextDocument,
								range: Range
							): Promise<InlayHint[]> {
								return onInlayHintHandler(
									document,
									range,
									connection,
									getDefinitionMap(document),
									getVirtualCodeLines(document)
								);
							}
						}
					: {}),
				...(featureOptions.diagnostics
					? {
							async provideDiagnostics(
								document: TextDocument
							): Promise<Diagnostic[]> {
								return onDiagnosticsHandler(
									document,
									connection,
									getVirtualCodeText(document)
								);
							}
						}
					: {})
			};
		}
	};
	return services;
}
