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

/**
 * 初始化资源映射对象
 * 包含WebGAL语言服务所需的语法高亮、语言配置和主题等资源
 */
export const initResources = {
	"./webgal.tmLanguage.json": webgalGrammar,
	"./webgal-config.tmLanguage.json": webgalConfigGrammar,
	"./language-configuration.json": webgalLanguageConfiguration,
	"./dark.json": webgalDarkTheme,
	"./white.json": webgalWhiteTheme
};

/**
 * 初始化WebGAL Monaco编辑器环境
 * 该函数会注册WebGAL语言扩展、语法高亮、主题配置等，并初始化Monaco编辑器的服务
 * 使用单例模式，多次调用只会执行一次初始化
 * @returns Promise<void> 初始化完成的Promise
 */
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
