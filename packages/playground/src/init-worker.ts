import type { VirtualFileSystem } from "@webgal/language-service";
import { createWebgalMonacoLanguageClientWithWorker } from "@webgal/language-service/monaco";
import * as monaco from "monaco-editor";
import defaultTree from "./defaultTree";

export default function (editor: monaco.editor.IStandaloneCodeEditor): {
	worker: Worker;
	vfs: VirtualFileSystem;
} {
	const worker = new Worker(
		new URL("./webgal-lsp.worker.ts", import.meta.url),
		{ type: "module" }
	);
	const instance = createWebgalMonacoLanguageClientWithWorker({
		worker,
		editor
	});
	defaultTree(instance.vfs);
	return instance;
}
