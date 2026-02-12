import { initialize } from "@codingame/monaco-vscode-api";
import {
	registerExtension,
	ExtensionHostKind
} from "@codingame/monaco-vscode-api/extensions";
import "vscode/localExtensionHost";
import {
	webgalGrammar,
	webgalConfigGrammar,
	webgalLanguageConfiguration
} from "./syntaxes";
import { webgalDarkTheme, webgalWhiteTheme } from "./themes";
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
			).href,
			{ type: "module" }
		),
	TextMateWorker: () =>
		new Worker(
			new URL(
				"@codingame/monaco-vscode-textmate-service-override/worker",
				import.meta.url
			).href,
			{ type: "module" }
		)
};

let initPromise: Promise<void> | null = null;

export async function initWebgalMonaco() {
	if (initPromise) {
		return initPromise;
	}
	initPromise = (async () => {
	const { registerFileUrl } = registerExtension(
		{
			name: "webgal",
			publisher: "openwebgal",
			version: "1.0.0",
			engines: {
				vscode: "^1.0.0"
			},
			activationEvents: ["onLanguage:webgal", "onLanguage:webgal-config"],
			contributes: {
				languages: [
					{
						id: "webgal",
						extensions: [".webgal"],
						aliases: ["WebGAL"],
						configuration: "./language-configuration.json"
					},
					{
						id: "webgal-config",
						extensions: [".webgal-config"],
						aliases: ["WebGAL Config"]
					}
				],
				grammars: [
					{
						language: "webgal",
						scopeName: "source.webgal",
						path: "./webgal.tmLanguage.json"
					},
					{
						language: "webgal-config",
						scopeName: "source.webgal-config",
						path: "./webgal-config.tmLanguage.json"
					}
				],
				themes: [
					{
						id: "webgal-dark",
						label: "WebGAL Dark",
						uiTheme: "vs-dark",
						path: "./dark.json"
					},
					{
						id: "webgal-white",
						label: "WebGAL White",
						uiTheme: "vs",
						path: "./white.json"
					}
				]
			}
		},
		ExtensionHostKind.LocalProcess
	);

	registerFileUrl(
		"./webgal.tmLanguage.json",
		new URL(
			"data:application/json;base64," +
				btoa(
					unescape(encodeURIComponent(JSON.stringify(webgalGrammar)))
				),
			import.meta.url
		).href
	);
	registerFileUrl(
		"./webgal-config.tmLanguage.json",
		new URL(
			"data:application/json;base64," +
				btoa(
					unescape(
						encodeURIComponent(JSON.stringify(webgalConfigGrammar))
					)
				),
			import.meta.url
		).href
	);
	registerFileUrl(
		"./language-configuration.json",
		new URL(
			"data:application/json;base64," +
				btoa(
					unescape(
						encodeURIComponent(
							JSON.stringify(webgalLanguageConfiguration)
						)
					)
				),
			import.meta.url
		).href
	);

	registerFileUrl(
		"./dark.json",
		new URL(
			"data:application/json;base64," +
				btoa(
					unescape(
						encodeURIComponent(JSON.stringify(webgalDarkTheme))
					)
				),
			import.meta.url
		).href
	);
	registerFileUrl(
		"./white.json",
		new URL(
			"data:application/json;base64," +
				btoa(
					unescape(
						encodeURIComponent(JSON.stringify(webgalWhiteTheme))
					)
				),
			import.meta.url
		).href
	);

	(window as any).MonacoEnvironment = {
		getWorker: function (_moduleId: any, label: string) {
			const workerFactory = workerLoaders[label];
			if (workerFactory !== null) {
				return workerFactory!();
			}
			throw new Error(`Worker ${label} not found`);
		}
	};

	await initialize({
		...getTextMateServiceOverride(),
		...getThemeServiceOverride(),
		...getLanguagesServiceOverride()
	});
	})();
	return initPromise;
}
