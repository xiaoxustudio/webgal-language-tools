import type * as Monaco from "monaco-editor";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type RefObject
} from "react";
import type { VirtualEntry, VirtualFileSystem } from "@webgal/language-service";
import initWS from "../init";

type ApplyRemoteVfs = (args: {
	vfs: VirtualFileSystem;
	tree: VirtualEntry;
	root?: string;
}) => Promise<void> | void;

type UseWebSocketLspOptions = {
	editorRef: RefObject<Monaco.editor.IStandaloneCodeEditor | null>;
	applyRemoteVfs: ApplyRemoteVfs;
	onConnectionFailed?: () => void;
	connectTimeoutMs?: number;
};

export function useWebSocketLsp(options: UseWebSocketLspOptions) {
	const { editorRef, applyRemoteVfs, onConnectionFailed } = options;
	const connectTimeoutMs = options.connectTimeoutMs ?? 2000;
	const webSocketRef = useRef<WebSocket | null>(null);
	const [webSocketStatus, setWebSocketStatus] = useState<
		"connected" | "connecting" | "disconnected"
	>("disconnected");

	const fetchBackendTree = useCallback(async () => {
		const response = await fetch("http://localhost:3000/api/tree");
		if (!response.ok) {
			throw new Error(`Failed to load tree: ${response.status}`);
		}
		return (await response.json()) as {
			tree: VirtualEntry;
			root?: string;
		};
	}, []);

	const closeWebSocket = useCallback(() => {
		const socket = webSocketRef.current;
		if (socket) {
			socket.close();
		}
		webSocketRef.current = null;
		setWebSocketStatus("disconnected");
	}, []);

	const connectWebSocket = useCallback(async (): Promise<boolean> => {
		const editor = editorRef.current;
		if (!editor) return false;
		setWebSocketStatus("connecting");
		try {
			const { tree, root } = await fetchBackendTree();
			const { vfs, webSocket } = initWS(editor, {
				tree,
				root
			});
			webSocketRef.current = webSocket;
			await applyRemoteVfs({ vfs, tree, root });
			const connected = await new Promise<boolean>((resolve) => {
				let settled = false;
				const finish = (value: boolean) => {
					if (settled) return;
					settled = true;
					resolve(value);
				};
				const handleOpen = () => {
					window.clearTimeout(timer);
					cleanup();
					setWebSocketStatus("connected");
					finish(true);
				};
				const handleClose = () => {
					window.clearTimeout(timer);
					cleanup();
					webSocketRef.current = null;
					setWebSocketStatus("disconnected");
					finish(false);
				};
				const handleError = () => {
					window.clearTimeout(timer);
					cleanup();
					webSocketRef.current = null;
					setWebSocketStatus("disconnected");
					finish(false);
				};
				const cleanup = () => {
					webSocket.removeEventListener("open", handleOpen);
					webSocket.removeEventListener("close", handleClose);
					webSocket.removeEventListener("error", handleError);
				};
				const timer = window.setTimeout(() => {
					cleanup();
					finish(false);
				}, connectTimeoutMs);
				webSocket.addEventListener("open", handleOpen);
				webSocket.addEventListener("close", handleClose);
				webSocket.addEventListener("error", handleError);
				if (webSocket.readyState === WebSocket.OPEN) {
					handleOpen();
				}
			});
			if (!connected) {
				closeWebSocket();
				onConnectionFailed?.();
				return false;
			}
			return true;
		} catch {
			setWebSocketStatus("disconnected");
			onConnectionFailed?.();
			return false;
		}
	}, [
		applyRemoteVfs,
		closeWebSocket,
		connectTimeoutMs,
		editorRef,
		fetchBackendTree,
		onConnectionFailed
	]);

	const toggleWebSocket = useCallback(async () => {
		if (webSocketStatus !== "disconnected") {
			closeWebSocket();
			return;
		}
		await connectWebSocket();
	}, [closeWebSocket, connectWebSocket, webSocketStatus]);

	useEffect(() => {
		return () => {
			closeWebSocket();
		};
	}, [closeWebSocket]);

	return {
		webSocketStatus,
		connectWebSocket,
		toggleWebSocket,
		closeWebSocket
	};
}
