import {
	createConnection,
	createServer,
	createSimpleProject
} from "@volar/language-server/browser";
import type { StartServerOptions } from "@/types";
import { startServer as startLanguageServer } from "./server/startServer";

export { createConnection } from "@volar/language-server/browser";
export type { StartServerOptions, LspFeatureOptions } from "./types";

/**
 * 启动服务器并建立连接
 * @param connection - 可选的连接实例，如果未提供则会创建新的连接
 * @returns 返回连接实例
 */
export function startServer(
	connection?: ReturnType<typeof createConnection>,
	options?: StartServerOptions
) {
	const resolvedConnection = connection ?? createConnection();
	startLanguageServer(
		resolvedConnection,
		true,
		createServer,
		createSimpleProject,
		options
	);
	return resolvedConnection;
}
