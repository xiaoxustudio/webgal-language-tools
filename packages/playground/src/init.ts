import { initialize } from "@codingame/monaco-vscode-api";
import * as monaco from "monaco-editor";

// we need to import this so monaco-languageclient can use vscode-api
import "vscode/localExtensionHost";
import { initWebSocketAndStartClient } from "./lsp-client";

// everything else is the same except the last line
import getLanguagesServiceOverride from "@codingame/monaco-vscode-languages-service-override";
import getThemeServiceOverride from "@codingame/monaco-vscode-theme-service-override";
import getTextMateServiceOverride from "@codingame/monaco-vscode-textmate-service-override";

export type WorkerLoader = () => Worker;
const workerLoaders: Partial<Record<string, WorkerLoader>> = {
	TextEditorWorker: () =>
		new Worker(
			new URL(
				"monaco-editor/esm/vs/editor/editor.worker.js",
				import.meta.url
			),
			{ type: "module" }
		),
	TextMateWorker: () =>
		new Worker(
			new URL(
				"@codingame/monaco-vscode-textmate-service-override/worker",
				import.meta.url
			),
			{ type: "module" }
		)
};

window.MonacoEnvironment = {
	getWorker: function (_moduleId, label) {
		console.log("getWorker", _moduleId, label);
		const workerFactory = workerLoaders[label];
		if (workerFactory != null) {
			return workerFactory();
		}
		throw new Error(`Worker ${label} not found`);
	}
};

await initialize({
	...getTextMateServiceOverride(),
	...getThemeServiceOverride(),
	...getLanguagesServiceOverride()
});

export default function (editor: monaco.editor.IStandaloneCodeEditor) {
	return initWebSocketAndStartClient(
		"ws://localhost:3001/webgal-lsp",
		editor
	);
}
