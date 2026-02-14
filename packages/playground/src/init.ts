import * as monaco from "monaco-editor";
import { createWebgalMonacoLanguageClient } from "@webgal/language-service/monaco";

export default function (editor: monaco.editor.IStandaloneCodeEditor) {
	return createWebgalMonacoLanguageClient({
		languageServerUrl: "ws://localhost:5882/webgal-lsp",
		editor
	});
}
