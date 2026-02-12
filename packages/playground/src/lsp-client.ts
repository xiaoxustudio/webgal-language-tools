import * as monaco from "monaco-editor";
import { createMemoryFileSystem } from "@webgal/language-service";
import { createWebgalMonacoLanguageClient } from "@webgal/language-service/monaco";

export const initWebSocketAndStartClient = (
	url: string,
	editor: monaco.editor.IStandaloneCodeEditor
): { webSocket: WebSocket; vfs: ReturnType<typeof createMemoryFileSystem> } => {
	return createWebgalMonacoLanguageClient({
		languageServerUrl: url,
		editor: editor
	});
};
