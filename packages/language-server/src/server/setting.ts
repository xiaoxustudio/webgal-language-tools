import type { LspFeatureOptions, ServerSettings } from "../types";
import type { Connection } from "@volar/language-server";
import type {
	InitializeParams,
	InitializeResult
} from "@volar/language-server";
import { TextDocumentSyncKind } from "@volar/language-server";

export const defaultSettings: ServerSettings = {
	maxNumberOfProblems: 1000,
	isShowWarning: true,
	isShowHint: "变量名后",
	isShowImagePreview: true
};

export const defaultFeatureOptions: LspFeatureOptions = {
	completion: true,
	hover: true,
	documentLink: true,
	resourceCompletion: true,
	diagnostics: true,
	foldingRange: true,
	definition: true,
	formatting: true,
	inlayHint: true
};

const CACHE_TTL_MS = 5000;

/**
 * Manages settings for a language server instance.
 */
export class LanguageServerSettings {
	private globalSettings: ServerSettings;
	private cachedConfig: Promise<ServerSettings> | null;
	private cachedAt: number;
	private clientSettingsVersion: number;
	private StateConfig: {
		hasConfigurationCapability: boolean;
		hasWorkspaceFolderCapability: boolean;
		hasDiagnosticRelatedInformationCapability: boolean;
		featureOptions: LspFeatureOptions;
	};

	constructor() {
		this.globalSettings = { ...defaultSettings };
		this.cachedConfig = null;
		this.cachedAt = 0;
		this.clientSettingsVersion = 0;
		this.StateConfig = {
			hasConfigurationCapability: false,
			hasWorkspaceFolderCapability: false,
			hasDiagnosticRelatedInformationCapability: false,
			featureOptions: { ...defaultFeatureOptions }
		};
	}

	// Global settings
	setGlobalSettings(settings: ServerSettings) {
		// 与默认值合并，确保缺失属性不会丢失
		this.globalSettings = { ...defaultSettings, ...settings };
		this.clientSettingsVersion++;
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

	// 将配置与默认值合并，确保所有属性都有正确的值。
	// 过滤掉 settings 中的 undefined 值，防止覆盖默认值。
	private mergeWithDefaults(settings: ServerSettings): ServerSettings {
		const result = { ...defaultSettings };
		for (const key of Object.keys(settings) as (keyof ServerSettings)[]) {
			const val = settings[key];
			if (val !== undefined) {
				(result as Record<string, unknown>)[key] = val;
			}
		}
		return result;
	}

	// Document settings
	async getDocumentSettings(connection: Connection, _url?: string): Promise<ServerSettings> {
		// globalSettings 已经被 didChangeConfiguration / onInitialized 更新，直接返回
		if (this.StateConfig.hasConfigurationCapability && this.clientSettingsVersion > 0) {
			return this.mergeWithDefaults(this.globalSettings);
		}
		if (!this.StateConfig.hasConfigurationCapability) {
			return this.mergeWithDefaults(this.globalSettings);
		}
		// 首次调用：从客户端拉取初始配置
		const now = Date.now();
		if (!this.cachedConfig || now - this.cachedAt > CACHE_TTL_MS) {
			this.cachedConfig = connection.workspace
				.getConfiguration("WebGalLanguageServer")
				.then((config) => {
					if (!config) {
						return this.defaultSettings();
					}
					const merged = this.mergeWithDefaults(config as ServerSettings);
					this.globalSettings = merged;
					this.clientSettingsVersion++;
					return merged;
				})
				.catch((err) => {
					connection.console.warn(
						`[WebGalLanguageServer] getConfiguration failed: ${err}`
					);
					return this.mergeWithDefaults(this.globalSettings);
				});
			this.cachedAt = now;
		}
		return this.cachedConfig;
	}

	private defaultSettings(): ServerSettings {
		return { ...defaultSettings };
	}

	// Clear cached config so next call fetches fresh
	clearDocumentSettings(): void {
		this.cachedConfig = null;
		this.cachedAt = 0;
	}

	// No-op: global config doesn't need per-URL cleanup
	removeDocumentSettings(_url: string): void {
		//保留接口兼容性
	}
}
