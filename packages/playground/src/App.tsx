import { useCallback, useMemo } from "react";
import { loader } from "@monaco-editor/react";
import * as Monaco from "monaco-editor";
import { initWebgalMonaco } from "@webgal/language-service/monaco";

import StartText from "./assets/start.txt?raw";
import ConfigText from "./assets/config.txt?raw";
import corePackage from "../../language-core/package.json";
import serverPackage from "../../language-server/package.json";
import servicePackage from "../../language-service/package.json";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import EditorPane from "./components/EditorPane";
import { usePlaygroundWorkspace } from "./hooks/usePlaygroundWorkspace";
import { useWebSocketLsp } from "./hooks/useWebSocketLsp";

import "./App.css";

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import textmateWorker from "@codingame/monaco-vscode-textmate-service-override/worker?worker";

self.MonacoEnvironment = {
	getWorker(_moduleId, label) {
		if (label === "TextMateWorker") {
			return new textmateWorker();
		}
		return new editorWorker();
	}
};

loader.config({ monaco: Monaco });
loader.init();

await initWebgalMonaco();

function App() {
	const workspace = usePlaygroundWorkspace({
		startText: StartText,
		configText: ConfigText,
		autoInitWorker: false
	});
	const { webSocketStatus, toggleWebSocket, connectWebSocket } =
		useWebSocketLsp({
			editorRef: workspace.editorRef,
			applyRemoteVfs: workspace.applyRemoteVfs,
			onConnectionFailed: workspace.ensureWorkerWorkspace
		});

	const handleEditorMount = useCallback(
		async (
			editor: Monaco.editor.IStandaloneCodeEditor,
			monaco: typeof Monaco
		) => {
			workspace.handleEditorDidMount(editor, monaco);
			const connected = await connectWebSocket();
			if (!connected) {
				await workspace.ensureWorkerWorkspace();
			}
		},
		[connectWebSocket, workspace]
	);

	const versionItems = useMemo(
		() => [
			{ label: "core", value: corePackage.version },
			{ label: "server", value: serverPackage.version },
			{ label: "service", value: servicePackage.version }
		],
		[]
	);

	const githubUrl = "https://github.com/xiaoxustudio/webgal-language-tools";

	return (
		<div className="app">
			<Header
				title="WebGAL Playground"
				githubUrl={githubUrl}
				versionItems={versionItems}
			/>
			<div className="app-body">
				<Sidebar
					newFilePath={workspace.newFilePath}
					newFolderPath={workspace.newFolderPath}
					selectedPath={workspace.selectedPath}
					tree={workspace.tree}
					rootPath={workspace.rootPath}
					expandedPaths={workspace.expandedPaths}
					onFilePathChange={workspace.setNewFilePath}
					onFolderPathChange={workspace.setNewFolderPath}
					onCreateFile={workspace.handleCreateFile}
					onCreateFolder={workspace.handleCreateFolder}
					onDeleteSelected={workspace.handleDeleteSelected}
					onSelectPath={workspace.handleSelectPath}
					onOpenFile={workspace.openFile}
					onTogglePath={workspace.handleTogglePath}
				/>
				<EditorPane
					activePath={workspace.activePath}
					displayPath={workspace.displayPath}
					currentLanguage={workspace.currentLanguage}
					onEditorMount={handleEditorMount}
					onWebSocketMode={toggleWebSocket}
					webSocketStatus={webSocketStatus}
				/>
			</div>
		</div>
	);
}

export default App;
