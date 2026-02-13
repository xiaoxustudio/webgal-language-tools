import * as expressions from "angular-expressions";
import { FileAccessor, IDefinetionMap } from "./types";

export const source = "WebGal Script";
export const SCHEME = "webgal-virtual-doc";

// 作用域映射表
const ScopeMap = new Map<string, IDefinetionMap>();

/**
 * 获取指定作用域的映射表
 * @param scope 作用域标识符 (默认为 'global')
 */
export const getGlobalMap = (scope: string = "global"): IDefinetionMap => {
	if (!ScopeMap.has(scope)) {
		ScopeMap.set(scope, {
			label: {},
			setVar: {},
			choose: {}
		});
	}
	return ScopeMap.get(scope)!;
};

/**
 * 清除指定作用域的映射表
 * @param scope 作用域标识符 (默认为 'global')
 */
export const clearGlobalMap = (scope: string = "global") => {
	const map = getGlobalMap(scope);
	map.label = {};
	map.setVar = {};
	map.choose = {};
};

// 保持兼容性的默认导出
export const GlobalMap = getGlobalMap("global");

export const cleartGlobalMapAll = () => {
	clearGlobalMap("global");
};

const isNodeRuntime =
	typeof process !== "undefined" &&
	!!process.versions &&
	!!process.versions.node;

const getIsWindows = () => {
	if (isNodeRuntime && process.platform) {
		return process.platform === "win32";
	}
	// @ts-ignore
	if (typeof navigator !== "undefined" && navigator.userAgent) {
		// @ts-ignore
		return /windows/i.test(navigator.userAgent);
	}
	return false;
};

export let fsAccessor: FileAccessor = {
	isWindows: getIsWindows(),
	async readFile(path: string): Promise<Uint8Array> {
		if (!isNodeRuntime) {
			throw new Error("File system is not available");
		}
		const fs = await import("fs/promises");
		return fs.readFile(path);
	},
	async writeFile(path: string, contents: Uint8Array): Promise<void> {
		if (!isNodeRuntime) {
			throw new Error("File system is not available");
		}
		const fs = await import("fs/promises");
		await fs.writeFile(path, contents);
	}
};

export const setFsAccessor = (accessor: FileAccessor) => {
	fsAccessor = accessor;
};

export const runCode = (text: string, ops?: expressions.CompileFuncOptions) => {
	return expressions.compile(text, ops);
};

export * from "./types";
