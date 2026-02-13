import { FileSystem, FileType } from "@volar/language-service";
import { URI } from "vscode-uri";

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

const uriToPath = (value: string | URI) => {
	const uriString = typeof value === "string" ? value : value.toString();
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

const pathToUri = (path: string) => {
	if (path.startsWith("file://")) {
		return URI.parse(path);
	}
	if (/^[a-zA-Z]:[\\/]/.test(path)) {
		return URI.file(path);
	}
	if (path.startsWith("/")) {
		return URI.file(path);
	}
	return URI.parse(path);
};

const toVfsPath = (value: string) =>
	value.startsWith("file://") ? uriToPath(value) : value;

export interface VolarWritableFileSystem extends FileSystem {
	writeFile(uri: URI, content: string): Promise<void>;
	mkdir(uri: URI): Promise<void>;
	delete(uri: URI): Promise<void>;
	rename(oldUri: URI, newUri: URI): Promise<void>;
	getTree(): VirtualEntry;
	setTree(tree: VirtualEntry): void;
	onDidChange(listener: VirtualFileSystemChangeListener): () => void;
	root: string;
}

export function createMemoryVolarFileSystem(options?: {
	root?: string;
	tree?: VirtualEntry;
}): VolarWritableFileSystem {
	const root = normalizePath(toVfsPath(options?.root ?? "/"));
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

	return {
		root,
		async stat(uri) {
			const path = uriToPath(uri);
			const entry = getEntry(path);
			if (!entry) {
				return undefined;
			}
			return {
				type:
					entry.type === "file" ? FileType.File : FileType.Directory,
				ctime: 0,
				mtime: 0,
				size: entry.type === "file" ? entry.content.length : 0
			};
		},
		async readFile(uri) {
			const path = uriToPath(uri);
			const entry = getEntry(path);
			if (!entry || entry.type !== "file") {
				return undefined;
			}
			return entry.content;
		},
		async readDirectory(uri) {
			const path = uriToPath(uri);
			const entry = getEntry(path);
			if (!entry || entry.type !== "dir") {
				return [];
			}
			return Object.entries(entry.children).map(([name, child]) => [
				name,
				child.type === "dir" ? FileType.Directory : FileType.File
			]);
		},
		async writeFile(uri, content) {
			const path = uriToPath(uri);
			const segments = resolveToSegments(path);
			if (segments.length === 0) {
				return;
			}
			const fileName = segments[segments.length - 1]!;
			const parent = ensureDirectoryEntry(segments.slice(0, -1));
			parent.children[fileName] = { type: "file", content };
			emit([{ type: "writeFile", path: normalizePath(path), content }]);
		},
		async mkdir(uri) {
			const path = uriToPath(uri);
			const segments = resolveToSegments(path);
			ensureDirectoryEntry(segments);
			emit([{ type: "mkdir", path: normalizePath(path) }]);
		},
		async delete(uri) {
			const path = uriToPath(uri);
			const segments = resolveToSegments(path);
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
			emit([{ type: "deletePath", path: normalizePath(path) }]);
		},
		async rename(oldUri, newUri) {
			const from = uriToPath(oldUri);
			const to = uriToPath(newUri);
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
				{
					type: "rename",
					from: normalizePath(from),
					to: normalizePath(to)
				}
			]);
		},
		getTree: () => rootEntry,
		setTree: (tree) => {
			rootEntry =
				tree.type === "dir"
					? tree
					: {
							type: "dir",
							children: {} as Record<string, VirtualEntry>
						};
			emit([{ type: "setTree", tree: rootEntry }]);
		},
		onDidChange: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}
	};
}

