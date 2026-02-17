import * as monaco from "monaco-editor";
import {
	createMemoryFileSystem,
	createWebgalMonacoLanguageClient
} from "@webgal/language-service/monaco";
import type { VirtualEntry } from "@webgal/language-service";

type InitWSOptions = {
	tree?: VirtualEntry;
	root?: string;
	url?: string;
};

export default function (
	editor: monaco.editor.IStandaloneCodeEditor,
	options?: InitWSOptions
) {
	const vfs = createMemoryFileSystem({
		root: options?.root ?? "file:///game",
		tree: options?.tree
	});
	return createWebgalMonacoLanguageClient({
		languageServerUrl: options?.url ?? "ws://localhost:5882/webgal-lsp",
		editor,
		virtualFileSystem: vfs
	});
}
