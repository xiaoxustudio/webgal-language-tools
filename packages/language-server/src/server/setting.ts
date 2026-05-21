import { source } from "@webgal/language-core";
import { warningConfig, getDiagnosticInformation } from "@/warnings";
import type { LspFeatureOptions, ServerSettings } from "../types";
import type { Connection, Diagnostic } from "@volar/language-server";
import { DiagnosticSeverity } from "@volar/language-server";
import type { TextDocument } from "vscode-languageserver-textdocument";

export const defaultSettings = {
	maxNumberOfProblems: 1000,
	isShowWarning: true,
	isShowHint: "变量名后"
} satisfies ServerSettings;

export const documentSettings: Map<
	string,
	Thenable<ServerSettings>
> = new Map();

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

export const StateConfig = {
	hasConfigurationCapability: false, // 是否支持配置能力
	hasWorkspaceFolderCapability: false, // 是否支持工作区文件夹能力
	hasDiagnosticRelatedInformationCapability: false, // 是否支持诊断相关信息的能力
	featureOptions: defaultFeatureOptions
};

export let globalSettings: ServerSettings = defaultSettings;
export function setGlobalSettings(settings: ServerSettings) {
	globalSettings = settings;
}

export function setFeatureOptions(options?: Partial<LspFeatureOptions>) {
	StateConfig.featureOptions = {
		...defaultFeatureOptions,
		...options
	};
}

// 获取文档设置
export function getDocumentSettings(
	connection: Connection,
	url: string
): Thenable<ServerSettings> {
	if (!StateConfig.hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(url);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: url,
			section: "WEBGAL Language Server"
		});
		documentSettings.set(url, result);
	}
	return result;
}

// 校验内容
export async function validateTextDocument(
	connection: Connection,
	textDocument: TextDocument,
	textOverride?: string
): Promise<Diagnostic[]> {
	const settings = await getDocumentSettings(connection, textDocument.uri);
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
			const _custom_res = _token.customCheck(textDocument, text, 0, _sp);
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
				// message: message(i, m[0].trim()),
				message: `(${i})${m[0].trim()}`,
				source
			};
			if (StateConfig.hasDiagnosticRelatedInformationCapability) {
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
				if (typeof _custom_res === "object" && _custom_res !== null) {
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
					// message: message(i, m.input.trim()),\
					message: `(${i})${m.input.trim()}`,
					source: "WebGal Script"
				};
				if (StateConfig.hasDiagnosticRelatedInformationCapability) {
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
