import type { ConnectionHandler, ServerSettings } from "@/types";
import type { LanguageServerSettings } from "@/server/setting";

export default function (settings: LanguageServerSettings) {
	return <ConnectionHandler>function (documents, connection) {
		// 关闭文档时删除设置缓存
		documents.onDidClose((e) => {
			settings.removeDocumentSettings(e.document.uri);
		});

		// 客户端配置改变通知
		connection.onDidChangeConfiguration((change) => {
			if (settings.hasConfigurationCapability) {
				// 如果支持 workspace/configuration，我们只是清空缓存，下一次请求会重新通过 getConfiguration 拉取
				settings.clearDocumentSettings();
			} else {
				// 客户端不支持 workspace/configuration，settings 值随 didChangeConfiguration 通过参数下发
				const newSettings = <ServerSettings>(
					(change.settings.XRWebGalLanguageServer ||
						settings.getGlobalSettings())
				);
				settings.setGlobalSettings(newSettings);
			}
			connection.languages.diagnostics.refresh(); // 重新校验
		});
		connection.onNotification("webgal/vfsChanged", () => {
			if (!settings.getFeatureOptions().documentLink) {
				return;
			}
			void connection.sendRequest("workspace/documentLink/refresh");
		});
	};
}
