import {
	createConnection,
	createServer,
	createSimpleProject
} from "@volar/language-server/node";
import { startWebSocketServer, getWsOptions, startServer } from "./server/wrap";
import type { StartServerOptions, LspFeatureOptions } from "./types";

export { startWebSocketServer, getWsOptions, startServer };
export type { StartServerOptions, LspFeatureOptions };

const args = process.argv.slice(2);
const useWs = args.some((arg) => arg === "--ws" || arg.startsWith("--ws="));
if (useWs) {
	void startWebSocketServer(getWsOptions(args));
} else {
	startServer(createConnection(), false, createServer, createSimpleProject);
}
