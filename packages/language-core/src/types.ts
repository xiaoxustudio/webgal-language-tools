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

// 全局映射表
export interface IDefinetionMap {
	label: IMapValue;
	setVar: IMapValue;
	choose: IChooseMapValue;
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
	key: string;
	description: string;
	type?: {
		key: string;
		description: string;
	};
	value?: StateMap | Record<string, StateMap> | string;
	__WG$key?: string;
	__WG$description?: string;
}
