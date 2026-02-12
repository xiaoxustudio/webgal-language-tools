export type DirectoryEntry = {
	name: string;
	isDirectory: boolean;
};

export type VirtualFileEntry = {
	type: "file";
	content: string;
};

export type VirtualDirectoryEntry = {
	type: "dir";
	children: Record<string, VirtualEntry>;
};

export type VirtualEntry = VirtualFileEntry | VirtualDirectoryEntry;

export type MaybePromise<T> = T | Promise<T>;

export type VirtualFileSystemChange =
	| { type: "writeFile"; path: string; content: string }
	| { type: "deletePath"; path: string }
	| { type: "mkdir"; path: string }
	| { type: "rename"; from: string; to: string }
	| { type: "setTree"; tree: VirtualEntry };

export type VirtualFileSystemChangeListener = (
	changes: VirtualFileSystemChange[]
) => void;

export type VirtualFileSystem = {
	root: string;
	currentDirectory: () => string | null;
	join: (...parts: string[]) => string;
	stat: (
		path: string
	) => Promise<{ isFile: boolean; isDirectory: boolean } | null>;
	readDirectory: (path: string) => Promise<DirectoryEntry[] | null>;
	readFile: (path: string) => Promise<string | null>;
	findFile: (startPath: string, targetName: string) => Promise<string | null>;
	getResourceDirectory: (urls: string[]) => Promise<DirectoryEntry[] | null>;
	getAllTextWithScene: () => Promise<Record<
		string,
		{ path: string; name: string; text: string; fullPath: string }
	> | null>;
	getTree: () => VirtualEntry;
	setTree: (tree: VirtualEntry) => void;
	writeFile: (path: string, content: string) => Promise<void>;
	deletePath: (path: string) => Promise<void>;
	mkdir: (path: string) => Promise<void>;
	rename: (from: string, to: string) => Promise<void>;
	applyChanges: (changes: VirtualFileSystemChange[]) => Promise<void>;
	onDidChange: (listener: VirtualFileSystemChangeListener) => () => void;
};

export type WebgalClientHandlers = {
	"client/showTip": (message: string) => MaybePromise<unknown>;
	"client/currentDirectory": () => MaybePromise<string | null>;
	"client/FJoin": (args: string | string[]) => MaybePromise<string | null>;
	"client/FStat": (path: string) => MaybePromise<unknown>;
	"client/findFile": (args: [string, string]) => MaybePromise<string | null>;
	"client/goPropertyDoc": (pathSegments: string[]) => MaybePromise<unknown>;
	"client/readDirectory": (uriString: string) => MaybePromise<unknown>;
	"client/getAllTextWithScene": () => MaybePromise<unknown>;
	"client/getResourceDirectory": (urls: string[]) => MaybePromise<unknown>;
	"client/vfs/getTree": () => MaybePromise<VirtualEntry>;
	"client/vfs/setTree": (tree: VirtualEntry) => MaybePromise<unknown>;
	"client/vfs/readFile": (path: string) => MaybePromise<string | null>;
	"client/vfs/writeFile": (args: {
		path: string;
		content: string;
	}) => MaybePromise<unknown>;
	"client/vfs/deletePath": (path: string) => MaybePromise<unknown>;
	"client/vfs/mkdir": (path: string) => MaybePromise<unknown>;
	"client/vfs/rename": (args: {
		from: string;
		to: string;
	}) => MaybePromise<unknown>;
	"client/vfs/applyChanges": (
		changes: VirtualFileSystemChange[]
	) => MaybePromise<unknown>;
};

export type LanguageClientLike = {
	onRequest: (method: string, handler: (...args: any[]) => unknown) => void;
};

export type CreateWebgalClientHandlersOptions = {
	vfs: VirtualFileSystem;
	showTip?: (message: string) => unknown;
	goPropertyDoc?: (pathSegments: string[]) => unknown;
	overrides?: Partial<WebgalClientHandlers>;
};

const normalizePath = (input: string) => {
	let path = input.replace(/\\/g, "/").replace(/\/+/g, "/");
	if (path === "") {
		return "/";
	}
	if (!path.startsWith("/")) {
		path = "/" + path;
	}
	if (path.length > 1 && path.endsWith("/")) {
		path = path.slice(0, -1);
	}
	return path;
};

const joinPaths = (...parts: string[]) => {
	const joined = parts.filter((part) => part && part !== "/").join("/");
	return normalizePath(joined);
};

