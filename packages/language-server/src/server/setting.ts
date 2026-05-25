import { source } from "@webgal/language-core";
import { warningConfig, getDiagnosticInformation } from "@/warnings";
import type { LspFeatureOptions, ServerSettings } from "../types";
import type { Connection, Diagnostic } from "@volar/language-server";
import { DiagnosticSeverity } from "@volar/language-server";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type {
	InitializeParams,
	InitializeResult
} from "@volar/language-server";
import { TextDocumentSyncKind } from "@volar/language-server";

export const defaultSettings = {
	maxNumberOfProblems: 1000,
	isShowWarning: true,
	isShowHint: "变量名后"
} satisfies ServerSettings;

export const defaultFeatureOptions: LspFeatureOptions = {
	completion: true,
	hover: true,
	documentLink: true,
	resourceCompletion: true,
	diagnostics: true,
	foldingRange: true,
	definition: true,
	formatting: true
};

/**
 * Manages settings for a language server instance.
 */
export class LanguageServerSettings {
	private globalSettings: ServerSettings;
	private documentSettings: Map<string, Thenable<ServerSettings>>;
	private StateConfig: {
		hasConfigurationCapability: boolean;
		hasWorkspaceFolderCapability: boolean;
		hasDiagnosticRelatedInformationCapability: boolean;
		featureOptions: LspFeatureOptions;
	};

	constructor() {
		this.globalSettings = { ...defaultSettings };
		this.documentSettings = new Map();
		this.StateConfig = {
			hasConfigurationCapability: false,
			hasWorkspaceFolderCapability: false,
			hasDiagnosticRelatedInformationCapability: false,
			featureOptions: { ...defaultFeatureOptions }
		};
	}

	// Global settings
	setGlobalSettings(settings: ServerSettings) {
		this.globalSettings = settings;
	}

	getGlobalSettings(): ServerSettings {
		return this.globalSettings;
	}

	// Feature options
	setFeatureOptions(options: Partial<LspFeatureOptions>) {
		this.StateConfig.featureOptions = {
			...this.StateConfig.featureOptions,
			...options
		};
	}

	getFeatureOptions(): LspFeatureOptions {
		return this.StateConfig.featureOptions;
	}

	// Capability flags (read-only, set via constructor only)
	get hasConfigurationCapability(): boolean {
		return this.StateConfig.hasConfigurationCapability;
	}

	get hasWorkspaceFolderCapability(): boolean {
		return this.StateConfig.hasWorkspaceFolderCapability;
	}

	get hasDiagnosticRelatedInformationCapability(): boolean {
		return this.StateConfig.hasDiagnosticRelatedInformationCapability;
	}

	// Apply client capabilities to update StateConfig
	applyClientCapabilities(params: InitializeParams) {
		// 统一记录客户端能力，供其他模块判断是否启用相关功能
		const capabilities = params.capabilities;

		// 记录客户端是否支持配置文件
		this.StateConfig.hasConfigurationCapability = !!(
			capabilities.workspace && !!capabilities.workspace.configuration
		);

		// 记录客户端是否支持多工作区
		this.StateConfig.hasWorkspaceFolderCapability = !!(
			capabilities.workspace && !!capabilities.workspace.workspaceFolders
		);

		// 记录客户端是否支持诊断信息中的相关文件信息
		this.StateConfig.hasDiagnosticRelatedInformationCapability = !!(
			capabilities.textDocument &&
			capabilities.textDocument.publishDiagnostics &&
			capabilities.textDocument.publishDiagnostics.relatedInformation
		);
	}

	// Apply server capabilities to the initialize result
	applyServerCapabilities(result: InitializeResult) {
		// 保持原有能力声明，同时让 volar.js 负责服务分发
		result.capabilities.textDocumentSync = TextDocumentSyncKind.Incremental;
		const featureOptions = this.StateConfig.featureOptions;
		if (featureOptions.completion) {
			result.capabilities.completionProvider = {
				triggerCharacters: [".", ":", "-", "/"]
			};
		}
		if (featureOptions.hover) {
			result.capabilities.hoverProvider = true;
		}
		if (featureOptions.diagnostics) {
			result.capabilities.diagnosticProvider = {
				interFileDependencies: false,
				workspaceDiagnostics: false
			};
		}
		if (featureOptions.documentLink) {
			result.capabilities.documentLinkProvider = {
				resolveProvider: true
			};
		}
		if (featureOptions.foldingRange) {
			result.capabilities.foldingRangeProvider = true;
		}
		if (featureOptions.definition) {
			result.capabilities.definitionProvider = true;
		}
		if (featureOptions.formatting) {
			result.capabilities.documentFormattingProvider = true;
		}

		if (this.StateConfig.hasWorkspaceFolderCapability) {
			result.capabilities.workspace = {
				workspaceFolders: {
					supported: true
				}
			};
		}
	}

