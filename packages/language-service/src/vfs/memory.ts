import { FileType } from "@volar/language-service";
import { joinPaths, normalizePath, uriToPath, toVfsPath } from "./utils";
import type {
	VirtualDirectoryEntry,
	VirtualEntry,
	VirtualFileSystemChange,
	VirtualFileSystemChangeListener,
	VolarWritableFileSystem
} from "./types";

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
			emit([{ type: "rename", from: normalizePath(from), to: normalizePath(to) }]);
		},
		getTree: () => rootEntry,
		setTree: (tree) => {
			rootEntry =
				tree.type === "dir"
					? tree
					: { type: "dir", children: {} as Record<string, VirtualEntry> };
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
