import { useRef } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as Monaco from "monaco-editor";
import type { EditorProps } from "@monaco-editor/react";
import initWS from "./init";
import initWorker from "./init-worker";
import initMainThread from "./init-main-thread";
import type { VirtualFileSystem } from "@webgal/language-service";
import StartText from "./assets/start.txt?raw";
import ConfigText from "./assets/config.txt?raw";
import "./App.css";

Monaco.editor.setTheme("webgal-dark");
loader.config({ monaco: Monaco });

type IStandaloneCodeEditor<T = EditorProps["onMount"]> = T extends (
	...args: infer A
) => unknown
	? A[0]
	: never;

function App() {
	const editorRef = useRef<IStandaloneCodeEditor>(null);
	const configEditorRef = useRef<IStandaloneCodeEditor>(null);
	const vfsRef = useRef<VirtualFileSystem | null>(null);

	const loadContent = async (
		editor: IStandaloneCodeEditor | null,
		vfs: VirtualFileSystem,
		path: string
	) => {
		if (!editor) return;
		const content = await vfs.readFile(path);
		editor.setValue(content || "");
	};

	async function handleEditorDidMount(editor: IStandaloneCodeEditor) {
		editorRef.current = editor;
		const { vfs } = initWorker(editor);
		vfsRef.current = vfs;
		vfs.writeFile("file:///game/scene/start.txt", StartText);
		vfs.writeFile("file:///game/config.txt", ConfigText);
		await loadContent(editor, vfs, "file:///game/scene/start.txt");
		await loadContent(
			configEditorRef.current,
			vfs,
			"file:///game/config.txt"
		);
		editor.onDidChangeModelContent(() => {
			vfsRef.current?.writeFile(
				"file:///game/scene/start.txt",
				editor.getValue()
			);
		});
	}

	async function handleConfigEditorDidMount(editor: IStandaloneCodeEditor) {
		configEditorRef.current = editor;
		if (vfsRef.current) {
			await loadContent(
				editor,
				vfsRef.current,
				"file:///game/config.txt"
			);
		}
		editor.onDidChangeModelContent(() => {
			vfsRef.current?.writeFile(
				"file:///game/config.txt",
				editor.getValue()
			);
		});
	}

	return (
		<>
			<div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
				<button
					onClick={async () => {
						if (!editorRef.current) return;
						const { vfs } = initMainThread(editorRef.current);
						vfsRef.current = vfs;
						await loadContent(
							editorRef.current,
							vfs,
							"file:///game/scene/start.txt"
						);
						await loadContent(
							configEditorRef.current,
							vfs,
							"file:///game/config.txt"
						);
					}}
				>
					Main Thread 模式
				</button>
				<button
					disabled
					onClick={async () => {
						if (!editorRef.current) return;
						const { vfs } = initWorker(editorRef.current);
						vfsRef.current = vfs;
						await loadContent(
							editorRef.current,
							vfs,
							"file:///game/scene/start.txt"
						);
						await loadContent(
							configEditorRef.current,
							vfs,
							"file:///game/config.txt"
						);
					}}
				>
					Worker 模式
				</button>
				<button
					disabled
					onClick={async () => {
						if (!editorRef.current) return;
						const { vfs } = initWS(editorRef.current);
						vfsRef.current = vfs;
						await loadContent(
							editorRef.current,
							vfs,
							"file:///game/scene/start.txt"
						);
						await loadContent(
							configEditorRef.current,
							vfs,
							"file:///game/config.txt"
						);
					}}
				>
					WebSocket 模式
				</button>
			</div>
			<div style={{ display: "flex", gap: 8 }}>
				<Editor
					height="80vh"
					defaultLanguage="webgal"
					width="600px"
					onMount={handleEditorDidMount}
					language="webgal"
					path="game/scene/start.txt"
					theme="vs-dark"
					options={{
						quickSuggestions: {
							other: true,
							comments: true,
							strings: true
						}
					}}
				/>
				<Editor
					height="80vh"
					defaultLanguage="webgal-config"
					width="600px"
					onMount={handleConfigEditorDidMount}
					language="webgal-config"
					path="game/config.txt"
					theme="vs-dark"
					options={{
						quickSuggestions: {
							other: true,
							comments: true,
							strings: true
						}
					}}
				/>
			</div>
		</>
	);
}

export default App;
