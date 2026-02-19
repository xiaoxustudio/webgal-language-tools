import { useCallback, useMemo, useRef, useState } from "react";
import * as Monaco from "monaco-editor";
import type { EditorProps } from "@monaco-editor/react";
import initWorker from "../init-worker";
import { pathToUri, uriToPath } from "@webgal/language-service";
import type { VirtualEntry, VirtualFileSystem } from "@webgal/language-service";
import {
	createWebgalMonacoWorkspace,
	type WebgalMonacoWorkspace
} from "@webgal/language-service/monaco";

type ApplyRemoteVfsInput = {
	vfs: VirtualFileSystem;
	tree: VirtualEntry;
	root?: string;
};

type WorkspaceOptions = {
	startText: string;
	configText: string;
	initialActivePath?: string;
	autoInitWorker?: boolean;
};

const findFirstFile = (
	entry: VirtualEntry,
	basePath: string
): string | null => {
	if (entry.type === "file") {
		return basePath;
	}
	const entries = Object.entries(entry.children);
	for (const [name, child] of entries) {
		const childPath = `${basePath}/${name}`;
		const found = findFirstFile(child, childPath);
		if (found) {
			return found;
		}
	}
	return null;
};

export function usePlaygroundWorkspace(options: WorkspaceOptions) {
	const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
	const vfsRef = useRef<VirtualFileSystem | null>(null);
	const workspaceRef = useRef<WebgalMonacoWorkspace | null>(null);
	const [tree, setTree] = useState<VirtualEntry | null>(null);
	const [workspace, setWorkspace] = useState<WebgalMonacoWorkspace | null>(
		null
	);
	const [activePath, setActivePath] = useState(
		options.initialActivePath ?? "file:///game/scene/start.txt"
	);
	const [selectedPath, setSelectedPath] = useState<string | null>(null);
	const [newFilePath, setNewFilePath] = useState("scene/new.txt");
	const [newFolderPath, setNewFolderPath] = useState("scene/new-folder");
	const [rootPath, setRootPath] = useState("file:///game");
	const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
		() => new Set()
	);

	const attachWorkspace = useCallback(
		(vfs: VirtualFileSystem, rootUri: string) => {
			const editor = editorRef.current;
			if (!editor) return;
			workspaceRef.current?.dispose();
			const nextWorkspace = createWebgalMonacoWorkspace({
				editor,
				vfs,
				rootPath: rootUri
			});
			workspaceRef.current = nextWorkspace;
			setWorkspace(nextWorkspace);
		},
		[]
	);

	const toFileUri = useCallback((value: string) => {
		return workspaceRef.current?.toFileUri(value) ?? null;
	}, []);

	const normalizeInputPath = useCallback(
		(value: string) => toFileUri(value),
		[toFileUri]
	);

	const refreshTree = useCallback(() => {
		const vfs = vfsRef.current;
		if (!vfs) return;
		setTree(vfs.getTree());
	}, []);

	const openFile = useCallback(async (path: string) => {
		const workspace = workspaceRef.current;
		if (!workspace) return false;
		const opened = await workspace.openFile(path);
		if (opened) {
			const nextPath = workspace.getActivePath();
			if (nextPath) {
				setActivePath(nextPath);
			}
		}
		return opened;
	}, []);

	const initWorkspace = useCallback(
		async (editor: Monaco.editor.IStandaloneCodeEditor) => {
			const { vfs } = initWorker(editor);
			vfsRef.current = vfs;
			const rootUri = pathToUri(vfs.root).toString();
			setRootPath(rootUri);
			attachWorkspace(vfs, rootUri);
			await vfs.writeFile(
				"file:///game/scene/start.txt",
				options.startText
			);
			await vfs.writeFile("file:///game/config.txt", options.configText);
			refreshTree();
			setExpandedPaths((prev) => {
				const next = new Set(prev);
				next.add("file:///game");
				next.add("file:///game/scene");
				return next;
			});
			await openFile(activePath);
		},
		[
			activePath,
			attachWorkspace,
			openFile,
			options.configText,
			options.startText,
			refreshTree
		]
	);

	const ensureWorkerWorkspace = useCallback(async () => {
		const editor = editorRef.current;
		if (!editor || vfsRef.current) return;
		await initWorkspace(editor);
	}, [initWorkspace]);

	const applyRemoteVfs = useCallback(
		async ({ vfs, tree: remoteTree, root }: ApplyRemoteVfsInput) => {
			vfsRef.current = vfs;
			vfs.setTree(remoteTree);
			const rootUri = root
				? root.startsWith("file://")
					? pathToUri(uriToPath(root)).toString()
					: pathToUri(root).toString()
				: pathToUri(vfs.root).toString();
			setRootPath(rootUri);
			attachWorkspace(vfs, rootUri);
			setTree(remoteTree);
			setExpandedPaths(() => {
				const next = new Set<string>();
				next.add(rootUri);
				if (
					remoteTree.type === "dir" &&
					remoteTree.children.scene?.type === "dir"
				) {
					next.add(`${rootUri}/scene`);
				}
				return next;
			});
			const nextFile = findFirstFile(remoteTree, rootUri);
			if (nextFile) {
				await openFile(nextFile);
			} else {
				workspaceRef.current?.setActivePath(null);
				setActivePath("");
			}
		},
		[attachWorkspace, openFile]
	);

	const handleEditorDidMount: EditorProps["onMount"] = async (editor) => {
		editorRef.current = editor as Monaco.editor.IStandaloneCodeEditor;
		const vfs = vfsRef.current;
		if (vfs) {
			attachWorkspace(vfs, rootPath);
			if (activePath) {
				await openFile(activePath);
			}
		}
		if (!vfsRef.current && (options.autoInitWorker ?? true)) {
			await initWorkspace(editor as Monaco.editor.IStandaloneCodeEditor);
		}
	};

	const handleCreateFile = useCallback(async () => {
		const vfs = vfsRef.current;
		if (!vfs) return;
		const target = normalizeInputPath(newFilePath);
		if (!target) return;
		await vfs.writeFile(target, "");
		refreshTree();
		setSelectedPath(target);
		await openFile(target);
	}, [newFilePath, normalizeInputPath, openFile, refreshTree]);

	const handleCreateFolder = useCallback(async () => {
		const vfs = vfsRef.current;
		if (!vfs) return;
		const target = normalizeInputPath(newFolderPath);
		if (!target) return;
		await vfs.mkdir(target);
		refreshTree();
		setSelectedPath(target);
	}, [newFolderPath, normalizeInputPath, refreshTree]);

	const handleDeleteSelected = useCallback(async () => {
		const vfs = vfsRef.current;
		if (!vfs || !selectedPath) return;
		const normalizedSelected = toFileUri(selectedPath);
		if (!normalizedSelected) return;
		await vfs.deletePath(normalizedSelected);
		refreshTree();
		if (activePath?.startsWith(normalizedSelected)) {
			const currentTree = vfs.getTree();
			const nextFile = findFirstFile(
				currentTree,
				pathToUri(vfs.root).toString()
			);
			if (nextFile) {
				await openFile(nextFile);
			} else {
				workspaceRef.current?.setActivePath(null);
				setActivePath("");
			}
		}
		setSelectedPath(null);
	}, [activePath, openFile, refreshTree, selectedPath, toFileUri]);

	const currentLanguage = useMemo(() => {
		if (!activePath || !workspace) return "webgal";
		return workspace.getLanguageFromPath(activePath);
	}, [activePath, workspace]);

	const displayPath = useMemo(() => {
		if (!activePath || !workspace) return "";
		return workspace.getDisplayPath(activePath);
	}, [activePath, workspace]);

	const handleSelectPath = useCallback(
		(path: string) => {
			setSelectedPath(toFileUri(path));
		},
		[toFileUri]
	);

	const handleTogglePath = useCallback((path: string) => {
		setExpandedPaths((prev) => {
			const next = new Set(prev);
			if (next.has(path)) {
				next.delete(path);
			} else {
				next.add(path);
			}
			return next;
		});
	}, []);

	return {
		editorRef,
		tree,
		activePath,
		selectedPath,
		newFilePath,
		newFolderPath,
		rootPath,
		expandedPaths,
		currentLanguage,
		displayPath,
		handleEditorDidMount,
		handleCreateFile,
		handleCreateFolder,
		handleDeleteSelected,
		handleSelectPath,
		handleTogglePath,
		setNewFilePath,
		setNewFolderPath,
		openFile,
		applyRemoteVfs,
		ensureWorkerWorkspace
	};
}
