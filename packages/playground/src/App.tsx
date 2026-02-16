import { useCallback, useMemo, useRef, useState } from "react";
import { loader } from "@monaco-editor/react";
import * as Monaco from "monaco-editor";
import type { EditorProps } from "@monaco-editor/react";
import initWS from "./init";
import initWorker from "./init-worker";
import {
	joinPaths,
	normalizePath,
	pathToUri,
	uriToPath,
	type VirtualEntry,
	type VirtualFileSystem
} from "@webgal/language-service";
import { initWebgalMonaco } from "@webgal/language-service/monaco";

import StartText from "./assets/start.txt?raw";
import ConfigText from "./assets/config.txt?raw";
import corePackage from "../../language-core/package.json";
import serverPackage from "../../language-server/package.json";
import servicePackage from "../../language-service/package.json";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import EditorPane from "./components/EditorPane";

import "./App.css";

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import textmateWorker from "@codingame/monaco-vscode-textmate-service-override/worker?worker";

self.MonacoEnvironment = {
	getWorker(_moduleId, label) {
		if (label === "TextMateWorker") {
			return new textmateWorker();
		}
		return new editorWorker();
	}
};

loader.config({ monaco: Monaco });
loader.init();

await initWebgalMonaco();

type IStandaloneCodeEditor<T = EditorProps["onMount"]> = T extends (
	...args: infer A
) => unknown
	? A[0]
	: never;

function findFirstFile(entry: VirtualEntry, basePath: string): string | null {
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
}

