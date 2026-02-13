import * as monaco from "monaco-editor";
import {
	createMemoryFileSystem,
	createWebgalMonacoLanguageClientWithPort,
	initWebgalMonaco
} from "@webgal/language-service";
import { startServer, createConnection } from "@webgal/language-server/browser";
import {
	BrowserMessageReader,
	BrowserMessageWriter
} from "vscode-languageclient/browser.js";

await initWebgalMonaco();

export default function (editor: monaco.editor.IStandaloneCodeEditor): {
	vfs: ReturnType<typeof createMemoryFileSystem>;
} {
	const channel = new MessageChannel();
	const port1 = channel.port1;
	const port2 = channel.port2;

	// Server side connection
	// We use BrowserMessageReader/Writer from vscode-languageclient, which should be compatible
	// or we might need to cast if types mismatch due to version differences
	const reader = new BrowserMessageReader(port1);
	const writer = new BrowserMessageWriter(port1);

	// @ts-expect-error - types might slightly mismatch between client/server packages
	const connection = createConnection(reader, writer);
	startServer(connection);

	// Client side
	const { vfs } = createWebgalMonacoLanguageClientWithPort({
		editor,
		port: port2,
		virtualFileSystem: createMemoryFileSystem()
	});

	return { vfs };
}
