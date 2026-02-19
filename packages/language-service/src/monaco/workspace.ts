import * as monaco from "monaco-editor";
import {
	joinPaths,
	normalizePath,
	pathToUri,
	uriToPath,
	VirtualFileSystem
} from "@/vfs";

export type WebgalMonacoWorkspace = {
	/**
	 * 将文件路径转换为文件URI
	 * @param value - 输入的文件路径字符串
	 * @returns 转换后的文件URI字符串，如果转换失败则返回null
	 */
	toFileUri: (value: string) => string | null;

	/**
	 * 获取用于显示的路径格式
	 * @param path - 原始文件路径
	 * @returns 格式化后的显示路径字符串
	 */
	getDisplayPath: (path: string) => string;

	/**
	 * 根据文件路径获取对应的编程语言类型
	 * @param path - 文件路径
	 * @returns 语言标识符字符串（如 'javascript', 'typescript' 等）
	 */
	getLanguageFromPath: (path: string) => string;

	/**
	 * 获取当前激活的文件路径
	 * @returns 当前激活的文件路径，如果没有激活的文件则返回null
	 */
	getActivePath: () => string | null;

	/**
	 * 设置当前激活的文件路径
	 * @param path - 要设置为激活状态的文件路径，传入null表示取消激活状态
	 */
	setActivePath: (path: string | null) => void;

	/**
	 * 设置工作区根目录路径
	 * @param rootPath - 工作区根目录路径
	 */
	setRootPath: (rootPath: string) => void;

	/**
	 * 打开指定路径的文件
	 * @param path - 要打开的文件路径
	 * @returns Promise<boolean> - 打开操作是否成功的布尔值
	 */
	openFile: (path: string) => Promise<boolean>;

	/**
	 * 释放工作区资源，执行清理操作
	 */
	dispose: () => void;

	/**
	 * 注册激活路径变化监听器
	 * @param listener - 当激活路径变化时调用的回调函数
	 * @returns 取消注册函数，调用时会移除该监听器
	 */
	onActivePathChange: (listener: (path: string | null) => void) => () => void;
};

export type CreateWebgalMonacoWorkspaceOptions = {
	editor: monaco.editor.IStandaloneCodeEditor;
	vfs: VirtualFileSystem;
	rootPath?: string;
	getLanguageFromPath?: (path: string) => string;
	onActivePathChange?: (path: string | null) => void;
};

/**
 * 规范化根URI，将输入的路径或文件URI转换为标准的URI格式
 *
 * @param value - 输入的路径字符串，可以是普通路径或file URI
 * @returns 标准化的URI字符串
 */
export const normalizeRootUri = (value: string) => {
	if (value.startsWith("file://")) {
		return pathToUri(uriToPath(value)).toString();
	}
	return pathToUri(value).toString();
};

/**
 * 创建一个Webgal Monaco工作区实例
 *
 * @param options - 创建工作区所需的配置选项
 * @returns 返回一个包含各种操作方法的WebgalMonacoWorkspace对象
 */
