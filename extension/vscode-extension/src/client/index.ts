import type {
	LanguageClientOptions,
	ServerOptions
} from "vscode-languageclient/node";
import { LanguageClient, TransportKind } from "vscode-languageclient/node";
import type { ExtensionContext } from "vscode";
import { Uri, workspace } from "vscode";
import { selector, selectorConfig } from "@/utils/utils";

export async function createClient(
	context: ExtensionContext
): Promise<LanguageClient> {
	const serverModule = Uri.joinPath(
		context.extensionUri,
		"build",
		"server.js"
	);

	const runOptions = { execArgv: <string[]>[] };
	const debugOptions = {
		execArgv: ["--nolazy", "--inspect=" + 5882]
	};
	const serverOptions: ServerOptions = {
		run: {
			module: serverModule.fsPath,
			transport: TransportKind.ipc,
			options: runOptions
		},
		debug: {
			module: serverModule.fsPath,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};

	const clientOptions: LanguageClientOptions = {
		documentSelector: [selector, selectorConfig],
		synchronize: {
			configurationSection: "WebGalLanguageServer",
			fileEvents: workspace.createFileSystemWatcher("*")
		}
	};

	const client = new LanguageClient(
		"WEBGAL Language Server",
		"WEBGAL Language Server",
		serverOptions,
		clientOptions
	);

	const { createWebgalClientHandlers, registerWebgalClientHandlers } =
		await import("@webgal/language-service");
	const { createNodeFileSystem } =
		await import("@webgal/language-service/node");

	const rootPath =
		workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
	const vfs = createNodeFileSystem({ root: rootPath });
	const handlers = createWebgalClientHandlers({
		vfs,
		showTip: (message: string) => client.info(message)
	});

	registerWebgalClientHandlers(client, handlers);

	/**
	 * 从 VSCode 配置中提取 WebGalLanguageServer 节的完整配置对象。
	 * 不能直接使用 workspace.getConfiguration().get("WebGalLanguageServer")，
	 * 因为 "WebGalLanguageServer" 是 section 名而非 property 名，该调用返回 undefined。
	 */
	function extractWebGalConfig(): {
			maxNumberOfProblems: number;
			isShowWarning: boolean;
			isShowHint: string;
			isShowImagePreview: boolean;
		} {
			const cfg = workspace.getConfiguration("WebGalLanguageServer");
			return {
				maxNumberOfProblems: cfg.get<number>("maxNumberOfProblems", 1000),
				isShowWarning: cfg.get<boolean>("isShowWarning", true),
				isShowHint: cfg.get<string>("isShowHint", "变量名后"),
				isShowImagePreview: cfg.get<boolean>("isShowImagePreview", true)
			};
		}

	/**
	 * 将当前配置推送给语言服务器。
	 * 使用自定义通知 "webgal/updateConfiguration" 而非标准 didChangeConfiguration，
	 * 避免 @volar/language-server 或 vscode-languageclient@9 拦截/吞掉通知。
	 */
	function pushConfigurationToServer() {
		const config = extractWebGalConfig();
		console.log(
			"[WebGalLanguageServer] Pushing config to server:",
			JSON.stringify(config)
		);
		client
			.sendNotification("webgal/updateConfiguration", config)
			.catch((e) =>
				console.error(
					"[WebGalLanguageServer] Failed to send config:",
					e
				)
			);
	}

	// 服务端就绪后主动推送一次初始配置（vscode-languageclient@9 已废弃自动同步）
	// v9 没有 onReady()，改用 onDidChangeState 监听（State.Running === 2）
	client.onDidChangeState((e) => {
		if (e.newState === 2) {
			pushConfigurationToServer();
		}
	});

	// vscode-languageclient@9 的 SyncConfigurationFeature 已废弃，不会发送 didChangeConfiguration
	// 这里手动监听配置变更并通知服务器
	context.subscriptions.push(
		workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration("WebGalLanguageServer")) {
				pushConfigurationToServer();
			}
		})
	);

	return client;
}
