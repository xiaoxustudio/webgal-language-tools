import type { ConnectionHandler, ServerSettings } from "@/types";
import type { LanguageServerSettings } from "@/server/setting";

export default function (settings: LanguageServerSettings) {
	return <ConnectionHandler>function (documents, connection) {
		connection.console.info("[WebGalLanguageServer] Registering event handlers...");

		// 关闭文档时删除设置缓存
		documents.onDidClose((e) => {
			settings.removeDocumentSettings(e.document.uri);
		});

		// 使用自定义通知 "webgal/updateConfiguration" 接收客户端配置，
		// 绕过 @volar/language-server 和 vscode-languageclient@9 对标准
		// didChangeConfiguration 可能存在的拦截/吞掉问题。
		connection.onNotification("webgal/updateConfiguration", (config: ServerSettings) => {
			connection.console.info(
				`[WebGalLanguageServer] Received config update: ${JSON.stringify(config)}`
			);
			if (config && typeof config === "object" && Object.keys(config).length > 0) {
				connection.console.info(
					`[WebGalLanguageServer] Applying config - isShowWarning: ${config.isShowWarning}`
				);
				settings.clearDocumentSettings();
				settings.setGlobalSettings(config);
				connection.console.info(
					`[WebGalLanguageServer] Config applied successfully.`
				);
			} else {
				connection.console.warn(
					`[WebGalLanguageServer] Received empty/invalid config, ignoring.`
				);
			}
			void connection.sendRequest("workspace/diagnostic/refresh").catch(
				(e) =>
					connection.console.warn(
						`[WebGalLanguageServer] Refresh diagnostics failed: ${e}`
					)
			);
			void connection.sendRequest("workspace/inlayHint/refresh").catch(
				(e) =>
					connection.console.warn(
						`[WebGalLanguageServer] Refresh inlayHint failed: ${e}`
					)
			);
		});

		// 同时保留标准 didChangeConfiguration 作为兜底（兼容旧版客户端）
		connection.onDidChangeConfiguration((change) => {
			connection.console.info(
				`[WebGalLanguageServer] Legacy didChangeConfiguration received: ${JSON.stringify(change.settings?.WebGalLanguageServer ?? null)}`
			);
			const clientConfig = change.settings?.WebGalLanguageServer;
			if (clientConfig && typeof clientConfig === "object" && Object.keys(clientConfig).length > 0) {
				settings.clearDocumentSettings();
				settings.setGlobalSettings(<ServerSettings>clientConfig);
			}
		});

		connection.onNotification("webgal/vfsChanged", () => {
			if (!settings.getFeatureOptions().documentLink) {
				return;
			}
			void connection.sendRequest("workspace/documentLink/refresh");
		});
	};
}
