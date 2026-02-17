import Editor from "@monaco-editor/react";
import type { EditorProps } from "@monaco-editor/react";

type EditorPaneProps = {
	activePath: string;
	displayPath: string;
	currentLanguage: string;
	onEditorMount: EditorProps["onMount"];
	onWebSocketMode: () => void;
	webSocketStatus: "connected" | "connecting" | "disconnected";
};

export default function EditorPane({
	activePath,
	displayPath,
	currentLanguage,
	onEditorMount,
	onWebSocketMode,
	webSocketStatus
}: EditorPaneProps) {
	const statusClass =
		webSocketStatus === "connected"
			? "ws-dot ws-dot--connected"
			: webSocketStatus === "connecting"
				? "ws-dot ws-dot--connecting"
				: "ws-dot ws-dot--disconnected";
	const buttonLabel =
		webSocketStatus === "connected" ? "WebSocket 暂停" : "WebSocket 连接";
	return (
		<section className="editor-pane">
			<div className="editor-toolbar">
				<div className="path-label">
					{displayPath || "未选择文件"}
				</div>
				<button onClick={onWebSocketMode}>
					{buttonLabel}
					<span className={statusClass} />
				</button>
			</div>
			<div className="editor-wrapper">
				<Editor
					height="100%"
					defaultLanguage="webgal"
					width="100%"
					onMount={onEditorMount}
					language={currentLanguage}
					path={activePath}
					theme="webgal-dark"
					options={{
						quickSuggestions: {
							other: true,
							comments: true,
							strings: true
						},
						minimap: { enabled: false }
					}}
				/>
			</div>
		</section>
	);
}
