import { useRef } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as Monaco from "monaco-editor";
import type { EditorProps } from "@monaco-editor/react";
import initWS from "./init";
import initWorker from "./init-worker";
import type { VirtualFileSystem } from "@webgal/language-service";
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
	const vfsRef = useRef<VirtualFileSystem | null>(null);

	async function handleEditorDidMount(editor: IStandaloneCodeEditor) {
		editorRef.current = editor;
		const { vfs } = initWorker(editor);
		vfsRef.current = vfs;
		const content = await vfs.readFile("file:///game/scene/start.txt");
		editor.setValue(content || "");
		editor.onDidChangeModelContent(() => {
			vfsRef.current?.writeFile(
				"file:///game/scene/start.txt",
				editor.getValue()
			);
		});
	}

	return (
		<>
			Editor
			<div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
				<button
					onClick={async () => {
						if (!editorRef.current) return;
						const { vfs } = initWorker(editorRef.current);
						vfsRef.current = vfs;
						const content = await vfs.readFile(
							"file:///game/scene/start.txt"
						);
						editorRef.current.setValue(content || "");
					}}
				>
					Worker 模式
				</button>
				<button
					onClick={async () => {
						if (!editorRef.current) return;
						const { vfs } = initWS(editorRef.current);
						vfsRef.current = vfs;
						const content = await vfs.readFile(
							"file:///game/scene/start.txt"
						);
						editorRef.current.setValue(content || "");
					}}
				>
					WebSocket 模式
				</button>
			</div>
			<Editor
				height="90vh"
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
		</>
	);
}

export default App;
