import {
	Connection,
	Event,
	TextDocumentChangeEvent
} from "@volar/language-server";
import { TextDocument } from "vscode-languageserver-textdocument";
export interface ServerSettings {
	maxNumberOfProblems: number;
	isShowWarning: boolean; // 是否显示警告
	isShowHint: "关闭" | "最前面" | "变量名前" | "变量名后" | "最后面";
}

export type LspFeatureOptions = {
	completion: boolean;
	hover: boolean;
	documentLink: boolean;
	resourceCompletion: boolean;
	diagnostics: boolean;
	foldingRange: boolean;
	definition: boolean;
};

export type StartServerOptions = {
	features?: Partial<LspFeatureOptions>;
};

export type ConnectionDocumentsType = {
	onDidClose: Event<TextDocumentChangeEvent<TextDocument>>;
};

export type ConnectionHandler = (
	documents: ConnectionDocumentsType,
	connection: Connection
) => void;
