import { useRef } from "react";
import Editor from "@monaco-editor/react";
import * as Monaco from "monaco-editor";
import type { EditorProps } from "@monaco-editor/react";
import "./App.css";
import init from "./init";

type IStandaloneCodeEditor<T = EditorProps["onMount"]> = T extends (
	...args: infer A
) => unknown
	? A[0]
	: never;

function App() {
	const editorRef = useRef<IStandaloneCodeEditor>(null);

	function handleEditorDidMount(
		editor: IStandaloneCodeEditor,
		monaco: typeof Monaco
	) {
		editorRef.current = editor;
		monaco.languages.register({ id: "webgal" });
		const { vfs } = init(editor);
		editor.onDidChangeModelContent(() => {
			vfs.writeFile("file:///game/scene/start.txt", editor.getValue());
			console.log("徐然", vfs.readFile("file:///game/scene/start.txt"));
			console.log("徐然", editor.getModel()!.getLanguageId());
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
			/>
		</>
	);
}

export default App;
