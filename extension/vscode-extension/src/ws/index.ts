import EventEmitter from "events";
import WebSocket from "ws";
import * as vscode from "vscode";
import {
	DebugCommand,
	RuntimeVariable,
	type FileAccessor,
	type IDebugMessage,
	type IRuntimeVariableType,
	type StageSyncMessage
} from "@webgal/language-core";
import {
	disableGameStatus,
	enableGameStatus,
	is_JSON,
	setGameData
} from "@/utils/utils";

type ScopeKey = "local" | "env" | "scene";

export type RuntimeConfig = {
	program: string;
	ws?: string;
};

const defaultWs = "ws://localhost:3001/api/webgalsync";

function toRuntimeVariableValue(value: unknown): IRuntimeVariableType {
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return value;
	}
	if (value === null || value === undefined) {
		return String(value);
	}
	return JSON.stringify(value);
}

export default class Runtime extends EventEmitter {
	private socket: WebSocket | null = null;
	private config: RuntimeConfig | null = null;
	private decorationType: vscode.TextEditorDecorationType | null = null;
	private currentLine = -1;

	public variables = new Map<ScopeKey, Map<string, RuntimeVariable>>([
		["local", new Map<string, RuntimeVariable>()],
		["env", new Map<string, RuntimeVariable>()],
		["scene", new Map<string, RuntimeVariable>()]
	]);

	constructor(public fileAccessor: FileAccessor) {
		super();
		this.initializeVariables();
	}

	async start(config: RuntimeConfig) {
		this.config = {
			program: config.program,
			ws: config.ws || defaultWs
		};
		this.connect();
	}

	dispose() {
		this.clearDecorations();
		this.currentLine = -1;
		this.initializeVariables();
		if (this.socket) {
			this.socket.removeAllListeners();
			if (
				this.socket.readyState === WebSocket.OPEN ||
				this.socket.readyState === WebSocket.CONNECTING
			) {
				this.socket.close();
			}
		}
		this.socket = null;
		disableGameStatus();
	}

	public getLocalVariables(type: "env" | "scene" | "var"): RuntimeVariable[] {
		switch (type) {
			case "env": {
				return Array.from(
					this.variables.get("env") as Map<string, RuntimeVariable>,
					([, value]) => value
				);
			}
			case "scene": {
				return Array.from(
					this.variables.get("scene") as Map<string, RuntimeVariable>,
					([, value]) => value
				);
			}
			case "var": {
				return Array.from(
					this.variables.get("local") as Map<string, RuntimeVariable>,
					([, value]) => value
				);
			}
			default: {
				return Array.from(
					this.variables.get("local") as Map<string, RuntimeVariable>,
					([, value]) => value
				);
			}
		}
	}

	sendRunLine(line: number) {
		const config = this.config;
		if (!config) {
			return;
		}
		this.sendMessage({
			event: "message",
			data: {
				command: DebugCommand.JUMP,
				sceneMsg: {
					scene: config.program,
					sentence: line
				},
				stageSyncMsg: {},
				message: "Sync"
			}
		});
	}

	sendScript(script: string) {
		const config = this.config;
		if (!config) {
			return;
		}
		this.sendMessage({
			event: "message",
			data: {
				command: DebugCommand.EXE_COMMAND,
				sceneMsg: {
					scene: config.program,
					sentence: 1
				},
				stageSyncMsg: {},
				message: script
			}
		});
	}

	setVariable(name: string, value: string) {
		this.sendScript(`setVar:${name}=${value};`);
	}

	private connect() {
		const config = this.config;
		if (!config) {
			return;
		}
		const socket = new WebSocket(config.ws || defaultWs);
		this.socket = socket;

		socket.on("open", () => this.onOpen(socket, config));
		socket.on("error", () => this.onError());
		socket.on("close", () => this.onClose());
		socket.on("message", (data: Buffer) => this.onMessage(data));
	}

	private onOpen(socket: WebSocket, config: RuntimeConfig) {
		if (socket.readyState !== WebSocket.OPEN) {
			return;
		}
		enableGameStatus(socket);
		this.sendRunLine(0);
		this.showInfo(`(webgal)调试连接到：${config.ws || defaultWs}`);
		this.emit("connected");
	}

