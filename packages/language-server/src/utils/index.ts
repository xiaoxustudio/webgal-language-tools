import { setFsAccessor } from "@webgal/language-core";
import type { IDefinetionMap, IDepItem } from "@webgal/language-core";
import type {
	Connection,
	FoldingRange,
	Position
} from "@volar/language-server";
import { Range } from "@volar/language-server";
import type { LanguageServiceContext } from "@volar/language-service";
import type { CodeInformation, IScriptSnapshot } from "@volar/language-core";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import type { WebgalDocumentLinkCandidate, WebgalVirtualCode } from "@/types";
import { languageId } from "@/utils/resources";

export function bindCoreFileAccessorToClientVfs(connection: Connection) {
	const isWindows =
		typeof process !== "undefined" &&
		!!process.platform &&
		process.platform === "win32";
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();

	setFsAccessor({
		isWindows,
		readFile: async (path: string): Promise<Uint8Array> => {
			const content = (await connection.sendRequest(
				"client/vfs/readFile",
				path
			)) as string | null;
			if (content === null) {
				throw new Error("File not found");
			}
			return encoder.encode(content);
		},
		writeFile: async (
			path: string,
			contents: Uint8Array
		): Promise<void> => {
			const content = decoder.decode(contents);
			await connection.sendRequest("client/vfs/writeFile", {
				path,
				content
			});
		}
	});
}

export const fullCodeInformation: CodeInformation = {
	completion: true,
	semantic: true,
	navigation: true,
	structure: true,
	format: true,
	verification: true
};

export const emptyDefinitionMap: IDefinetionMap = {
	label: {},
	setVar: {},
	choose: {},
	deps: []
};

export const getSnapshotText = (snapshot: IScriptSnapshot) =>
	snapshot.getText(0, snapshot.getLength());

export const buildLineStarts = (text: string) => {
	const result = [0];
	for (let i = 0; i < text.length; i++) {
		if (text.charCodeAt(i) === 10) {
			result.push(i + 1);
		}
	}
	return result;
};

export const getLineFromOffset = (lineStarts: number[], offset: number) => {
	let low = 0;
	let high = lineStarts.length - 1;
	while (low <= high) {
		const mid = (low + high) >> 1;
		const start = lineStarts[mid];
		const nextStart = lineStarts[mid + 1] ?? Number.POSITIVE_INFINITY;
		if (offset < start) {
			high = mid - 1;
		} else if (offset >= nextStart) {
			low = mid + 1;
		} else {
			return mid;
		}
	}
	return 0;
};

const getSourceUri = (
	context: LanguageServiceContext,
	document: TextDocument
) => {
	const uri = URI.parse(document.uri);
	const decoded = context.decodeEmbeddedDocumentUri?.(uri);
	return decoded ? decoded[0] : uri;
};

const getSourceVirtualCode = (
	context: LanguageServiceContext,
	document: TextDocument
) => {
	const sourceUri = getSourceUri(context, document);
	const script = context.language.scripts.get(sourceUri);
	const virtualCode = script?.generated?.root as
		| WebgalVirtualCode
		| undefined;
	return { script, virtualCode };
};

export const getWebgalDefinitionMap = (
	context: LanguageServiceContext,
	document: TextDocument
): IDefinetionMap => {
	const { virtualCode } = getSourceVirtualCode(context, document);
	return virtualCode?.webgalDefinitionMap ?? emptyDefinitionMap;
};

export const getWebgalDocumentLinkCandidates = (
	context: LanguageServiceContext,
	document: TextDocument
): WebgalDocumentLinkCandidate[] => {
	const { virtualCode } = getSourceVirtualCode(context, document);
	return virtualCode?.webgalDocumentLinkCandidates ?? [];
};

export const getWebgalFoldingRanges = (
	context: LanguageServiceContext,
	document: TextDocument
): FoldingRange[] => {
	const { virtualCode } = getSourceVirtualCode(context, document);
	return virtualCode?.webgalFoldingRanges ?? [];
};

