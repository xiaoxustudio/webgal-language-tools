import { toVfsPath, uriToPath } from "./vfs/utils";
import type {
	CreateWebgalClientHandlersOptions,
	LanguageClientLike,
	VirtualFileSystemChange,
	WebgalClientHandlers
} from "./vfs/types";
import { getState } from "./utils";

/**
 * 创建Webgal客户端处理器
 *
 * @param options - 创建处理器的配置选项
 * @returns 返回一个包含各种客户端处理器方法的对象
 */
export function createWebgalClientHandlers(
	options: CreateWebgalClientHandlersOptions
): WebgalClientHandlers {
	const normalizeChange = (
		change: VirtualFileSystemChange
	): VirtualFileSystemChange => {
		if (change.type === "writeFile") {
			return {
				type: "writeFile",
				path: toVfsPath(change.path),
				content: change.content
			};
		}
		if (change.type === "deletePath") {
			return { type: "deletePath", path: toVfsPath(change.path) };
		}
		if (change.type === "mkdir") {
			return { type: "mkdir", path: toVfsPath(change.path) };
		}
		if (change.type === "rename") {
			return {
				type: "rename",
				from: toVfsPath(change.from),
				to: toVfsPath(change.to)
			};
		}
		return change;
	};
	const baseHandlers: WebgalClientHandlers = {
		"workspace/documentLink/refresh": () => null,
		"client/showTip": options.showTip ?? (() => null),
		"client/currentDirectory": () => options.vfs.currentDirectory(),
		"client/FJoin": (args) =>
			options.vfs.join(...(Array.isArray(args) ? args : [args])),
		"client/FStat": (path) => options.vfs.stat(toVfsPath(path)),
		"client/findFile": ([startPath, targetName]) =>
			options.vfs.findFile(toVfsPath(startPath), targetName),
		"client/goPropertyDoc":
			options.goPropertyDoc ?? ((path: string[]) => getState(path)),
		"client/readDirectory": (uriString) =>
			options.vfs.readDirectory(uriToPath(uriString)),
		"client/getAllTextWithScene": () => options.vfs.getAllTextWithScene(),
		"client/getResourceDirectory": (urls) =>
			options.vfs.getResourceDirectory(urls),
		"client/vfs/getTree": () => options.vfs.getTree(),
		"client/vfs/setTree": (tree) => options.vfs.setTree(tree),
		"client/vfs/readFile": (path) => options.vfs.readFile(toVfsPath(path)),
		"client/vfs/writeFile": ({ path, content }) =>
			options.vfs.writeFile(toVfsPath(path), content),
		"client/vfs/deletePath": (path) =>
			options.vfs.deletePath(toVfsPath(path)),
		"client/vfs/mkdir": (path) => options.vfs.mkdir(toVfsPath(path)),
		"client/vfs/rename": ({ from, to }) =>
			options.vfs.rename(toVfsPath(from), toVfsPath(to)),
		"client/vfs/applyChanges": (changes) =>
			options.vfs.applyChanges(changes.map(normalizeChange))
	};
	return {
		...baseHandlers,
		...(options.overrides ?? {})
	};
}

/**
 * 注册WebGal客户端处理器
 *
 * @param client - 语言客户端实例，实现了LanguageClientLike接口
 * @param handlers - WebGal客户端处理器的可选映射对象，包含要注册的各种处理器方法
 */
export function registerWebgalClientHandlers(
	client: LanguageClientLike,
	handlers: Partial<WebgalClientHandlers>
) {
	for (const [method, handler] of Object.entries(handlers)) {
		client.onRequest(method, handler as never);
	}
}
