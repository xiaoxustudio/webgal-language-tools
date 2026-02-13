import * as monaco from "monaco-editor";
import {
	createMemoryFileSystem,
	createWebgalMonacoLanguageClient
} from "@webgal/language-service";

export const initWebSocketAndStartClient = (
	url: string,
	editor: monaco.editor.IStandaloneCodeEditor
): { webSocket: WebSocket; vfs: ReturnType<typeof createMemoryFileSystem> } => {
	return createWebgalMonacoLanguageClient({
		languageServerUrl: url,
		editor: editor
	});
};
