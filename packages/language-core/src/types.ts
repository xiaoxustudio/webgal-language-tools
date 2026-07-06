export class RuntimeVariable {
	public reference?: number;
	public desc?: "Array" | "Object" | string;
	public get value() {
		return this._value;
	}

	public set value(value: IRuntimeVariableType) {
		this._value = value;
	}

	constructor(
		public readonly name: string,
		private _value: IRuntimeVariableType
	) {}
}

export type IRuntimeVariableType =
	| number
	| boolean
	| string
	| RuntimeVariable[];

export type StageSyncMessage = Record<string, unknown> & {
	GameVar?: Record<string, IRuntimeVariableType>;
};

export enum DebugCommand {
	// 跳转
	JUMP,
	// 同步自客户端
	SYNCFC,
	// 同步自编辑器
	SYNCFE,
	// 执行指令
	EXE_COMMAND,
	// 重新拉取模板样式文件
	REFETCH_TEMPLATE_FILES
}

export interface IDebugMessage {
	event: string;
	data: {
		command: DebugCommand;
		sceneMsg: {
			sentence: number;
			scene: string;
		};
		message: string;
		stageSyncMsg: StageSyncMessage;
	};
}

export interface IVToken {
	word: string; // 名称
	position?: { line: number; character: number }; // 位置
	input?: string; // 原始文本
	value?: string; // 值
	desc?: string; // 描述
	isGlobal?: boolean; // 是否是全局
	isGetUserInput?: boolean; // 是否是获取输入
}

export interface IVChooseToken {
	options: {
		text: string; // 文本
		value: string; // 值 (xxx.txt | <Label Name>)
	}[];
	line: number; // 行号
}

type IMapValue = Record<string, IVToken[]>;

type IChooseMapValue = Record<number, IVChooseToken>; // 行号: 选择

/** 依赖项：表示当前场景文件引用了另一个场景文件 */
export interface IDepItem {
	fileName: string; // 依赖的场景文件名（如 "a.txt"）
	command: string; // 触发依赖的指令类型（callScene | changeScene | choose）
	position: { line: number; character: number }; // 指令在文件中的位置
	line: number; // 行号
}

// 全局映射表
export interface IDefinetionMap {
	label: IMapValue;
	setVar: IMapValue;
	choose: IChooseMapValue;
	deps: IDepItem[]; // 当前文件引用的所有场景依赖
}

// debugger
export interface FileAccessor {
	isWindows: boolean;
	readFile(path: string): Promise<Uint8Array>;
	writeFile(path: string, contents: Uint8Array): Promise<void>;
}

/**
 * 目录条目类型
 */
export type DirectoryEntry = {
	name: string;
	isDirectory: boolean;
};

/**
 * 状态映射条目
 */
export interface StateMap {
	key: string; // 键名
	description: string; // 描述
	type?: {
		key: string; // 类型
		description: string; // 描述
	}; // 类型
	value?: StateMap | Record<string, StateMap> | string; // 值
	__WG$key?: string; // 父级键名
	__WG$description?: string; // 父级描述
}
