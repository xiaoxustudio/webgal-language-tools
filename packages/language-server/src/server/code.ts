import type { VirtualFileSystem } from "@webgal/language-service";
import {
	FileType,
	type FileStat,
	type FileSystem
} from "@volar/language-service";
import type { Connection } from "@volar/language-server";
import type { URI } from "vscode-uri";

export function createVolarFileSystemFromVirtualFileSystem(
	vfs: VirtualFileSystem,
	options?: {
		uriToPath?: (uri: URI) => string;
	}
): FileSystem {
	let cached: FileSystem | null = null;
	const load = async () => {
		if (cached) {
			return cached;
		}
		const module = await import("@webgal/language-service");
		cached = module.createVolarFileSystem(vfs, options);
		return cached;
	};
	return {
		stat: async (uri) => {
			const fs = await load();
			return fs.stat(uri);
		},
		readFile: async (uri) => {
			const fs = await load();
			return fs.readFile(uri);
		},
		readDirectory: async (uri) => {
			const fs = await load();
			return fs.readDirectory(uri);
		}
	};
}

export function createClientVfsFileSystem(
	connection: Connection,
	options?: {
		uriToPath?: (uri: URI) => string;
	}
): FileSystem {
	const uriToPath =
		options?.uriToPath ??
		((uri: URI) => {
			if (uri.scheme === "file") {
				const pathValue = uri.path;
				if (/^\/[a-zA-Z]:\//.test(pathValue)) {
					return pathValue.slice(1);
				}
				return pathValue;
			}
			return uri.path;
		});
	return {
		stat: async (uri) => {
			const pathValue = uriToPath(uri);
			const info = (await connection.sendRequest(
				"client/FStat",
				pathValue
			)) as { isFile: boolean; isDirectory: boolean } | null;
			if (!info) {
				return undefined;
			}
			const type = info.isDirectory
				? FileType.Directory
				: info.isFile
					? FileType.File
					: FileType.Unknown;
			const stat: FileStat = {
				type,
				ctime: 0,
				mtime: 0,
				size: 0
			};
			return stat;
		},
		readFile: async (uri) => {
			const pathValue = uriToPath(uri);
			const content = (await connection.sendRequest(
				"client/vfs/readFile",
				pathValue
			)) as string | null;
			return content ?? undefined;
		},
		readDirectory: async (uri) => {
			const entries = (await connection.sendRequest(
				"client/readDirectory",
				uri.toString()
			)) as Array<{ name: string; isDirectory: boolean }> | null;
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