	private onError() {
		this.showError("(webgal)调试连接错误，请重试！");
		this.emit("error");
		this.dispose();
	}

	private onClose() {
		setGameData({});
		this.showError("(webgal)调试关闭！");
		this.dispose();
		this.emit("terminated");
	}

	private onMessage(data: Buffer) {
		const text = data.toString();
		if (!is_JSON(text)) {
			return;
		}
		const payload = JSON.parse(text) as IDebugMessage;
		this.updateVariables(payload);
		setGameData(payload);
		this.updateDecoration(payload?.data?.sceneMsg ?? {});
	}

	private updateVariables(payload: IDebugMessage) {
		const stageSyncMsg: StageSyncMessage =
			payload?.data?.stageSyncMsg ?? {};
		const sceneMsg = (payload?.data?.sceneMsg ?? {}) as Record<
			string,
			unknown
		>;
		const gameVar = stageSyncMsg.GameVar ?? {};

		const next = new Map<ScopeKey, Map<string, RuntimeVariable>>([
			["local", new Map<string, RuntimeVariable>()],
			["env", new Map<string, RuntimeVariable>()],
			["scene", new Map<string, RuntimeVariable>()]
		]);

		for (const [key, value] of Object.entries(gameVar)) {
			next.get("local")?.set(
				key,
				new RuntimeVariable(key, toRuntimeVariableValue(value))
			);
		}

		for (const [key, value] of Object.entries(stageSyncMsg)) {
			if (key === "GameVar") {
				continue;
			}
			next.get("env")?.set(
				key,
				new RuntimeVariable(key, toRuntimeVariableValue(value))
			);
		}

		for (const key of Object.keys(sceneMsg)) {
			next.get("scene")?.set(
				key,
				new RuntimeVariable(key, sceneMsg[key] as string)
			);
		}

		this.variables = next;
	}

	private updateDecoration(sceneMsg: Record<string, unknown>) {
		const editor = vscode.window.activeTextEditor;
		if (!editor || !editor.document) {
			return;
		}
		const sceneName = String(sceneMsg.scene ?? "");
		const sentence = Number(sceneMsg.sentence ?? -1);
		if (!sceneName || Number.isNaN(sentence)) {
			return;
		}
		const currentFile = this.basename(editor.document.fileName);
		const targetFile = this.basename(sceneName);
		if (!currentFile || !targetFile || currentFile !== targetFile) {
			return;
		}
		const lineIndex = Math.max(sentence, 0);
		if (this.currentLine === lineIndex) {
			return;
		}
		this.currentLine = lineIndex;
		if (!this.decorationType) {
			this.decorationType = vscode.window.createTextEditorDecorationType({
				backgroundColor: "rgba(150, 0, 0, 0.3)",
				isWholeLine: true
			});
		}
		const range = new vscode.Range(
			lineIndex,
			0,
			lineIndex,
			editor.document.lineAt(lineIndex).text.length
		);
		editor.setDecorations(this.decorationType, [range]);
	}

	private clearDecorations() {
		if (!this.decorationType) {
			return;
		}
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			editor.setDecorations(this.decorationType, []);
		}
		this.decorationType.dispose();
		this.decorationType = null;
	}

	private basename(filePath: string) {
		const normalized = filePath.replace(/\\/g, "/");
		const parts = normalized.split("/");
		return parts[parts.length - 1] ?? "";
	}

	private initializeVariables() {
		this.variables = new Map<ScopeKey, Map<string, RuntimeVariable>>([
			["local", new Map<string, RuntimeVariable>()],
			["env", new Map<string, RuntimeVariable>()],
			["scene", new Map<string, RuntimeVariable>()]
		]);
	}

	private sendMessage(message: IDebugMessage) {
		if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
			return;
		}
		this.socket.send(JSON.stringify(message));
	}

	private showInfo(message: string) {
		vscode.window.showInformationMessage(message);
	}

	private showError(message: string) {
		vscode.window.showErrorMessage(message);
	}
}
