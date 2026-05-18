import { StateConfig } from "@/server/setting";
import type { ConnectionHandler } from "@/types";
import { DidChangeConfigurationNotification } from "@volar/language-server";

export default <ConnectionHandler>function (_, connection) {
	if (StateConfig.hasConfigurationCapability) {
		connection.client.register(
			DidChangeConfigurationNotification.type,
			undefined
		);
	}
	if (StateConfig.hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders((_event) => {
			connection.console.log("Workspace folder change event received.");
		});
	}

	connection.sendRequest("client/showTip", "WebGal LSP Initialized");
};
