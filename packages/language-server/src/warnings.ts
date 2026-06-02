import type { TextDocument } from "vscode-languageserver-textdocument";
import { source } from "@webgal/language-core";
import type { Diagnostic } from "@volar/language-server";
import { DiagnosticSeverity } from "@volar/language-server";

type WarningMessage = (...args: string[]) => string;
type WarningCustomCheck = (
	this: WarningToken,
	textDocument: TextDocument,
	_text: string,
	_newarr: string[]
) => Diagnostic | null;

interface WarningToken {
	message: WarningMessage;
	DiagnosticInformation: string; // 警告类型
	pattern: RegExp;
	is_line: boolean; // 是否是行内警告
	customCheck?: WarningCustomCheck; // 自定义检测警告
	id: string; // id
	enable?: boolean;
}
function remove_space(_text: string) {
	// 去除空白
	_text = _text.replace(/^([\n\r\t]+)/, function (input, match) {
		return input.slice(match.length);
	});
	return _text;
}
export const warningConfig: { [key: string]: WarningToken } = {
	"0001": {
		id: "0001",
		message: (...args: string[]) => {
			return `${args[0]} 前面包含一个以上的空格或换行`;
		},
		DiagnosticInformation: "指令格式不规范（%id%）",
		pattern: /(\s{2,}-[A-Za-z]+)\b/g,
		is_line: false
	},
	"0002": {
		id: "0002",
		message: (...args: string[]) => {
			return `${args[0]} 变量名开头为数字`;
		},
		DiagnosticInformation: "变量命名不规范（%id%）",
		pattern: /^setVar:([0-9]+\S+);/g,
		is_line: true,
		customCheck: function (
			textDocument: TextDocument,
			_text: string,
			_newarr: string[]
		) {
			const _ori_text = _text;
			_text = remove_space(_text);
			let _offset = 0;
			const _full_text = textDocument.getText();
			if (_newarr.length > 0) {
				const _prefix = _newarr.join("");
				const _line_start = _full_text.indexOf(_ori_text, _prefix.length);
				if (_line_start >= 0) {
					_offset = _line_start;
				}
			} else {
				const _line_start = _full_text.indexOf(_ori_text);
				if (_line_start >= 0) {
					_offset = _line_start;
				}
			}
			const _res_match = this.pattern.exec(_text);
			if (_res_match) {
				const diagnostic: Diagnostic = {
					severity: DiagnosticSeverity.Warning,
					range: {
						start: textDocument.positionAt(_offset),
						end: textDocument.positionAt(
							_offset + _res_match[0].length
						)
					},
					message: message(this.id, _ori_text.trim()),
					source
				};
				diagnostic.relatedInformation = [
					{
						location: {
							uri: textDocument.uri,
							range: Object.assign({}, diagnostic.range)
						},
						message: getDiagnosticInformation(this.id)
					}
				];
				return diagnostic;
			}
			return null;
		}
	},
	"0003": {
		id: "0003",
		message: (...args: string[]) => {
			return `${args[0]} 冒号后面需要添加一个空格`;
		},
		DiagnosticInformation: "指令不规范（%id%）",
		pattern: /^([^\s]+):[^\s](.+)/g,
		is_line: true
	},
	"0004": {
		id: "0004",
		message: (...args: string[]) => {
			return `${args[0]} 插值变量周围存在空格`;
		},
		DiagnosticInformation: "变量插值不规范（%id%）",
		pattern: /{(\S+\s{1,}|\s{1,}\S+|\s{1,}\S+\s{1,})}/g,
		is_line: false
	},
	"0005": {
		id: "0005",
		message: (...args: string[]) => {
			return `${args[0]} 语句缺少结束标识`;
		},
		DiagnosticInformation: "语句不规范（%id%）",
		pattern: /none/g,
		customCheck: function (
			textDocument: TextDocument,
			_text: string,
			_newarr: string[]
		) {
			_text = remove_space(_text);
			const _ori_text = _text;
			let _offset = 0;
			const _full_text = textDocument.getText();
			if (_newarr.length > 0) {
				const _prefix = _newarr.join("");
				_offset = _full_text.indexOf(_ori_text, _prefix.length);
			} else {
				_offset = _full_text.indexOf(_ori_text);
			}
			if (_offset < 0) {
				_offset = 0;
			}
			const _res_match_start = _text.endsWith(";") ? true : false;
			const _res =
				_text.startsWith(";") || _res_match_start ? true : false;
			const _condition =
				!_text.includes(";") && !_res && _text.length > 0;
			if (_condition) {
				const diagnostic: Diagnostic = {
					severity: DiagnosticSeverity.Warning,
					range: {
						start: textDocument.positionAt(_offset),
						end: textDocument.positionAt(
							_offset + _text.trim().length
						)
					},
					message: message(this.id, _text.trim()),
					source
				};
				diagnostic.relatedInformation = [
					{
						location: {
							uri: textDocument.uri,
							range: Object.assign({}, diagnostic.range)
						},
						message: getDiagnosticInformation(this.id)
					}
				];
				return diagnostic;
			}
			return null;
		},
		is_line: true
	}
};

/**
 * @description: 获取诊断结果
 * @param {string} id
 * @param {array} args
 * @return {*}
 */
export function message(id: string, ...args: string[]): string {
	const _data = warningConfig[id];
	if (!_data) {
		return "";
	}
	return _data.message(...args);
}

/**
 * @description: 获取诊断类型信息
 * @param {string} id
 * @return {*}
 */
export function getDiagnosticInformation(id: string): string {
	const _data = warningConfig[id];
	if (!_data) {
		return "未知错误类型";
	}
	return _data.DiagnosticInformation.replace(/%(\w+)%/g, function () {
		return id;
	});
}
