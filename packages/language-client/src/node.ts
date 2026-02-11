import fs from "fs/promises";
import path from "path";

import { DirectoryEntry, VirtualFileSystem } from "./index";

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
			if (result) {return result;}
		}
	}
	return null;
};

export function createNodeFileSystem(
	options: NodeFileSystemOptions
): VirtualFileSystem {
	const root = options.root;
	const ignoreDirs = new Set(options.ignoreDirs ?? ["node_modules", ".git"]);
	const sceneDir = options.sceneDir ?? "scene";

	return {
		root,
		currentDirectory: () => root,
		join: (...parts: string[]) => path.join(...parts),
		stat: async (targetPath: string) => {
			try {
				const stats = await fs.stat(targetPath);
				return {
					isFile: stats.isFile(),
					isDirectory: stats.isDirectory()
				};
			} catch {
				return null;
			}
		},
		readDirectory: async (targetPath: string) =>
			listDirectory(targetPath),
		readFile: async (targetPath: string) => {
			try {
				return await fs.readFile(targetPath, "utf-8");
			} catch {
				return null;
			}
		},
		findFile: async (startPath: string, targetName: string) => {
			try {
				return await findFileInDirectory(
					startPath,
					targetName,
					ignoreDirs
				);
			} catch {
				return null;
			}
		},
		getResourceDirectory: async (urls: string[]) => {
			const target = path.join(root, ...urls);
			return listDirectory(target);
		},
		getAllTextWithScene: async () => {
			const target = path.join(root, sceneDir);
			let entries: DirectoryEntry[] | null = null;
			try {
				entries = await listDirectory(target);
			} catch {
				entries = null;
			}
			if (!entries) {return null;}
			const result: Record<
				string,
				{ path: string; name: string; text: string; fullPath: string }
			> = {};
			for (const entry of entries) {
				if (!entry.isDirectory && entry.name.endsWith(".txt")) {
					const fullPath = path.join(target, entry.name);
					const text = await fs.readFile(fullPath, "utf-8");
					result[entry.name] = {
						path: fullPath,
						name: entry.name,
						text,
						fullPath
					};
				}
			}
			return result;
		}
	};
}
