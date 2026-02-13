import { ServerSettings } from "../types";
import {
	clearGlobalMap,
	fsAccessor,
	getGlobalMap,
	IVChooseToken,
	IVToken,
	runCode,
	source
} from "@webgal/language-core";
import { warningConfig, getDiagnosticInformation } from "@/warnings";
import {
	Connection,
	Diagnostic,
	DiagnosticSeverity,
	Position,
	Range
} from "@volar/language-server";
import {
	FileType,
	type FileStat,
	type FileSystem
} from "@volar/language-service";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { URI } from "vscode-uri";
import type { VirtualFileSystem } from "@webgal/language-service" with {
	"resolution-mode": "import"
};
import { getState } from "./providerState";

type SendRequestConnection = {
	sendRequest: (method: string, ...params: any[]) => Promise<any>;
};

export function bindCoreFileAccessorToClientVfs(
	connection: SendRequestConnection
) {
	const isWindows =
		typeof process !== "undefined" &&
		!!process.platform &&
		process.platform === "win32";
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();

	fsAccessor.isWindows = isWindows;
	fsAccessor.readFile = async (path: string): Promise<Uint8Array> => {
		const content = (await connection.sendRequest(
			"client/vfs/readFile",
			path
		)) as string | null;
		if (content === null) {
			throw new Error("File not found");
		}
		return encoder.encode(content);
	};
	fsAccessor.writeFile = async (
		path: string,
		contents: Uint8Array
	): Promise<void> => {
		const content = decoder.decode(contents);
		await connection.sendRequest("client/vfs/writeFile", {
			path,
			content
		});
	};
}

// 获取变量的描述
export function getVariableTypeDesc(ALL_ARR: string[], _start_line: number) {
	let _desc_arr = [];
	for (let _d_index = _start_line - 2; _d_index > 0; _d_index--) {
		const _data = ALL_ARR[_d_index];
		if (_data.startsWith(";") && _data.length > 0) {
			_desc_arr.unshift(_data.substring(1));
		} else if (_data.length > 0) {
			break;
		} else {
			continue;
		}
	}
	return _desc_arr.join("\n");
}

export function getVariableType(expr: string): string {
	if (expr.includes("$stage") || expr.includes("$userData")) {
		return "expression";
	}
	const evaluatorFunc = runCode(expr);
	const res = typeof evaluatorFunc();
	return res;
}

/** 获取位置的指令单词 */
export function getWordAtPosition(
	doc: TextDocument,
	pos: Position,
	charRegex?: RegExp
): { word: string; start: number; end: number } | null {
	const text = doc.getText();
	const offset = doc.offsetAt(pos);
	if (offset < 0 || offset > text.length) {
		return null;
	}

	// 如果没有提供 charRegex，使用默认
	const testChar = (ch: string) => {
		if (!charRegex) {
			return /[\p{L}\p{N}_]_?[\p{L}\p{N}_]*/u.test(ch);
		}
		// 为避免全局标志的问题，使用新的无 g 的正则来测试单个字符
		const flags = (charRegex.flags || "").replace("g", "");
		const r = new RegExp(charRegex.source, flags);
		return r.test(ch);
	};

	let i = offset - 1;
	while (i >= 0 && testChar(text.charAt(i))) {
		i--;
	}
	const start = i + 1;

	let j = offset;
	while (j < text.length && testChar(text.charAt(j))) {
		j++;
	}
	const end = j;

	if (start >= end) {
		return null;
	}
	const word = text.slice(start, end);
	return { word, start, end };
}

