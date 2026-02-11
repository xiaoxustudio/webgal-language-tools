import { ConnectionHandler } from "@/types";
import { StateConfig } from "@/utils";
import { DidChangeConfigurationNotification } from "@volar/language-server";

export default <ConnectionHandler>function (_, connection) {
	connection.onInitialized(() => {
		if (StateConfig.hasConfigurationCapability) {
			connection.client.register(
				DidChangeConfigurationNotification.type,
				undefined
			);
		}
		if (StateConfig.hasWorkspaceFolderCapability) {
			connection.workspace.onDidChangeWorkspaceFolders((_event) => {
				connection.console.log(
					"Workspace folder change event received."
				);
			});
		}

		connection.sendRequest("client/showTip", "WebGal LSP Initialized");
	});
};
