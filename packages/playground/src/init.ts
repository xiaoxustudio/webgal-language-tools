import { initWebgalMonaco } from "@webgal/language-service/monaco-init";
import * as monaco from "monaco-editor";
import { initWebSocketAndStartClient } from "./lsp-client";

await initWebgalMonaco();

export default function (editor: monaco.editor.IStandaloneCodeEditor) {
	return initWebSocketAndStartClient(
		"ws://localhost:3001/webgal-lsp",
		editor
	);
}