export const createWebgalMonacoWorkspace = (
	options: CreateWebgalMonacoWorkspaceOptions
): WebgalMonacoWorkspace => {
	const { editor, vfs } = options;
	const getLanguageFromPath =
		options.getLanguageFromPath ??
		((path: string) =>
			path.toLowerCase().endsWith("config.txt")
				? "webgal-config"
				: "webgal");
	let rootPath = normalizeRootUri(options.rootPath ?? vfs.root);
	let rootPathForJoin = normalizePath(
		rootPath.startsWith("file://") ? uriToPath(rootPath) : rootPath
	);
	let activePath: string | null = null;
	let skipWrite = false;
	const activePathListeners = new Set<(path: string | null) => void>();
	if (options.onActivePathChange) {
		activePathListeners.add(options.onActivePathChange);
	}

	const toFileUri = (value: string) => {
		const trimmed = value.trim();
		if (!trimmed) {
			return null;
		}
		if (trimmed.startsWith("file://")) {
			return pathToUri(uriToPath(trimmed)).toString();
		}
		if (trimmed.startsWith("/")) {
			return pathToUri(normalizePath(trimmed)).toString();
		}
		const joined = joinPaths(rootPathForJoin, trimmed);
		return pathToUri(joined).toString();
	};

	const getDisplayPath = (path: string) => {
		const normalizedPath = normalizePath(
			path.startsWith("file://") ? uriToPath(path) : path
		);
		if (normalizedPath === rootPathForJoin) {
			return "";
		}
		if (normalizedPath.startsWith(`${rootPathForJoin}/`)) {
			return normalizedPath.slice(rootPathForJoin.length + 1);
		}
		return normalizedPath;
	};

	const openFile = async (path: string) => {
		const normalizedPath = toFileUri(path);
		if (!normalizedPath) {
			return false;
		}
		const content = await vfs.readFile(normalizedPath);
		if (content === null) {
			return false;
		}
		const uri = monaco.Uri.parse(normalizedPath);
		let model = monaco.editor.getModel(uri);
		if (!model) {
			model = monaco.editor.createModel(
				content,
				getLanguageFromPath(normalizedPath),
				uri
			);
		} else {
			model.setValue(content);
		}
		skipWrite = true;
		editor.setModel(model);
		skipWrite = false;
		activePath = normalizedPath;
		activePathListeners.forEach((listener) => listener(activePath));
		return true;
	};

	const parseFragment = (fragment: string) => {
		const trimmed = fragment.trim();
		if (!trimmed) {
			return null;
		}
		if (trimmed.includes("=")) {
			const params = new URLSearchParams(trimmed);
			const lineValue = params.get("line") ?? params.get("L");
			const columnValue =
				params.get("column") ?? params.get("col") ?? params.get("C");
			const lineNumber = lineValue ? Number(lineValue) : NaN;
			const column = columnValue ? Number(columnValue) : NaN;
			if (!Number.isNaN(lineNumber) && lineNumber > 0) {
				return {
					lineNumber,
					column: Number.isNaN(column) ? undefined : column
				};
			}
		}
		const match = trimmed.match(/^L?(\d+)(?:[,.:](\d+))?$/i);
		if (!match) {
			return null;
		}
		const lineNumber = Number(match[1]);
		const column = match[2] ? Number(match[2]) : undefined;
		if (Number.isNaN(lineNumber) || lineNumber <= 0) {
			return null;
		}
		return { lineNumber, column };
	};

	const openExternalLink = (uri: monaco.Uri) => {
		const scheme = uri.scheme.toLowerCase();
		if (scheme !== "http" && scheme !== "https") {
			return false;
		}
		if (typeof window === "undefined" || !window.open) {
			return false;
		}
		window.open(uri.toString(), "_blank", "noopener,noreferrer");
		return true;
	};

	const linkOpener = monaco.editor.registerLinkOpener({
		open: async (resource) => {
			const scheme = resource.scheme.toLowerCase();
			if (scheme === "http" || scheme === "https") {
				return openExternalLink(resource);
			}
			if (scheme !== "file") {
				return false;
			}
			const target = resource.with({ fragment: "" }).toString();
			const opened = await openFile(target);
			if (!opened) {
				return false;
			}
			const location = parseFragment(resource.fragment);
			if (location) {
				const position = {
					lineNumber: location.lineNumber,
					column: location.column ?? 1
				};
				editor.setPosition(position);
				editor.revealPositionInCenter(position);
				editor.focus();
			}
			return true;
		}
	});

	const changeListener = editor.onDidChangeModelContent(() => {
		if (skipWrite) {
			return;
		}
		if (!activePath) {
			return;
		}
		vfs.writeFile(activePath, editor.getValue());
	});

	return {
		toFileUri,
		getDisplayPath,
		getLanguageFromPath,
		getActivePath: () => activePath,
		setActivePath: (path: string | null) => {
			activePath = path;
			activePathListeners.forEach((listener) => listener(activePath));
		},
		onActivePathChange: (listener) => {
			activePathListeners.add(listener);
			return () => {
				activePathListeners.delete(listener);
			};
		},
		setRootPath: (nextRootPath: string) => {
			rootPath = normalizeRootUri(nextRootPath);
			rootPathForJoin = normalizePath(
				rootPath.startsWith("file://") ? uriToPath(rootPath) : rootPath
			);
		},
		openFile,
		dispose: () => {
			linkOpener.dispose();
			changeListener.dispose();
			activePathListeners.clear();
		}
	};
};
