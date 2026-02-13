import * as expressions from "angular-expressions";
import { FileAccessor, IDefinetionMap, IVChooseToken, IVToken } from "./types";

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

const getVariableDesc = (lines: string[], startLine: number) => {
	const desc: string[] = [];
	for (let index = startLine - 2; index > 0; index--) {
		const line = lines[index];
		if (line.startsWith(";") && line.length > 0) {
			desc.unshift(line.substring(1));
		} else if (line.length > 0) {
			break;
		}
	}
	return desc.join("\n");
};

export const analyzeWebgalText = (text: string): IDefinetionMap => {
	const map: IDefinetionMap = {
		label: {},
		setVar: {},
		choose: {}
	};
	const lines = text.split(/\r?\n/);
	for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
		const currentLine = lines[lineNumber];
		const setVarExec = /setVar:\s*(\w+)\s*=\s*([^;]*\S+);?/g.exec(
			currentLine
		);
		const labelExec = /label:\s*(\S+);/g.exec(currentLine);
		const getUserInputExec = /getUserInput:\s*([^\s;]+)/g.exec(currentLine);
		const chooseExec = /choose:\s*([^\s;]+)/g.exec(currentLine);
		if (setVarExec !== null) {
			const currentVariablePool = (map.setVar[setVarExec[1]] ??= []);
			const isGlobal = currentLine.indexOf("-global") !== -1;
			const currentToken: IVToken = {
				word: setVarExec[1],
				value: setVarExec[2],
				input: setVarExec.input,
				isGlobal,
				isGetUserInput: false,
				position: { line: lineNumber, character: setVarExec.index + 7 }
			};
			currentToken.desc = getVariableDesc(lines, lineNumber);
			currentVariablePool.push(currentToken);
		} else if (labelExec !== null) {
			(map.label[labelExec[1]] ??= []).push({
				word: labelExec[1],
				value: labelExec.input,
				input: labelExec.input,
				position: { line: lineNumber, character: 6 }
			} as IVToken);
		} else if (getUserInputExec !== null) {
			(map.setVar[getUserInputExec[1]] ??= []).push({
				word: getUserInputExec[1],
				value: getUserInputExec.input,
				input: getUserInputExec.input,
				isGetUserInput: true,
				position: { line: lineNumber, character: 13 }
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
			map.choose[lineNumber] = {
				options,
				line: lineNumber
			} as IVChooseToken;
		}
	}
	return map;
};

export * from "./types";
