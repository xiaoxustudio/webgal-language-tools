import { StateConfig } from "@/utils";
import {
	InitializeParams,
	InitializeResult,
	TextDocumentSyncKind
} from "@volar/language-server";

export function applyClientCapabilities(params: InitializeParams) {
	// 统一记录客户端能力，供其他模块判断是否启用相关功能
	const capabilities = params.capabilities;

	// 记录客户端是否支持配置文件
	StateConfig.hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);

	// 记录客户端是否支持多工作区
	StateConfig.hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);

	// 记录客户端是否支持诊断信息中的相关文件信息
	StateConfig.hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);
}

export function applyServerCapabilities(result: InitializeResult) {
	// 保持原有能力声明，同时让 volar.js 负责服务分发
	result.capabilities.textDocumentSync = TextDocumentSyncKind.Incremental;
	result.capabilities.completionProvider = {
		triggerCharacters: [".", ":", "-", "/"]
	};
	result.capabilities.hoverProvider = true;
	result.capabilities.diagnosticProvider = {
		identifier: "webgal-diagnostics",
		interFileDependencies: false,
		workspaceDiagnostics: false
	};
	result.capabilities.documentLinkProvider = {
		resolveProvider: true
	};
	result.capabilities.foldingRangeProvider = true;
	result.capabilities.definitionProvider = true;

	if (StateConfig.hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
}