function App() {
	const editorRef = useRef<IStandaloneCodeEditor>(null);
	const vfsRef = useRef<VirtualFileSystem | null>(null);
	const activePathRef = useRef<string | null>(null);
	const skipWriteRef = useRef(false);
	const linkOpenerRef = useRef<Monaco.IDisposable | null>(null);
	const [tree, setTree] = useState<VirtualEntry | null>(null);
	const [activePath, setActivePath] = useState(
		"file:///game/scene/start.txt"
	);
	const [selectedPath, setSelectedPath] = useState<string | null>(null);
	const [newFilePath, setNewFilePath] = useState("scene/new.txt");
	const [newFolderPath, setNewFolderPath] = useState("scene/new-folder");
	const [rootPath, setRootPath] = useState("file:///game");
	const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
		() => new Set()
	);

	const versionItems = useMemo(
		() => [
			{ label: "core", value: corePackage.version },
			{ label: "server", value: serverPackage.version },
			{ label: "service", value: servicePackage.version }
		],
		[]
	);

	const getLanguageFromPath = useCallback((path: string) => {
		if (path.toLowerCase().endsWith("config.txt")) {
			return "webgal-config";
		}
		return "webgal";
	}, []);

	const rootPathForJoin = useMemo(() => {
		const base = rootPath.startsWith("file://")
			? uriToPath(rootPath)
			: rootPath;
		return normalizePath(base);
	}, [rootPath]);

	const toFileUri = useCallback(
		(value: string) => {
			const trimmed = value.trim();
			if (!trimmed) return null;
			if (trimmed.startsWith("file://")) {
				return pathToUri(uriToPath(trimmed)).toString();
			}
			if (trimmed.startsWith("/")) {
				return pathToUri(normalizePath(trimmed)).toString();
			}
			const joined = joinPaths(rootPathForJoin, trimmed);
			return pathToUri(joined).toString();
		},
		[rootPathForJoin]
	);

	const getDisplayPath = useCallback(
		(path: string) => {
			const normalizedPath = normalizePath(
				path.startsWith("file://") ? uriToPath(path) : path
			);
			if (normalizedPath === rootPathForJoin) {
				return "";
			}
			if (normalizedPath.startsWith(`${rootPathForJoin}/`)) {
				return normalizedPath.slice(rootPathForJoin.length + 1);
			}
			return normalizedPath;
		},
		[rootPathForJoin]
	);

	const normalizeInputPath = useCallback(
		(value: string) => toFileUri(value),
		[toFileUri]
	);

	const refreshTree = useCallback(() => {
		const vfs = vfsRef.current;
		if (!vfs) return;
		setTree(vfs.getTree());
	}, []);

	const openFile = useCallback(
		async (path: string) => {
			const vfs = vfsRef.current;
			const editor = editorRef.current;
			if (!vfs || !editor) return;
			const normalizedPath = toFileUri(path);
			if (!normalizedPath) return;
			const content = await vfs.readFile(normalizedPath);
			const uri = Monaco.Uri.parse(normalizedPath);
			let model = Monaco.editor.getModel(uri);
			if (!model) {
				model = Monaco.editor.createModel(
					content ?? "",
					getLanguageFromPath(normalizedPath),
					uri
				);
			} else {
				model.setValue(content ?? "");
			}
			skipWriteRef.current = true;
			editor.setModel(model);
			skipWriteRef.current = false;
			activePathRef.current = normalizedPath;
			setActivePath(normalizedPath);
		},
		[getLanguageFromPath, toFileUri]
	);

	const initWorkspace = useCallback(
		async (editor: IStandaloneCodeEditor) => {
			const { vfs } = initWorker(editor);
			vfsRef.current = vfs;
			setRootPath(pathToUri(vfs.root).toString());
			await vfs.writeFile("file:///game/scene/start.txt", StartText);
			await vfs.writeFile("file:///game/config.txt", ConfigText);
			refreshTree();
			setExpandedPaths((prev) => {
				const next = new Set(prev);
				next.add("file:///game");
				next.add("file:///game/scene");
				return next;
			});
			await openFile(activePathRef.current ?? activePath);
		},
		[activePath, openFile, refreshTree]
	);

	async function handleEditorDidMount(editor: IStandaloneCodeEditor) {
		editorRef.current = editor;
		if (!linkOpenerRef.current) {
			linkOpenerRef.current = Monaco.editor.registerLinkOpener({
				open: (resource) => {
					const uriString = resource.toString();
					if (!uriString.startsWith("file://")) {
						return false;
					}
					return openFile(uriString).then(() => true);
				}
			});
		}
		editor.onDidChangeModelContent(() => {
			if (skipWriteRef.current) return;
			const currentPath = activePathRef.current;
			if (!currentPath) return;
			vfsRef.current?.writeFile(currentPath, editor.getValue());
		});
		if (!vfsRef.current) {
			await initWorkspace(editor);
		}
	}

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
		if (activePathRef.current?.startsWith(normalizedSelected)) {
			const currentTree = vfs.getTree();
			const nextFile = findFirstFile(
				currentTree,
				pathToUri(vfs.root).toString()
			);
			if (nextFile) {
				await openFile(nextFile);
			} else {
				activePathRef.current = null;
				setActivePath("");
			}
		}
		setSelectedPath(null);
	}, [openFile, refreshTree, selectedPath, toFileUri]);

	const currentLanguage = useMemo(() => {
		if (!activePath) return "webgal";
		return getLanguageFromPath(activePath);
	}, [activePath, getLanguageFromPath]);

	const githubUrl = "https://github.com/xiaoxustudio/webgal-language-tools";
	const displayPath = activePath ? getDisplayPath(activePath) : "";
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

	return (
		<div className="app">
			<Header
				title="WebGAL Playground"
				githubUrl={githubUrl}
				versionItems={versionItems}
			/>
			<div className="app-body">
				<Sidebar
					newFilePath={newFilePath}
					newFolderPath={newFolderPath}
					selectedPath={selectedPath}
					tree={tree}
					rootPath={rootPath}
					expandedPaths={expandedPaths}
					onFilePathChange={setNewFilePath}
					onFolderPathChange={setNewFolderPath}
					onCreateFile={handleCreateFile}
					onCreateFolder={handleCreateFolder}
					onDeleteSelected={handleDeleteSelected}
					onSelectPath={handleSelectPath}
					onOpenFile={openFile}
					onTogglePath={handleTogglePath}
				/>
				<EditorPane
					activePath={activePath}
					displayPath={displayPath}
					currentLanguage={currentLanguage}
					onEditorMount={handleEditorDidMount}
					onWebSocketMode={() => {
						if (!editorRef.current) return;
						const { vfs } = initWS(editorRef.current);
						vfsRef.current = vfs;
						refreshTree();
					}}
				/>
			</div>
		</div>
	);
}

export default App;
