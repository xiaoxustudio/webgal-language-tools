import { useCallback, useMemo, useRef, useState } from "react";
import { loader } from "@monaco-editor/react";
import * as Monaco from "monaco-editor";
import type { EditorProps } from "@monaco-editor/react";
import initWS from "./init";
import initWorker from "./init-worker";
import type { VirtualEntry, VirtualFileSystem } from "@webgal/language-service";
import StartText from "./assets/start.txt?raw";
import ConfigText from "./assets/config.txt?raw";
import "./App.css";
import corePackage from "../../language-core/package.json";
import serverPackage from "../../language-server/package.json";
import servicePackage from "../../language-service/package.json";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import EditorPane from "./components/EditorPane";

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

Monaco.editor.setTheme("webgal-dark");

loader.config({ monaco: Monaco });
loader.init();

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
	const [tree, setTree] = useState<VirtualEntry | null>(null);
	const [activePath, setActivePath] = useState(
		"file:///game/scene/start.txt"
	);
	const [selectedPath, setSelectedPath] = useState<string | null>(null);
	const [newFilePath, setNewFilePath] = useState("scene/new.txt");
	const [newFolderPath, setNewFolderPath] = useState("scene/new-folder");
	const [rootPath, setRootPath] = useState("file:///game");

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

	const getDisplayPath = useCallback((path: string) => {
		if (path.startsWith("file:///game/")) {
			return path.replace("file:///game/", "");
		}
		return path;
	}, []);

	const normalizeInputPath = useCallback((value: string) => {
		const trimmed = value.trim();
		if (!trimmed) return null;
		if (trimmed.startsWith("file:///")) return trimmed;
		if (trimmed.startsWith("/")) {
			return `file:///game${trimmed}`;
		}
		return `file:///game/${trimmed}`;
	}, []);

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
			const content = await vfs.readFile(path);
			const uri = Monaco.Uri.parse(path);
			let model = Monaco.editor.getModel(uri);
			if (!model) {
				model = Monaco.editor.createModel(
					content ?? "",
					getLanguageFromPath(path),
					uri
				);
			} else {
				model.setValue(content ?? "");
			}
			skipWriteRef.current = true;
			editor.setModel(model);
			skipWriteRef.current = false;
			activePathRef.current = path;
			setActivePath(path);
		},
		[getLanguageFromPath]
	);

	const initWorkspace = useCallback(
		async (editor: IStandaloneCodeEditor) => {
			const { vfs } = initWorker(editor);
			vfsRef.current = vfs;
			setRootPath(vfs.root);
			await vfs.writeFile("file:///game/scene/start.txt", StartText);
			await vfs.writeFile("file:///game/config.txt", ConfigText);
			refreshTree();
			await openFile(activePathRef.current ?? activePath);
		},
		[activePath, openFile, refreshTree]
	);

	async function handleEditorDidMount(editor: IStandaloneCodeEditor) {
		editorRef.current = editor;
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
		await vfs.deletePath(selectedPath);
		refreshTree();
		if (activePathRef.current?.startsWith(selectedPath)) {
			const currentTree = vfs.getTree();
			const nextFile = findFirstFile(currentTree, vfs.root);
			if (nextFile) {
				await openFile(nextFile);
			} else {
				activePathRef.current = null;
				setActivePath("");
			}
		}
		setSelectedPath(null);
	}, [openFile, refreshTree, selectedPath]);

	const currentLanguage = useMemo(() => {
		if (!activePath) return "webgal";
		return getLanguageFromPath(activePath);
	}, [activePath, getLanguageFromPath]);

	const githubUrl = "https://github.com/MakinoharaShoko/WebGAL";
	const displayPath = activePath ? getDisplayPath(activePath) : "";

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
					onFilePathChange={setNewFilePath}
					onFolderPathChange={setNewFolderPath}
					onCreateFile={handleCreateFile}
					onCreateFolder={handleCreateFolder}
					onDeleteSelected={handleDeleteSelected}
					onSelectPath={setSelectedPath}
					onOpenFile={openFile}
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