export function createVirtualFileSystem(
	fs: VolarWritableFileSystem
): VirtualFileSystem {
	const root = fs.root;
	return {
		root,
		currentDirectory: () => root,
		join: (...parts: string[]) => joinPaths(...parts),
		stat: async (path) => {
			const stat = await fs.stat(pathToUri(path));
			if (!stat) {
				return null;
			}
			return {
				isFile: stat.type === FileType.File,
				isDirectory: stat.type === FileType.Directory
			};
		},
		readDirectory: async (path) => {
			const entries = await fs.readDirectory(pathToUri(path));
			return entries.map(([name, type]) => ({
				name,
				isDirectory: type === FileType.Directory
			}));
		},
		readFile: async (path) => {
			const content = await fs.readFile(pathToUri(path));
			return content ?? null;
		},
		findFile: async (startPath, targetName) => {
			const stack = [startPath];
			while (stack.length > 0) {
				const currentPath = stack.pop()!;
				const entries = await fs.readDirectory(pathToUri(currentPath));
				for (const [name, type] of entries) {
					const fullPath = joinPaths(currentPath, name);
					if (type === FileType.File && name === targetName) {
						return fullPath;
					}
					if (type === FileType.Directory) {
						stack.push(fullPath);
					}
				}
			}
			return null;
		},
		getResourceDirectory: async (urls) => {
			const target = joinPaths(root, ...urls);
			const entries = await fs.readDirectory(pathToUri(target));
			return entries.map(([name, type]) => ({
				name,
				isDirectory: type === FileType.Directory
			}));
		},
		getAllTextWithScene: async () => {
			const scenePath = joinPaths(root, "scene");
			const entries = await fs.readDirectory(pathToUri(scenePath));
			const map: Record<
				string,
				{ path: string; name: string; text: string; fullPath: string }
			> = {};
			for (const [name, type] of entries) {
				if (type === FileType.File && name.endsWith(".txt")) {
					const fullPath = joinPaths(scenePath, name);
					const content = await fs.readFile(pathToUri(fullPath));
					if (content !== undefined) {
						map[name] = {
							path: fullPath,
							name,
							text: content,
							fullPath
						};
					}
				}
			}
			return map;
		},
		getTree: () => fs.getTree(),
		setTree: (tree) => fs.setTree(tree),
		writeFile: async (path, content) => {
			await fs.writeFile(pathToUri(path), content);
		},
		deletePath: async (path) => {
			await fs.delete(pathToUri(path));
		},
		mkdir: async (path) => {
			await fs.mkdir(pathToUri(path));
		},
		rename: async (from, to) => {
			await fs.rename(pathToUri(from), pathToUri(to));
		},
		applyChanges: async (changes) => {
			for (const change of changes) {
				if (change.type === "writeFile") {
					await fs.writeFile(pathToUri(change.path), change.content);
				} else if (change.type === "deletePath") {
					await fs.delete(pathToUri(change.path));
				} else if (change.type === "mkdir") {
					await fs.mkdir(pathToUri(change.path));
				} else if (change.type === "rename") {
					await fs.rename(
						pathToUri(change.from),
						pathToUri(change.to)
					);
				} else if (change.type === "setTree") {
					fs.setTree(change.tree);
				}
			}
		},
		onDidChange: (listener) => fs.onDidChange(listener)
	};
}

export function createMemoryFileSystem(options?: {
	root?: string;
	tree?: VirtualEntry;
}): VirtualFileSystem {
	const fs = createMemoryVolarFileSystem(options);
	return createVirtualFileSystem(fs);
}

export function createVolarFileSystem(
	vfs: VirtualFileSystem,
	options?: {
		uriToPath?: (uri: URI) => string;
	}
): FileSystem {
	const uriToPathImpl = options?.uriToPath ?? ((uri: URI) => uriToPath(uri));

	return {
		stat: async (uri) => {
			const path = uriToPathImpl(uri);
			const stat = await vfs.stat(path);
			if (!stat) {
				return undefined;
			}
			return {
				type: stat.isFile ? FileType.File : FileType.Directory,
				ctime: 0,
				mtime: 0,
				size: 0
			};
		},
		readFile: async (uri) => {
			const path = uriToPathImpl(uri);
			const content = await vfs.readFile(path);
			return content ?? undefined;
		},
		readDirectory: async (uri) => {
			const path = uriToPathImpl(uri);
			const entries = await vfs.readDirectory(path);
			if (!entries) {
				return [];
			}
			return entries.map((entry) => [
				entry.name,
				entry.isDirectory ? FileType.Directory : FileType.File
			]);
		}
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
