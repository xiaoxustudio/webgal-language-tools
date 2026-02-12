import { useRef } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as Monaco from "monaco-editor";
import type { EditorProps } from "@monaco-editor/react";
import init from "./init";
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

	async function handleEditorDidMount(editor: IStandaloneCodeEditor) {
		editorRef.current = editor;
		const { vfs } = init(editor);
		const content = await vfs.readFile("file:///game/scene/start.txt");
		editor.setValue(content || "");
		editor.onDidChangeModelContent(() => {
			vfs.writeFile("file:///game/scene/start.txt", editor.getValue());
		});
	}

	return (
		<>
			Editor
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