export function getPatternAtPosition(
	doc: TextDocument,
	pos: Position,
	pattern: RegExp,
	maxRadius = 512
): {
	text: string;
	start: number;
	end: number;
	startPos: Position;
	endPos: Position;
	groups?: RegExpExecArray;
} | null {
	const text = doc.getText();
	const offset = doc.offsetAt(pos);
	if (offset < 0 || offset > text.length) {
		return null;
	}

	const cleanFlags = (pattern.flags || "").replace(/[gy]/g, "");
	const re = new RegExp(pattern.source, cleanFlags + "g");

	let startSearch = Math.max(0, offset - maxRadius);
	const lookBehindLimit = Math.max(0, offset - maxRadius - 2048);

	for (let i = offset - 1; i >= lookBehindLimit; i--) {
		const char = text[i];
		// 如果遇到，则认为这很可能是单词的边界
		if (/[\s\[\(\;\,\>]/.test(char)) {
			startSearch = i + 1;
			break;
		}
	}

	const endSearch = Math.min(text.length, offset + maxRadius);
	const substr = text.slice(startSearch, endSearch);

	let m: RegExpExecArray | null;
	re.lastIndex = 0;

	while ((m = re.exec(substr)) !== null) {
		// 计算在整个文档中的绝对位置
		const matchStart = startSearch + m.index;
		const matchEnd = matchStart + m[0].length;

		// 检查光标是否在匹配范围内
		if (offset >= matchStart && offset <= matchEnd) {
			const startPos = doc.positionAt(matchStart);
			const endPos = doc.positionAt(matchEnd);

			return {
				text: m[0],
				start: matchStart,
				end: matchEnd,
				startPos: startPos,
				endPos: endPos,
				groups: m
			};
		}
	}

	return null;
}

export function getTokenOrPatternAtPosition(
	doc: TextDocument,
	pos: Position,
	charRegex?: RegExp,
	pattern?: RegExp
): { word: string; start: number; end: number } | null {
	// 先用你已有的基于字符的扩展（保证传入 charRegex 是字符级的）
	const basic = getWordAtPosition(doc, pos, charRegex);
	if (basic && pattern) {
		// 如果 basic 匹配整个 pattern，则返回 basic（有时 basic 包含大括号）
		const flags = (pattern.flags || "").replace("g", "");
		const full = new RegExp(`^(?:${pattern.source})$`, flags);
		if (full.test(basic.word)) {
			return basic;
		}
	}
	if (basic) {
		return basic;
	}

	// 否则尝试全文模式查找（pattern 提供时）
	if (pattern) {
		const found = getPatternAtPosition(doc, pos, pattern);
		if (found) {
			return { word: found.text, start: found.start, end: found.end };
		}
	}
	return null;
}
/** Helper: 判断是否属于 路径字符 */
export function isPathChar(ch: string): boolean {
	return /[A-Za-z0-9_.\-\/~]/.test(ch);
}

/** 从 position 找到当前 token 的 start offset（用于 replacement range） */
export function findTokenRange(
	doc: TextDocument,
	pos: Position
): { startOffset: number; endOffset: number; token: string } {
	const text = doc.getText();
	const offset = doc.offsetAt(pos);
	let i = offset - 1;
	while (i >= 0 && isPathChar(text.charAt(i))) {
		i--;
	}
	const start = i + 1;
	let j = offset;
	while (j < text.length && isPathChar(text.charAt(j))) {
		j++;
	}
	const end = j;
	const token = text.slice(start, end);
	return { startOffset: start, endOffset: end, token };
}

// 根据文档 URI 和 token（如 "./src/fi"）列出目录下匹配项
export async function listPathCandidates(
	docUri: string,
	token: string
): Promise<Array<{ label: string; insertText: string; isDirectory: boolean }>> {
	try {
		const isNodeRuntime =
			typeof process !== "undefined" &&
			!!process.versions &&
			!!process.versions.node;
		if (!isNodeRuntime) {
			return [];
		}
		const [{ fileURLToPath }, path, fs] = await Promise.all([
			import("url"),
			import("path"),
			import("fs/promises")
		]);
		let filePath: string | null = null;
		if (docUri.startsWith("file://")) {
			filePath = fileURLToPath(docUri);
		} else {
			return [];
		}

		const baseDir = path.dirname(filePath);

		let resolvedBase: string;
		let partialName = "";

		if (token.startsWith("/")) {
			const maybeDir = token.endsWith("/") ? token : path.dirname(token);
			resolvedBase = path.resolve(maybeDir);
			partialName = token.endsWith("/") ? "" : path.basename(token);
		} else if (token.startsWith("~")) {
			const homedir = process.env.HOME || process.env.USERPROFILE || "";
			const afterTilde = token === "~" ? "" : token.slice(2); // "~/" 前缀处理
			const joined = path.join(homedir, afterTilde);
			resolvedBase = path.dirname(joined);
			partialName = path.basename(joined);
		} else {
			// 相对路径：基于当前文件夹解析
			if (token.includes("/")) {
				const tokenDir = token.slice(0, token.lastIndexOf("/"));
				partialName = token.slice(token.lastIndexOf("/") + 1);
				resolvedBase = path.resolve(baseDir, tokenDir || ".");
			} else {
				resolvedBase = baseDir;
				partialName = token;
			}
		}

		const entries = await fs
			.readdir(resolvedBase, { withFileTypes: true })
			.catch(() => []);
		const candidates = entries
			.filter((e) => e.name.startsWith(partialName))
			.map((e) => {
				const isDir = e.isDirectory();
				const name = e.name + (isDir ? "/" : "");
				let insertText: string;
				if (token.includes("/")) {
					const prefix = token.slice(0, token.lastIndexOf("/") + 1);
					insertText = prefix + e.name + (isDir ? "/" : "");
				} else {
					insertText = e.name + (isDir ? "/" : "");
				}
				return { label: name, insertText, isDirectory: isDir };
			});

		return candidates;
	} catch (err) {
		return [];
	}
}

//  获取补全上下文
export function getStageCompletionContext(
	document: TextDocument,
	cursorPos: Position,
	match: { text: string; start: number }
): {
	replaceRange: Range;
	fullSegments: string[];
	querySegments: string[];
	prefix: string;
} {
	const cursorOffset = document.offsetAt(cursorPos);
	const relCursor = Math.max(
		0,
		Math.min(cursorOffset - match.start, match.text.length)
	);
	const rawBeforeCursor = match.text.slice(0, relCursor);
	const lastDotIndex = rawBeforeCursor.lastIndexOf(".");
	const replaceStartOffset =
		match.start + (lastDotIndex === -1 ? 0 : lastDotIndex + 1);
	const replaceRange = Range.create(
		document.positionAt(replaceStartOffset),
		cursorPos
	);

	const normalizedBeforeCursor = rawBeforeCursor.startsWith("$")
		? rawBeforeCursor.slice(1)
		: rawBeforeCursor;
	const rawSegments = normalizedBeforeCursor.split(".");
	const fullSegments = rawSegments.filter((part) => part);
	const hasTrailingDot = normalizedBeforeCursor.endsWith(".");
	const prefix = hasTrailingDot
		? ""
		: rawSegments[rawSegments.length - 1] || "";
	const querySegments = hasTrailingDot
		? fullSegments
		: fullSegments.slice(0, -1);

	return { replaceRange, fullSegments, querySegments, prefix };
}

/** 更新全局映射表 */
export function updateGlobalMap(documentTextArray: string[], scope: string) {
	// 生成全局映射表
	clearGlobalMap(scope);
	const GlobalMap = getGlobalMap(scope);
	for (
		let lineNumber = 0;
		lineNumber < documentTextArray.length;
		lineNumber++
	) {
		const currentLine = documentTextArray[lineNumber];
		const setVarExec = /setVar:\s*(\w+)\s*=\s*([^;]*\S+);?/g.exec(
			currentLine
		);
		const labelExec = /label:\s*(\S+);/g.exec(currentLine);
		const getUserInputExec = /getUserInput:\s*([^\s;]+)/g.exec(currentLine);
		const chooseExec = /choose:\s*([^\s;]+)/g.exec(currentLine);
		if (setVarExec !== null) {
			const currentVariablePool = (GlobalMap.setVar[setVarExec[1]] ??=
				[]);
			const isGlobal =
				currentLine.indexOf("-global") === -1 ? false : true;
			currentVariablePool.push({
				word: setVarExec[1],
				value: setVarExec[2],
				input: setVarExec.input,
				isGlobal,
				isGetUserInput: false,
				position: Position.create(lineNumber, setVarExec.index + 7)
			} as IVToken);

			/* 获取变量描述 */
			const currentVariableLatest =
				currentVariablePool[currentVariablePool.length - 1];
			if (currentVariableLatest && currentVariableLatest?.position) {
				const _v_pos = currentVariableLatest.position;
				const _v_line = _v_pos?.line ? _v_pos.line : -1;
				currentVariableLatest.desc = getVariableTypeDesc(
					documentTextArray,
					_v_line
				);
			}
		} else if (labelExec !== null) {
			(GlobalMap.label[labelExec[1]] ??= []).push({
				word: labelExec[1],
				value: labelExec.input,
				input: labelExec.input,
				position: Position.create(lineNumber, 6)
			} as IVToken);
		} else if (getUserInputExec !== null) {
			(GlobalMap.setVar[getUserInputExec[1]] ??= []).push({
				word: getUserInputExec[1],
				value: getUserInputExec.input,
				input: getUserInputExec.input,
				isGetUserInput: true,
				position: Position.create(lineNumber, 13)
			} as IVToken);
		} else if (chooseExec !== null) {
			const options: IVChooseToken["options"] = [];
			const text = chooseExec[1];
			for (const machChooseOption of text.split("|")) {
				const sliceArray = machChooseOption.split(":");
				options.push({
					text: sliceArray[0]?.trim(),
					value: sliceArray[1]?.trim()
				});
			}
			GlobalMap.choose[lineNumber] = {
				options,
				line: lineNumber
			} as IVChooseToken;
		}
	}
}

export const defaultSettings = {
	maxNumberOfProblems: 1000,
	isShowWarning: true,
	isShowHint: "变量名后"
} satisfies ServerSettings;

export const documentSettings: Map<
	string,
	Thenable<ServerSettings>
> = new Map();

export const StateConfig = {
	hasConfigurationCapability: false, // 是否支持配置能力
	hasWorkspaceFolderCapability: false, // 是否支持工作区文件夹能力
	hasDiagnosticRelatedInformationCapability: false // 是否支持诊断相关信息的能力
};

export let globalSettings: ServerSettings = defaultSettings;
export function setGlobalSettings(settings: ServerSettings) {
	globalSettings = settings;
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
	textDocument: TextDocument
): Promise<Diagnostic[]> {
	const settings = await getDocumentSettings(connection, textDocument.uri);
	if (!settings?.isShowWarning) {
		return [];
	}
	const text = textDocument.getText();
	let m: RegExpExecArray | null;
	let problems = 0;
	const diagnostics: Diagnostic[] = [];
	let _sp = text.split(/\n|\t\n|\r\n/);
	for (let i in warningConfig) {
		const _token = warningConfig[i];
		const _pattern = _token.pattern as RegExp;
		if (_token.is_line) {
			continue;
		}
		if (_token.customCheck && _token.customCheck instanceof Function) {
			const _custom_res = _token.customCheck(textDocument, text);
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
		for (let i in warningConfig) {
			const _token = warningConfig[i];
			const _pattern = _token.pattern as RegExp;
			if (!_token.is_line) {
				continue;
			}
			const _newarr = _sp.slice(0, _line_index).join();
			if (_token.customCheck && _token.customCheck instanceof Function) {
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

export function createVolarFileSystemFromVirtualFileSystem(
	vfs: VirtualFileSystem,
	options?: {
		uriToPath?: (uri: URI) => string;
	}
): FileSystem {
	let cached: FileSystem | null = null;
	const load = async () => {
		if (cached) {
			return cached;
		}
		const module = await import("@webgal/language-service");
		cached = module.createVolarFileSystem(vfs, options);
		return cached;
	};
	return {
		stat: async (uri) => {
			const fs = await load();
			return fs.stat(uri);
		},
		readFile: async (uri) => {
			const fs = await load();
			return fs.readFile(uri);
		},
		readDirectory: async (uri) => {
			const fs = await load();
			return fs.readDirectory(uri);
		}
	};
}

export function createClientVfsFileSystem(
	connection: SendRequestConnection,
	options?: {
		uriToPath?: (uri: URI) => string;
	}
): FileSystem {
	const uriToPath =
		options?.uriToPath ??
		((uri: URI) => {
			if (uri.scheme === "file") {
				const pathValue = uri.path;
				if (/^\/[a-zA-Z]:\//.test(pathValue)) {
					return pathValue.slice(1);
				}
				return pathValue;
			}
			return uri.path;
		});
	return {
		stat: async (uri) => {
			const pathValue = uriToPath(uri);
			const info = (await connection.sendRequest(
				"client/FStat",
				pathValue
			)) as { isFile: boolean; isDirectory: boolean } | null;
			if (!info) {
				return undefined;
			}
			const type = info.isDirectory
				? FileType.Directory
				: info.isFile
					? FileType.File
					: FileType.Unknown;
			const stat: FileStat = {
				type,
				ctime: 0,
				mtime: 0,
				size: 0
			};
			return stat;
		},
		readFile: async (uri) => {
			const pathValue = uriToPath(uri);
			const content = (await connection.sendRequest(
				"client/vfs/readFile",
				pathValue
			)) as string | null;
			return content ?? undefined;
		},
		readDirectory: async (uri) => {
			const entries = (await connection.sendRequest(
				"client/readDirectory",
				uri.toString()
			)) as Array<{ name: string; isDirectory: boolean }> | null;
			if (!entries) {
				return [];
			}
			return entries.map((entry) => [
				entry.name,
				entry.isDirectory ? FileType.Directory : FileType.File
			]);
		}
	};
}

export { getState };