const uriToPath = (uriString: string) => {
	if (uriString.startsWith("file://")) {
		const stripped = uriString.replace(/^file:\/*/i, "/");
		const decoded = decodeURIComponent(stripped).replace(/\\/g, "/");
		if (/^\/[a-zA-Z]:\//.test(decoded)) {
			return decoded.slice(1);
		}
		return normalizePath(decoded);
	}
	return normalizePath(uriString);
};

const toVfsPath = (value: string) =>
	value.startsWith("file://") ? uriToPath(value) : value;

export function createMemoryFileSystem(options?: {
	root?: string;
	tree?: VirtualEntry;
}): VirtualFileSystem {
	const root = normalizePath(options?.root ?? "/");
	let rootEntry: VirtualDirectoryEntry =
		options?.tree && options.tree.type === "dir"
			? options.tree
			: { type: "dir", children: {} as Record<string, VirtualEntry> };

	const listeners = new Set<VirtualFileSystemChangeListener>();
	const emit = (changes: VirtualFileSystemChange[]) => {
		for (const listener of listeners) {
			listener(changes);
		}
	};

	const resolveToSegments = (path: string) => {
		let resolved = normalizePath(path);
		if (root !== "/" && resolved.startsWith(root)) {
			resolved = resolved.slice(root.length);
		}
		if (resolved.startsWith("/")) {
			resolved = resolved.slice(1);
		}
		return resolved ? resolved.split("/") : [];
	};

	const ensureDirectoryEntry = (segments: string[]) => {
		let current: VirtualEntry = rootEntry;
		for (const segment of segments) {
			if (current.type !== "dir") {
				throw new Error("Path segment is not a directory");
			}
			const directory = current as VirtualDirectoryEntry;
			const existing = directory.children[segment];
			if (!existing) {
				const created: VirtualDirectoryEntry = {
					type: "dir",
					children: {}
				};
				directory.children[segment] = created;
				current = created;
				continue;
			}
			if (existing.type !== "dir") {
				throw new Error("Path segment is not a directory");
			}
			current = existing;
		}
		if (current.type !== "dir") {
			throw new Error("Path is not a directory");
		}
		return current;
	};

	const getEntry = (path: string): VirtualEntry | null => {
		const segments = resolveToSegments(path);

		let current: VirtualEntry = rootEntry;
		for (const segment of segments) {
			if (current.type !== "dir") {
				return null;
			}
			const directory = current as VirtualDirectoryEntry;
			const next: VirtualEntry | undefined = directory.children[segment];
			if (!next) {
				return null;
			}
			current = next;
		}
		return current;
	};

	const readDirectory = async (path: string) => {
		const entry = getEntry(path);
		if (!entry || entry.type !== "dir") {
			return null;
		}
		return Object.entries(entry.children).map(([name, child]) => ({
			name,
			isDirectory: child.type === "dir"
		}));
	};

	const readFile = async (path: string) => {
		const entry = getEntry(path);
		if (!entry || entry.type !== "file") {
			return null;
		}
		return entry.content;
	};

	const stat = async (path: string) => {
		const entry = getEntry(path);
		if (!entry) {
			return null;
		}
		return {
			isFile: entry.type === "file",
			isDirectory: entry.type === "dir"
		};
	};

	const findFile = async (startPath: string, targetName: string) => {
		const startEntry = getEntry(startPath);
		if (!startEntry || startEntry.type !== "dir") {
			return null;
		}
		const stack: Array<{ path: string; entry: VirtualEntry }> = [
			{ path: normalizePath(startPath), entry: startEntry }
		];
		while (stack.length) {
			const current = stack.pop();
			if (!current) {
				break;
			}
			if (current.entry.type === "dir") {
				for (const [name, child] of Object.entries(
					current.entry.children
				)) {
					const nextPath = joinPaths(current.path, name);
					if (child.type === "file" && name === targetName) {
						return nextPath;
					}
					if (child.type === "dir") {
						stack.push({ path: nextPath, entry: child });
					}
				}
			}
		}
		return null;
	};

	const getResourceDirectory = async (urls: string[]) => {
		const target = joinPaths(root, ...urls);
		return readDirectory(target);
	};

	const getAllTextWithScene = async () => {
		const scenePath = joinPaths(root, "scene");
		const sceneEntry = getEntry(scenePath);
		if (!sceneEntry || sceneEntry.type !== "dir") {
			return null;
		}
		const map: Record<
			string,
			{ path: string; name: string; text: string; fullPath: string }
		> = {};
		for (const [name, child] of Object.entries(sceneEntry.children)) {
			if (child.type === "file" && name.endsWith(".txt")) {
				const fullPath = joinPaths(scenePath, name);
				map[name] = {
					path: fullPath,
					name,
					text: child.content,
					fullPath
				};
			}
		}
		return map;
	};

	const getTree = () => rootEntry;
	const setTree = (tree: VirtualEntry) => {
		rootEntry =
			tree.type === "dir"
				? tree
				: { type: "dir", children: {} as Record<string, VirtualEntry> };
		emit([{ type: "setTree", tree: rootEntry }]);
	};

	const writeFile = async (targetPath: string, content: string) => {
		const segments = resolveToSegments(targetPath);
		if (segments.length === 0) {
			return;
		}
		const fileName = segments[segments.length - 1]!;
		const parent = ensureDirectoryEntry(segments.slice(0, -1));
		parent.children[fileName] = { type: "file", content };
		emit([{ type: "writeFile", path: normalizePath(targetPath), content }]);
	};

	const mkdir = async (targetPath: string) => {
		const segments = resolveToSegments(targetPath);
		ensureDirectoryEntry(segments);
		emit([{ type: "mkdir", path: normalizePath(targetPath) }]);
	};

	const deletePath = async (targetPath: string) => {
		const segments = resolveToSegments(targetPath);
		if (segments.length === 0) {
			return;
		}
		const name = segments[segments.length - 1]!;
		const parentSegments = segments.slice(0, -1);
		const parentEntry =
			parentSegments.length === 0
				? rootEntry
				: (getEntry(
						joinPaths(root, ...parentSegments)
					) as VirtualEntry);
		if (!parentEntry || parentEntry.type !== "dir") {
			return;
		}
		delete parentEntry.children[name];
		emit([{ type: "deletePath", path: normalizePath(targetPath) }]);
	};

	const rename = async (from: string, to: string) => {
		const fromSegments = resolveToSegments(from);
		if (fromSegments.length === 0) {
			return;
		}
		const fromName = fromSegments[fromSegments.length - 1]!;
		const fromParentSegments = fromSegments.slice(0, -1);
		const fromParentEntry =
			fromParentSegments.length === 0
				? rootEntry
				: (getEntry(
						joinPaths(root, ...fromParentSegments)
					) as VirtualEntry);
		if (!fromParentEntry || fromParentEntry.type !== "dir") {
			return;
		}
		const entry = fromParentEntry.children[fromName];
		if (!entry) {
			return;
		}
		delete fromParentEntry.children[fromName];

		const toSegments = resolveToSegments(to);
		if (toSegments.length === 0) {
			return;
		}
		const toName = toSegments[toSegments.length - 1]!;
		const toParent = ensureDirectoryEntry(toSegments.slice(0, -1));
		toParent.children[toName] = entry;
		emit([
			{ type: "rename", from: normalizePath(from), to: normalizePath(to) }
		]);
	};

	const applyChanges = async (changes: VirtualFileSystemChange[]) => {
		for (const change of changes) {
			if (change.type === "writeFile") {
				await writeFile(change.path, change.content);
				continue;
			}
			if (change.type === "mkdir") {
				await mkdir(change.path);
				continue;
			}
			if (change.type === "deletePath") {
				await deletePath(change.path);
				continue;
			}
			if (change.type === "rename") {
				await rename(change.from, change.to);
				continue;
			}
			if (change.type === "setTree") {
				setTree(change.tree);
			}
		}
	};

	const onDidChange = (listener: VirtualFileSystemChangeListener) => {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	};

	return {
		root,
		currentDirectory: () => root,
		join: (...parts: string[]) => joinPaths(...parts),
		stat,
		readDirectory,
		readFile,
		findFile,
		getResourceDirectory,
		getAllTextWithScene,
		getTree,
		setTree,
		writeFile,
		deletePath,
		mkdir,
		rename,
		applyChanges,
		onDidChange
	};
}

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
		"client/showTip": options.showTip ?? (() => null),
		"client/currentDirectory": () => options.vfs.currentDirectory(),
		"client/FJoin": (args) =>
			options.vfs.join(...(Array.isArray(args) ? args : [args])),
		"client/FStat": (path) => options.vfs.stat(path),
		"client/findFile": ([startPath, targetName]) =>
			options.vfs.findFile(startPath, targetName),
		"client/goPropertyDoc": options.goPropertyDoc ?? (() => null),
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

export function registerWebgalClientHandlers(
	client: LanguageClientLike,
	handlers: Partial<WebgalClientHandlers>
) {
	for (const [method, handler] of Object.entries(handlers)) {
		client.onRequest(method, handler as never);
	}
}
