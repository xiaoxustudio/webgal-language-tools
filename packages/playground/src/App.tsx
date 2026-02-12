import { useRef } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as Monaco from "monaco-editor";
import type { EditorProps } from "@monaco-editor/react";
import "./App.css";
import init from "./init";

loader.config({ monaco: Monaco });

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
		const model = editor.getModel();
		console.log("Current Model URI:", model?.uri.toString());
		console.log("Current Language ID:", model?.getLanguageId());
		
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
				path="game/scene/start.txt"
			/>
		</>
	);
}

export default App;