export const getWebgalVirtualCodeLines = (
	context: LanguageServiceContext,
	document: TextDocument
): string[] => {
	const { virtualCode } = getSourceVirtualCode(context, document);
	if (virtualCode?.webgalLines) {
		return virtualCode.webgalLines;
	}
	return document.getText().split(/\r?\n/);
};

export const getWebgalLineCommandTypes = (
	context: LanguageServiceContext,
	document: TextDocument
): string[] => {
	const { virtualCode } = getSourceVirtualCode(context, document);
	if (virtualCode?.webgalLineCommandTypes) {
		return virtualCode.webgalLineCommandTypes;
	}
	return getWebgalVirtualCodeLines(context, document).map(getLineCommandType);
};

export const getLineCommandType = (line: string) => {
	return line.substring(
		0,
		line.indexOf(":") !== -1 ? line.indexOf(":") : line.indexOf(";")
	);
};

export const getWebgalSourceUriString = (
	context: LanguageServiceContext,
	document: TextDocument
): string => {
	return getSourceUri(context, document).toString();
};

export const getWebgalVirtualCodeText = (
	context: LanguageServiceContext,
	document: TextDocument
): string => {
	const uri = URI.parse(document.uri);
	const script = context.language.scripts.get(uri);
	const snapshot = script?.snapshot;
	if (snapshot) {
		return snapshot.getText(0, snapshot.getLength());
	}
	return document.getText();
};

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
		if (/[\s[(;,>]/.test(char)) {
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
	return /[A-Za-z0-9_.\-/~]/.test(ch);
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
	} catch {
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

// ========== 依赖体系交互方法 ==========

/**
 * 全局虚拟代码索引表。
 *
 * 采用两级索引：外出 /game/scene/ 前缀后的相对路径做"短键"，
 * 维护到同一短键下所有完整已归一化 URI 的映射，方便按文件名模糊查找；
 * 同时在 flatMap 中以完整 URI 为键直接索引，保证 O(1) 精确增删。
 *
 * 不同工作区（workspace）产生的路径前缀不同，短键碰撞概率极低；
 * 搜索函数 `findWebgalVirtualCodeByFileName` / `getParentVirtualCodes`
 * 会额外通过 `context.env.workspaceFolders` 限定工作区范围，
 * 确保多工作区场景下数据不会交叉污染。
 */
const virtualCodeRegistry = {
	/** 短键 → 完整 id[] */
	byShortName: new Map<string, string[]>(),
	/** 完整 id → WebgalVirtualCode */
	byFullId: new Map<string, WebgalVirtualCode>()
};

/** 从 URI 字符串中提取文件名（忽略路径和查询参数） */
function getFileNameFromUriString(uriString: string): string {
	try {
		const uri = URI.parse(uriString);
		const path = uri.path;
		const lastSlash = path.lastIndexOf("/");
		return lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
	} catch {
		return uriString;
	}
}

/** 获取虚拟代码的归一化完整标识 */
function getVcFullId(vc: WebgalVirtualCode): string {
	return (vc.webgalOriginalId ?? vc.id).toLowerCase();
}

/** 判断虚拟代码是否属于指定的某个工作区 */
function isVcInWorkspace(vc: WebgalVirtualCode, workspaceFolders: URI[]): boolean {
	const vcPath = getVcFullId(vc);
	for (const folder of workspaceFolders) {
		const folderPath = folder.toString().toLowerCase();
		if (vcPath.startsWith(folderPath)) {
			return true;
		}
	}
	return false;
}

/** 将虚拟代码注册到索引表 */
export function registerWebgalVirtualCode(vc: WebgalVirtualCode): void {
	if (vc.languageId !== languageId) {
		return;
	}
	const fullId = getVcFullId(vc);
	const shortName = getFileNameFromUriString(fullId);

	// 精确索引
	virtualCodeRegistry.byFullId.set(fullId, vc);

	// 短键索引（用于按文件名查找）
	const ids = virtualCodeRegistry.byShortName.get(shortName);
	if (ids) {
		if (!ids.includes(fullId)) {
			ids.push(fullId);
		}
	} else {
		virtualCodeRegistry.byShortName.set(shortName, [fullId]);
	}
}

/** 从索引表中注销虚拟代码 */
export function unregisterWebgalVirtualCode(vc: WebgalVirtualCode): void {
	const fullId = getVcFullId(vc);
	const shortName = getFileNameFromUriString(fullId);

	virtualCodeRegistry.byFullId.delete(fullId);

	const ids = virtualCodeRegistry.byShortName.get(shortName);
	if (ids) {
		const idx = ids.indexOf(fullId);
		if (idx !== -1) {
			ids.splice(idx, 1);
		}
		if (ids.length === 0) {
			virtualCodeRegistry.byShortName.delete(shortName);
		}
	}
}

/**
 * 按文件名查找指定工作区内的虚拟代码
 * @param context 语言服务上下文（用于获取工作区范围）
 * @param fileName 目标场景文件名（如 "a.txt"）
 */
export function findWebgalVirtualCodeByFileName(
	context: LanguageServiceContext,
	fileName: string
): WebgalVirtualCode | undefined {
	const targetName = fileName.toLowerCase();
	const ids = virtualCodeRegistry.byShortName.get(targetName);
	if (!ids || ids.length === 0) {
		return undefined;
	}
	const workspaceFolders = context.env.workspaceFolders;

	for (const fullId of ids) {
		const vc = virtualCodeRegistry.byFullId.get(fullId);
		if (!vc) {
			continue;
		}
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return vc;
		}
		if (isVcInWorkspace(vc, workspaceFolders)) {
			return vc;
		}
	}
	return undefined;
}

/** 获取当前文档的完整依赖列表 */
export function getWebgalDeps(
	context: LanguageServiceContext,
	document: TextDocument
): IDepItem[] {
	const { virtualCode } = getSourceVirtualCode(context, document);
	return (
		virtualCode?.webgalDeps ?? virtualCode?.webgalDefinitionMap?.deps ?? []
	);
}

/**
 * 获取 deps 数组中指定索引项对应的虚拟代码（被依赖方）
 * @param context  语言服务上下文
 * @param document 当前文档
 * @param depIndex deps 数组索引
 * @returns 对应依赖场景的虚拟代码，找不到返回 undefined
 */
export function getDepItemVirtualCode(
	context: LanguageServiceContext,
	document: TextDocument,
	depIndex: number
): WebgalVirtualCode | undefined {
	const deps = getWebgalDeps(context, document);
	if (depIndex < 0 || depIndex >= deps.length) {
		return undefined;
	}
	return findWebgalVirtualCodeByFileName(context, deps[depIndex].fileName);
}

/**
 * 获取父级（被依赖方）虚拟代码列表——即哪些场景文件依赖了当前文件。
 * 扫描索引表中与当前文档同工作区的所有虚拟代码，
 * 找出 deps 中包含当前文件名的虚拟代码。
 * @returns 所有依赖当前文件的虚拟代码数组（已限定工作区）
 */
export function getParentVirtualCodes(
	context: LanguageServiceContext,
	document: TextDocument
): WebgalVirtualCode[] {
	const { virtualCode: currentVc } = getSourceVirtualCode(context, document);
	if (!currentVc) {
		return [];
	}

	const currentFileName = getFileNameFromUriString(
		getVcFullId(currentVc)
	);
	const workspaceFolders = context.env.workspaceFolders;

	const parents: WebgalVirtualCode[] = [];
	for (const [, vc] of virtualCodeRegistry.byFullId) {
		if (vc === currentVc) {
			continue;
		}
		// 限定同工作区
		if (
			workspaceFolders &&
			!isVcInWorkspace(vc, workspaceFolders)
		) {
			continue;
		}
		const vcDeps = vc.webgalDeps ?? vc.webgalDefinitionMap?.deps;
		if (
			vcDeps?.some(
				(dep) => dep.fileName.toLowerCase() === currentFileName
			)
		) {
			parents.push(vc);
		}
	}
	return parents;
}
