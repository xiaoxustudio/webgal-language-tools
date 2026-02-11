import { getState } from "@webgal/language-server/src/utils/providerState";
import { LanguageClient } from "vscode-languageclient/node";

const goPropertyDoc = (client: LanguageClient) => {
	client.onRequest("client/goPropertyDoc", async (pathSegments: string[]) => {
		try {
			return getState(pathSegments);
		} catch (e: any) {
			return null;
		}
	});
};

export default goPropertyDoc;
