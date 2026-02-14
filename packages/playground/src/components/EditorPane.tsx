import Editor from "@monaco-editor/react";
import type { EditorProps } from "@monaco-editor/react";

type EditorPaneProps = {
	activePath: string;
	displayPath: string;
	currentLanguage: string;
	onEditorMount: EditorProps["onMount"];
	onWebSocketMode: () => void;
};

export default function EditorPane({
	activePath,
	displayPath,
	currentLanguage,
	onEditorMount,
	onWebSocketMode
}: EditorPaneProps) {
	return (
		<section className="editor-pane">
			<div className="editor-toolbar">
				<div className="path-label">
					{displayPath || "未选择文件"}
				</div>
				<button onClick={onWebSocketMode} disabled>
					WebSocket 模式
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
