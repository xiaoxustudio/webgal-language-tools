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
	getAllTextWithScene: () => Promise<
		| Record<
				string,
				{ path: string; name: string; text: string; fullPath: string }
		  >
		| null
	>;
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
	if (path === "") {return "/";}
	if (!path.startsWith("/")) {path = "/" + path;}
	if (path.length > 1 && path.endsWith("/")) {path = path.slice(0, -1);}
	return path;
};

const joinPaths = (...parts: string[]) => {
	const joined = parts.filter((part) => part && part !== "/").join("/");
	return normalizePath(joined);
};

const uriToPath = (uriString: string) => {
	if (uriString.startsWith("file://")) {
		const stripped = uriString.replace(/^file:\/*/i, "/");
		return normalizePath(decodeURIComponent(stripped));
	}
	return normalizePath(uriString);
};

export function createMemoryFileSystem(options?: {
	root?: string;
	tree?: VirtualEntry;
}): VirtualFileSystem {
	const root = normalizePath(options?.root ?? "/");
	const rootEntry: VirtualDirectoryEntry =
		options?.tree && options.tree.type === "dir"
			? options.tree
			: { type: "dir", children: {} as Record<string, VirtualEntry> };

	const resolveToSegments = (path: string) => {
		let resolved = normalizePath(path);
		if (root !== "/" && resolved.startsWith(root)) {
			resolved = resolved.slice(root.length);
		}
		if (resolved.startsWith("/")) {resolved = resolved.slice(1);}
		return resolved ? resolved.split("/") : [];
	};

	const getEntry = (path: string): VirtualEntry | null => {
		const segments = resolveToSegments(path);
		let current: VirtualEntry = rootEntry;
		for (const segment of segments) {
			if (current.type !== "dir") {return null;}
			const directory = current as VirtualDirectoryEntry;
			const next: VirtualEntry | undefined = directory.children[segment];
			if (!next) {return null;}
			current = next;
		}
		return current;
	};

	const readDirectory = async (path: string) => {
		const entry = getEntry(path);
		if (!entry || entry.type !== "dir") {return null;}
		return Object.entries(entry.children).map(([name, child]) => ({
			name,
			isDirectory: child.type === "dir"
		}));
	};

	const readFile = async (path: string) => {
		const entry = getEntry(path);
		if (!entry || entry.type !== "file") {return null;}
		return entry.content;
	};

	const stat = async (path: string) => {
		const entry = getEntry(path);
		if (!entry) {return null;}
		return {
			isFile: entry.type === "file",
			isDirectory: entry.type === "dir"
		};
	};

	const findFile = async (startPath: string, targetName: string) => {
		const startEntry = getEntry(startPath);
		if (!startEntry || startEntry.type !== "dir") {return null;}
		const stack: Array<{ path: string; entry: VirtualEntry }> = [
			{ path: normalizePath(startPath), entry: startEntry }
		];
		while (stack.length) {
			const current = stack.pop();
			if (!current) {break;}
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
		if (!sceneEntry || sceneEntry.type !== "dir") {return null;}
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

	return {
		root,
		currentDirectory: () => root,
		join: (...parts: string[]) => joinPaths(...parts),
		stat,
		readDirectory,
		readFile,
		findFile,
		getResourceDirectory,
		getAllTextWithScene
	};
}

export function createWebgalClientHandlers(
	options: CreateWebgalClientHandlersOptions
): WebgalClientHandlers {
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
			options.vfs.getResourceDirectory(urls)
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
