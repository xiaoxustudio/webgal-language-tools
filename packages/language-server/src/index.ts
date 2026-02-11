import {
	createConnection,
	createServer,
	TextDocuments
} from "@volar/language-server/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import events from "./events";

const connection = createConnection();
const server = createServer(connection);

const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

events(documents, connection);

documents.listen(connection);

connection.listen();

connection.onShutdown(server.shutdown);
