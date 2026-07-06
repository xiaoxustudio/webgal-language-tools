import * as expressions from "angular-expressions";
import type {
	FileAccessor,
	IDefinetionMap,
	IDepItem,
	IVChooseToken,
	IVToken
} from "./types";

export const source = "WebGal Script";
export const SCHEME = "webgal-virtual-doc";

const isNodeRuntime =
	typeof process !== "undefined" &&
	!!process.versions &&
	!!process.versions.node;

const getIsWindows = () => {
	if (isNodeRuntime && process.platform) {
		return process.platform === "win32";
	}
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-expect-error
	if (typeof navigator !== "undefined" && navigator.userAgent) {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
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

export const getVariableDesc = (lines: string[], startLine: number) => {
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

export const analyzeWebgalDeps = (text: string): IDepItem[] => {
	const deps: IDepItem[] = [];
	const lines = text.split(/\r?\n/);
	for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
		const currentLine = lines[lineNumber];
		// callScene:xxx.txt —— 调用场景（执行完会返回）
		const callSceneExec = /callScene:\s*([^\s;]+)/g.exec(currentLine);
		if (callSceneExec) {
			const fileName = callSceneExec[1];
			if (fileName.endsWith(".txt")) {
				deps.push({
					fileName,
					command: "callScene",
					position: { line: lineNumber, character: callSceneExec.index },
					line: lineNumber
				});
			}
		}
		// changeScene:xxx.txt —— 切换场景
		const changeSceneExec = /changeScene:\s*([^\s;]+)/g.exec(
			currentLine
		);
		if (changeSceneExec) {
			const fileName = changeSceneExec[1];
			if (fileName.endsWith(".txt")) {
				deps.push({
					fileName,
					command: "changeScene",
					position: {
						line: lineNumber,
						character: changeSceneExec.index
					},
					line: lineNumber
				});
			}
		}
		// choose:text1:file1.txt|text2:file2.txt —— 分支选择中的场景跳转
		const chooseExec = /choose:\s*([^\s;]+)/g.exec(currentLine);
		if (chooseExec) {
			const optionsText = chooseExec[1];
			for (const option of optionsText.split("|")) {
				const parts = option.split(":");
				const value = parts[1]?.trim();
				if (value && value.endsWith(".txt")) {
					deps.push({
						fileName: value,
						command: "choose",
						position: {
							line: lineNumber,
							character: chooseExec.index
						},
						line: lineNumber
					});
				}
			}
		}
	}
	return deps;
};

export const analyzeWebgalText = (text: string): IDefinetionMap => {
	const map: IDefinetionMap = {
		label: {},
		setVar: {},
		choose: {},
		deps: analyzeWebgalDeps(text)
	};
	const lines = text.split(/\r?\n/);
	for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
		const currentLine = lines[lineNumber];
		const setVarExec = /setVar:\s*(\w+)\s*=\s*([^;\s]*)(?=;?)/g.exec(
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
export * from "./formatter";
export * from "./diagnostics";