	// Document settings
	async getDocumentSettings(
		connection: Connection,
		url: string
	): Promise<ServerSettings> {
		if (!this.StateConfig.hasConfigurationCapability) {
			return Promise.resolve(this.globalSettings);
		}
		let result = this.documentSettings.get(url);
		if (!result) {
			result = connection.workspace.getConfiguration({
				scopeUri: url,
				section: "WEBGAL Language Server"
			});
			this.documentSettings.set(url, result);
		}
		return result;
	}

	// Clear all document settings
	clearDocumentSettings(): void {
		this.documentSettings.clear();
	}

	// Remove a specific document's settings
	removeDocumentSettings(url: string): void {
		this.documentSettings.delete(url);
	}

	// Validate text document
	async validateTextDocument(
		connection: Connection,
		textDocument: TextDocument,
		textOverride?: string
	): Promise<Diagnostic[]> {
		const settings = await this.getDocumentSettings(
			connection,
			textDocument.uri
		);
		if (!settings?.isShowWarning) {
			return [];
		}
		const text = textOverride ?? textDocument.getText();
		let m: RegExpExecArray | null;
		let problems = 0;
		const diagnostics: Diagnostic[] = [];
		const _sp = text.split(/\n|\t\n|\r\n/);
		for (const i in warningConfig) {
			const _token = warningConfig[i];
			const _pattern = _token.pattern as RegExp;
			if (_token.is_line) {
				continue;
			}
			if (_token.customCheck) {
				const _custom_res = _token.customCheck(
					textDocument,
					text,
					0,
					_sp
				);
				if (typeof _custom_res === "object" && _custom_res !== null) {
					diagnostics.push(_custom_res);
				}
				continue;
			}
			while (
				(m = _pattern.exec(text)) &&
				problems < settings.maxNumberOfProblems
			) {
				// enable
				if (_token?.enable === false) {
					continue;
				}
				// 通过
				problems++;
				const range = {
					start: textDocument.positionAt(m.index),
					end: textDocument.positionAt(m.index + m[0].length)
				};
				const diagnostic: Diagnostic = {
					severity: DiagnosticSeverity.Warning,
					range,
					message: `(${i})${m[0].trim()}`,
					source
				};
				if (
					this.StateConfig.hasDiagnosticRelatedInformationCapability
				) {
					diagnostic.relatedInformation = [
						{
							location: {
								uri: textDocument.uri,
								range: Object.assign({}, diagnostic.range)
							},
							message: getDiagnosticInformation(i)
						}
					];
				}
				diagnostics.push(diagnostic);
			}
		}
		for (let _line_index = 0; _line_index < _sp.length; _line_index++) {
			const _line_text = _sp[_line_index];
			for (const i in warningConfig) {
				const _token = warningConfig[i];
				const _pattern = _token.pattern as RegExp;
				if (!_token.is_line) {
					continue;
				}
				const _newarr = _sp.slice(0, _line_index).join();
				if (_token.customCheck) {
					const _custom_res = _token.customCheck(
						textDocument,
						_line_text,
						_newarr.length,
						_sp.slice(0, _line_index)
					);
					if (
						typeof _custom_res === "object" &&
						_custom_res !== null
					) {
						diagnostics.push(_custom_res);
					}
					continue;
				}
				while (
					(m = _pattern.exec(_line_text)) &&
					problems < settings.maxNumberOfProblems
				) {
					// enable
					if (_token?.enable === false) {
						continue;
					}
					// 通过
					problems++;
					const range = {
						start: textDocument.positionAt(_newarr.length + 1),
						end: textDocument.positionAt(
							_newarr.length + m.input.length
						)
					};
					const diagnostic: Diagnostic = {
						severity: DiagnosticSeverity.Warning,
						range,
						message: `(${i})${m.input.trim()}`,
						source: "WebGal Script"
					};
					if (
						this.StateConfig
							.hasDiagnosticRelatedInformationCapability
					) {
						diagnostic.relatedInformation = [
							{
								location: {
									uri: textDocument.uri,
									range: Object.assign({}, diagnostic.range)
								},
								message: getDiagnosticInformation(i)
							}
						];
					}
					diagnostics.push(diagnostic);
				}
			}
		}
		return diagnostics;
	}
}
