import { useRef } from "react";
import Editor from "@monaco-editor/react";
import * as Monaco from "monaco-editor";
import type { EditorProps } from "@monaco-editor/react";
import "./App.css";
import "./init";

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
		console.log(monaco);
	}

	return (
		<>
			Editor
			<Editor
				height="90vh"
				width="600px"
				onMount={handleEditorDidMount}
				language="webgal"
			/>
		</>
	);
}

export default App;
