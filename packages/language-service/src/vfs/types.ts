import type { FileSystem } from "@volar/language-service";
import type { URI } from "vscode-uri";

/**
 * 目录条目类型
 * 表示目录中的一个条目
 */
export type DirectoryEntry = {
	/** 条目名称 */
	name: string;
	/** 是否为目录 */
	isDirectory: boolean;
};

/**
 * 虚拟文件条目类型
 * 表示虚拟文件系统中的一个文件
 */
export type VirtualFileEntry = {
	/** 条目类型标识 */
	type: "file";
	/** 文件内容 */
	content: string;
};

/**
 * 虚拟目录条目类型
 * 表示虚拟文件系统中的一个目录
 */
export type VirtualDirectoryEntry = {
	/** 条目类型标识 */
	type: "dir";
	/** 子条目映射，键为名称，值为虚拟条目 */
	children: Record<string, VirtualEntry>;
};

/**
 * 虚拟文件系统条目类型
 * 可以是文件或目录
 */
export type VirtualEntry = VirtualFileEntry | VirtualDirectoryEntry;

/**
 * 可能是Promise的类型
 * 表示一个值或Promise包装的值
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * 虚拟文件系统变更类型
 * 表示虚拟文件系统中的各种变更操作
 */
export type VirtualFileSystemChange =
	| { type: "writeFile"; path: string; content: string }
	| { type: "deletePath"; path: string }
	| { type: "mkdir"; path: string }
	| { type: "rename"; from: string; to: string }
	| { type: "setTree"; tree: VirtualEntry };

/**
 * 虚拟文件系统变更监听器类型
 * 当文件系统发生变更时被调用
 */
export type VirtualFileSystemChangeListener = (
	/** 变更事件数组 */
	changes: VirtualFileSystemChange[]
) => void;

/**
 * 虚拟文件系统接口
 * 定义了虚拟文件系统的所有操作方法
 */
export type VirtualFileSystem = {
	/** 根目录路径 */
	root: string;
	/** 获取当前工作目录 */
	currentDirectory: () => string | null;
	/** 拼接路径 */
	join: (...parts: string[]) => string;
	/** 获取文件或目录状态 */
	stat: (
		path: string
	) => Promise<{ isFile: boolean; isDirectory: boolean } | null>;
	/** 读取目录内容 */
	readDirectory: (path: string) => Promise<DirectoryEntry[] | null>;
	/** 读取文件内容 */
	readFile: (path: string) => Promise<string | null>;
	/** 查找文件 */
	findFile: (startPath: string, targetName: string) => Promise<string | null>;
	/** 获取资源目录 */
	getResourceDirectory: (urls: string[]) => Promise<DirectoryEntry[] | null>;
	/** 获取所有场景文本 */
	getAllTextWithScene: () => Promise<Record<
		string,
		{ path: string; name: string; text: string; fullPath: string }
	> | null>;
	/** 获取文件树 */
	getTree: () => VirtualEntry;
	/** 设置文件树 */
	setTree: (tree: VirtualEntry) => void;
	/** 写入文件 */
	writeFile: (path: string, content: string) => Promise<void>;
	/** 删除路径 */
	deletePath: (path: string) => Promise<void>;
	/** 创建目录 */
	mkdir: (path: string) => Promise<void>;
	/** 重命名文件或目录 */
	rename: (from: string, to: string) => Promise<void>;
	/** 应用变更 */
	applyChanges: (changes: VirtualFileSystemChange[]) => Promise<void>;
	/** 注册变更监听器，返回取消监听的函数 */
	onDidChange: (listener: VirtualFileSystemChangeListener) => () => void;
};

/**
 * WebGAL客户端处理器类型
 * 定义了语言服务器可以调用的各种客户端方法
 */
export type WebgalClientHandlers = {
	/** 刷新文档链接 */
	"workspace/documentLink/refresh": () => MaybePromise<unknown>;
	/** 显示提示信息 */
	"client/showTip": (message: string) => MaybePromise<unknown>;
	/** 获取当前目录 */
	"client/currentDirectory": () => MaybePromise<string | null>;
	/** 拼接路径 */
	"client/FJoin": (args: string | string[]) => MaybePromise<string | null>;
	/** 获取文件状态 */
	"client/FStat": (path: string) => MaybePromise<unknown>;
	/** 查找文件 */
	"client/findFile": (args: [string, string]) => MaybePromise<string | null>;
	/** 跳转到属性文档 */
	"client/goPropertyDoc": (pathSegments: string[]) => MaybePromise<unknown>;
	/** 读取目录 */
	"client/readDirectory": (uriString: string) => MaybePromise<unknown>;
	/** 获取所有场景文本 */
	"client/getAllTextWithScene": () => MaybePromise<unknown>;
	/** 获取资源目录 */
	"client/getResourceDirectory": (urls: string[]) => MaybePromise<unknown>;
	/** 获取VFS文件树 */
	"client/vfs/getTree": () => MaybePromise<VirtualEntry>;
	/** 设置VFS文件树 */
	"client/vfs/setTree": (tree: VirtualEntry) => MaybePromise<unknown>;
	/** 读取VFS文件 */
	"client/vfs/readFile": (path: string) => MaybePromise<string | null>;
	/** 写入VFS文件 */
	"client/vfs/writeFile": (args: {
		path: string;
		content: string;
	}) => MaybePromise<unknown>;
	/** 删除VFS路径 */
	"client/vfs/deletePath": (path: string) => MaybePromise<unknown>;
	/** 创建VFS目录 */
	"client/vfs/mkdir": (path: string) => MaybePromise<unknown>;
	/** 重命名VFS文件或目录 */
	"client/vfs/rename": (args: {
		from: string;
		to: string;
	}) => MaybePromise<unknown>;
	/** 应用VFS变更 */
	"client/vfs/applyChanges": (
		changes: VirtualFileSystemChange[]
	) => MaybePromise<unknown>;
};

/**
 * 语言客户端接口类型
 * 定义了语言客户端的基本方法
 */
export type LanguageClientLike = {
	/** 注册请求处理器 */
	onRequest: (method: string, handler: (...args: any[]) => unknown) => void;
};

/**
 * 创建WebGAL客户端处理器的配置选项
 */
export type CreateWebgalClientHandlersOptions = {
	/** 虚拟文件系统实例 */
	vfs: VirtualFileSystem;
	/** 显示提示的回调函数 */
	showTip?: (message: string) => unknown;
	/** 跳转到属性文档的回调函数 */
	goPropertyDoc?: (pathSegments: string[]) => unknown;
	/** 覆盖默认的处理器 */
	overrides?: Partial<WebgalClientHandlers>;
};

/**
 * Volar可写文件系统接口
 * 扩展了Volar的FileSystem接口，添加了写操作和变更监听功能
 */
export interface VolarWritableFileSystem extends FileSystem {
	/** 写入文件 */
	writeFile(uri: URI, content: string): Promise<void>;
	/** 创建目录 */
	mkdir(uri: URI): Promise<void>;
	/** 删除文件或目录 */
	delete(uri: URI): Promise<void>;
	/** 重命名文件或目录 */
	rename(oldUri: URI, newUri: URI): Promise<void>;
	/** 获取文件树 */
	getTree(): VirtualEntry;
	/** 设置文件树 */
	setTree(tree: VirtualEntry): void;
	/** 注册变更监听器，返回取消监听的函数 */
	onDidChange(listener: VirtualFileSystemChangeListener): () => void;
	/** 根目录路径 */
	root: string;
}
