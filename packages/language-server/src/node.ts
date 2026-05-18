import { createConnection } from "@volar/language-server/node";
import { startWebSocketServer, getWsOptions, startServer } from "./server/wrap";

const args = process.argv.slice(2);
const useWs = args.some((arg) => arg === "--ws" || arg.startsWith("--ws="));
if (useWs) {
	void startWebSocketServer(getWsOptions(args));
} else {
	startServer(createConnection(), false);
}
