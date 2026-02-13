import * as monaco from "monaco-editor";
import {
	createMemoryFileSystem,
	createWebgalMonacoLanguageClientWithWorker,
	initWebgalMonaco
} from "@webgal/language-service";

await initWebgalMonaco();

export default function (editor: monaco.editor.IStandaloneCodeEditor): {
	worker: Worker;
	vfs: ReturnType<typeof createMemoryFileSystem>;
} {
	const worker = new Worker(
		new URL("./webgal-lsp.worker.ts", import.meta.url),
		{ type: "module" }
	);
	return createWebgalMonacoLanguageClientWithWorker({
		worker,
		editor
	});
}
