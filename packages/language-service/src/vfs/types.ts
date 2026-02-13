import type { FileSystem } from "@volar/language-service";
import type { URI } from "vscode-uri";

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
	"workspace/documentLink/refresh": () => MaybePromise<unknown>;
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
