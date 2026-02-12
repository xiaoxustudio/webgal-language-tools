import { initWebgalMonaco } from "@webgal/language-service/monaco-init";
import * as monaco from "monaco-editor";
import { createWebgalMonacoLanguageClientWithWorker } from "@webgal/language-service/monaco";
import { createMemoryFileSystem } from "@webgal/language-service";

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
