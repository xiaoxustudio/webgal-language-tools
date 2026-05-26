import type { ConnectionHandler } from "@/types";
import { DidChangeConfigurationNotification } from "@volar/language-server";
import type { LanguageServerSettings } from "@/server/setting";

export default function (settings: LanguageServerSettings) {
	return <ConnectionHandler>function (_, connection) {
		if (settings.hasConfigurationCapability) {
			connection.client.register(
				DidChangeConfigurationNotification.type,
				undefined
			);
		}
		if (settings.hasWorkspaceFolderCapability) {
			connection.workspace.onDidChangeWorkspaceFolders(() => {
				connection.console.log(
					"Workspace folder change event received."
				);
			});
		}

		connection.sendRequest("client/showTip", "WebGal LSP Initialized");
	};
}
