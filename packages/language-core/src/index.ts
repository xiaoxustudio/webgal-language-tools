import * as expressions from "angular-expressions";
import { FileAccessor, IDefinetionMap } from "./types";

export const source = "WebGal Script";
export const SCHEME = "webgal-virtual-doc";

// 上一次全局映射表
export const GlobalMap: IDefinetionMap = {
	label: {},
	setVar: {},
	choose: {}
};

export const cleartGlobalMapAll = () => {
	GlobalMap.label = {};
	GlobalMap.setVar = {};
	GlobalMap.choose = {};
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

export const fsAccessor: FileAccessor = {
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

export const runCode = (text: string, ops?: expressions.CompileFuncOptions) => {
	return expressions.compile(text, ops);
};

export * from "./types";
