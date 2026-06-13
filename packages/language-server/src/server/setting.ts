import type { LspFeatureOptions, ServerSettings } from "../types";
import type { Connection } from "@volar/language-server";
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
				section: "WebGalLanguageServer"
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
}
