import fs from "fs/promises";
import path from "path";

import {
	type VirtualDirectoryEntry,
	type VirtualEntry,
	type VirtualFileSystem,
	type VirtualFileSystemChange,
	type VirtualFileSystemChangeListener
} from "./index";

export type NodeFileSystemOptions = {
	root: string;
	ignoreDirs?: string[];
	sceneDir?: string;
};

const listDirectory = async (dirPath: string) => {
	try {
		const entries = await fs.readdir(dirPath, { withFileTypes: true });
		return entries.map((entry) => ({
			name: entry.name,
			isDirectory: entry.isDirectory()
		}));
	} catch {
		return null;
	}
};

const findFileInDirectory = async (
	dirPath: string,
	targetName: string,
	ignoreDirs: Set<string>
): Promise<string | null> => {
	const entries = await fs.readdir(dirPath, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.isFile() && entry.name === targetName) {
			return path.join(dirPath, entry.name);
		}
		if (entry.isDirectory() && !ignoreDirs.has(entry.name)) {
			const result = await findFileInDirectory(
				path.join(dirPath, entry.name),
				targetName,
				ignoreDirs
			);
			if (result) {
				return result;
			}
		}
	}
	return null;
};

export function createNodeFileSystem(
	options: NodeFileSystemOptions
): VirtualFileSystem {
	const root = path.resolve(options.root);
	const ignoreDirs = new Set(options.ignoreDirs ?? ["node_modules", ".git"]);
	const sceneDir = options.sceneDir ?? "scene";

	let rootEntry: VirtualDirectoryEntry = { type: "dir", children: {} };
	const loadedDirectories = new Set<string>();
	const loadedFiles = new Set<string>();

	const listeners = new Set<VirtualFileSystemChangeListener>();
	const emit = (changes: VirtualFileSystemChange[]) => {
		for (const listener of listeners) {
			listener(changes);
		}
	};

	const isWithinRoot = (targetPath: string) => {
		const absolute = path.resolve(targetPath);
		const rel = path.relative(root, absolute);
		if (rel === "" || rel === ".") {
			return true;
		}
		return !rel.startsWith("..") && !path.isAbsolute(rel);
	};

	const toSegments = (targetPath: string) => {
		const absolute = path.resolve(targetPath);
		const rel = path.relative(root, absolute);
		if (rel === "" || rel === ".") {
			return [];
		}
		if (rel.startsWith("..") || path.isAbsolute(rel)) {
			return null;
		}
		return rel.split(path.sep).filter((s) => s.length > 0);
	};

	const getEntryBySegments = (segments: string[]): VirtualEntry | null => {
		let current: VirtualEntry = rootEntry;
		for (const segment of segments) {
			if (current.type !== "dir") {
				return null;
			}
			const next: VirtualEntry | undefined = (
				current as VirtualDirectoryEntry
			).children[segment];
			if (!next) {
				return null;
			}
			current = next;
		}
		return current;
	};

	const ensureDirectoryBySegments = (segments: string[]) => {
		let current: VirtualEntry = rootEntry;
		for (const segment of segments) {
			if (current.type !== "dir") {
				throw new Error("Path segment is not a directory");
			}
			const dir = current as VirtualDirectoryEntry;
			const existing = dir.children[segment];
			if (!existing) {
				const created: VirtualDirectoryEntry = {
					type: "dir",
					children: {}
				};
				dir.children[segment] = created;
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

	const ensureDirectoryLoaded = async (dirPath: string) => {
		const absolute = path.resolve(dirPath);
		if (!isWithinRoot(absolute)) {
			return;
		}
		if (loadedDirectories.has(absolute)) {
			return;
		}
		const segments = toSegments(absolute);
		if (!segments) {
			return;
		}
		const dirEntry = ensureDirectoryBySegments(segments);
		const entries = await listDirectory(absolute);
		if (!entries) {
			loadedDirectories.add(absolute);
			return;
		}
		for (const entry of entries) {
			if (entry.isDirectory) {
				dirEntry.children[entry.name] ??= { type: "dir", children: {} };
			} else {
				dirEntry.children[entry.name] ??= { type: "file", content: "" };
			}
		}
		loadedDirectories.add(absolute);
	};

	const getTree = () => rootEntry;
	const setTree = (tree: VirtualEntry) => {
		rootEntry =
			tree.type === "dir" ? tree : { type: "dir", children: {} };
		loadedDirectories.clear();
		loadedFiles.clear();
		emit([{ type: "setTree", tree: rootEntry }]);
	};

	const writeFile = async (targetPath: string, content: string) => {
		const absolute = path.resolve(targetPath);
		if (!isWithinRoot(absolute)) {
			return;
		}
		const segments = toSegments(absolute);
		if (!segments || segments.length === 0) {
			return;
		}
		const fileName = segments[segments.length - 1]!;
		const parent = ensureDirectoryBySegments(segments.slice(0, -1));
		parent.children[fileName] = { type: "file", content };
		loadedFiles.add(absolute);
		emit([{ type: "writeFile", path: absolute, content }]);
	};

	const mkdir = async (targetPath: string) => {
		const absolute = path.resolve(targetPath);
		if (!isWithinRoot(absolute)) {
			return;
		}
		const segments = toSegments(absolute);
		if (!segments) {
			return;
		}
		ensureDirectoryBySegments(segments);
		emit([{ type: "mkdir", path: absolute }]);
	};

	const deletePath = async (targetPath: string) => {
		const absolute = path.resolve(targetPath);
		if (!isWithinRoot(absolute)) {
			return;
		}
		const segments = toSegments(absolute);
		if (!segments || segments.length === 0) {
			return;
		}
		const name = segments[segments.length - 1]!;
		const parentSegments = segments.slice(0, -1);
		const parentEntry =
			parentSegments.length === 0
				? rootEntry
				: getEntryBySegments(parentSegments);
		if (!parentEntry || parentEntry.type !== "dir") {
			return;
		}
		delete parentEntry.children[name];
		loadedFiles.delete(absolute);
		loadedDirectories.delete(absolute);
		emit([{ type: "deletePath", path: absolute }]);
	};

	const rename = async (from: string, to: string) => {
		const fromAbs = path.resolve(from);
		const toAbs = path.resolve(to);
		if (!isWithinRoot(fromAbs) || !isWithinRoot(toAbs)) {
			return;
		}
		const fromSegments = toSegments(fromAbs);
		if (!fromSegments || fromSegments.length === 0) {
			return;
		}
		const fromName = fromSegments[fromSegments.length - 1]!;
		const fromParentSegments = fromSegments.slice(0, -1);
		const fromParentEntry =
			fromParentSegments.length === 0
				? rootEntry
				: getEntryBySegments(fromParentSegments);
		if (!fromParentEntry || fromParentEntry.type !== "dir") {
			return;
		}
		const entry = fromParentEntry.children[fromName];
		if (!entry) {
			return;
		}
		delete fromParentEntry.children[fromName];

		const toPathSegments = toSegments(toAbs);
		if (!toPathSegments || toPathSegments.length === 0) {
			return;
		}
		const toName = toPathSegments[toPathSegments.length - 1]!;
		const toParent = ensureDirectoryBySegments(
			toPathSegments.slice(0, -1)
		);
		toParent.children[toName] = entry;

		if (loadedFiles.has(fromAbs)) {
			loadedFiles.delete(fromAbs);
			loadedFiles.add(toAbs);
		}
		if (loadedDirectories.has(fromAbs)) {
			loadedDirectories.delete(fromAbs);
			loadedDirectories.add(toAbs);
		}
		emit([{ type: "rename", from: fromAbs, to: toAbs }]);
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

	const stat = async (targetPath: string) => {
		const absolute = path.resolve(targetPath);
		if (isWithinRoot(absolute)) {
			const segments = toSegments(absolute);
			if (segments) {
				const existing = getEntryBySegments(segments);
				if (existing) {
					return {
						isFile: existing.type === "file",
						isDirectory: existing.type === "dir"
					};
				}
			}
		}
		try {
			const stats = await fs.stat(absolute);
			if (isWithinRoot(absolute)) {
				const segments = toSegments(absolute);
				if (segments) {
					if (stats.isDirectory()) {
						ensureDirectoryBySegments(segments);
					} else if (segments.length > 0) {
						const name = segments[segments.length - 1]!;
						const parent = ensureDirectoryBySegments(
							segments.slice(0, -1)
						);
						parent.children[name] ??= {
							type: "file",
							content: ""
						};
					}
				}
			}
			return {
				isFile: stats.isFile(),
				isDirectory: stats.isDirectory()
			};
		} catch {
			return null;
		}
	};

	const readDirectory = async (targetPath: string) => {
		const absolute = path.resolve(targetPath);
		if (isWithinRoot(absolute)) {
			await ensureDirectoryLoaded(absolute);
			const segments = toSegments(absolute);
			if (!segments) {
				return null;
			}
			const entry = getEntryBySegments(segments);
			if (!entry || entry.type !== "dir") {
				return null;
			}
			return Object.entries(entry.children).map(([name, child]) => ({
				name,
				isDirectory: child.type === "dir"
			}));
		}
		return listDirectory(absolute);
	};

	const readFile = async (targetPath: string) => {
		const absolute = path.resolve(targetPath);
		if (isWithinRoot(absolute)) {
			const segments = toSegments(absolute);
			if (segments) {
				const existing = getEntryBySegments(segments);
				if (existing && existing.type === "file") {
					if (loadedFiles.has(absolute)) {
						return existing.content;
					}
					try {
						const content = await fs.readFile(absolute, "utf-8");
						existing.content = content;
						loadedFiles.add(absolute);
						return content;
					} catch {
						return null;
					}
				}
			}
			try {
				const content = await fs.readFile(absolute, "utf-8");
				await writeFile(absolute, content);
				return content;
			} catch {
				return null;
			}
		}
		try {
			return await fs.readFile(absolute, "utf-8");
		} catch {
			return null;
		}
	};

	const findFile = async (startPath: string, targetName: string) => {
		const absoluteStart = path.resolve(startPath);
		try {
			const found = await findFileInDirectory(
				absoluteStart,
				targetName,
				ignoreDirs
			);
			if (found && isWithinRoot(found)) {
				const foundSegments = toSegments(found);
				if (foundSegments && foundSegments.length > 0) {
					const name = foundSegments[foundSegments.length - 1]!;
					const parent = ensureDirectoryBySegments(
						foundSegments.slice(0, -1)
					);
					parent.children[name] ??= { type: "file", content: "" };
				}
			}
			return found;
		} catch {
			return null;
		}
	};

	const getResourceDirectory = async (urls: string[]) => {
		const target = path.join(root, ...urls);
		return readDirectory(target);
	};

	const getAllTextWithScene = async () => {
		const target = path.join(root, sceneDir);
		const entries = await readDirectory(target);
		if (!entries) {
			return null;
		}
		const result: Record<
			string,
			{ path: string; name: string; text: string; fullPath: string }
		> = {};
		for (const entry of entries) {
			if (!entry.isDirectory && entry.name.endsWith(".txt")) {
				const fullPath = path.join(target, entry.name);
				const text = await readFile(fullPath);
				if (text === null) {
					continue;
				}
				result[entry.name] = {
					path: fullPath,
					name: entry.name,
					text,
					fullPath
				};
			}
		}
		return result;
	};

	return {
		root,
		currentDirectory: () => root,
		join: (...parts: string[]) => path.join(...parts),
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
