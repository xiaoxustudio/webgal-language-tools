import { FileType, type FileSystem } from "@volar/language-service";
import type { URI } from "vscode-uri";
import { VolarWritableFileSystem, VirtualFileSystem } from "./types";
import { joinPaths, pathToUri, uriToPath } from "./utils";

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
