import { initialize } from "@codingame/monaco-vscode-api";
import {
	registerExtension,
	ExtensionHostKind
} from "@codingame/monaco-vscode-api/extensions";
import {
	webgalGrammar,
	webgalConfigGrammar,
	webgalLanguageConfiguration
} from "../syntaxes";
import { webgalDarkTheme, webgalWhiteTheme } from "../themes";
import getLanguagesServiceOverride from "@codingame/monaco-vscode-languages-service-override";
import getThemeServiceOverride from "@codingame/monaco-vscode-theme-service-override";
import getTextMateServiceOverride from "@codingame/monaco-vscode-textmate-service-override";

import "vscode/localExtensionHost";

let initPromise: Promise<void> | null = null;

export const initResources = {
	"./webgal.tmLanguage.json": webgalGrammar,
	"./webgal-config.tmLanguage.json": webgalConfigGrammar,
	"./language-configuration.json": webgalLanguageConfiguration,
	"./dark.json": webgalDarkTheme,
	"./white.json": webgalWhiteTheme
};

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
				activationEvents: [
					"onLanguage:webgal",
					"onLanguage:webgal-config"
				],
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
		for (const [key, value] of Object.entries(initResources)) {
			registerFileUrl(
				key,
				new URL(
					"data:application/json;base64," +
						btoa(
							decodeURIComponent(
								encodeURIComponent(JSON.stringify(value))
							)
						),
					import.meta.url
				).href
			);
		}

		await initialize({
			...getTextMateServiceOverride(),
			...getThemeServiceOverride(),
			...getLanguagesServiceOverride()
		});
	})();
	return initPromise;
}
