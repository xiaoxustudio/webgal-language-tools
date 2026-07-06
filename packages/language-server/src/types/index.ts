import type {
	Connection,
	Event,
	FoldingRange,
	TextDocumentChangeEvent,
	VirtualCode
} from "@volar/language-server";
import type { IDefinetionMap, IDepItem } from "@webgal/language-core";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type { URI } from "vscode-uri";
export interface ServerSettings {
	maxNumberOfProblems: number;
	isShowWarning: boolean; // 是否显示警告
	isShowHint: "关闭" | "最前面" | "变量名前" | "变量名后" | "最后面";
	isShowImagePreview: boolean; // 是否显示图片预览
}

export type LspFeatureOptions = {
	completion: boolean;
	hover: boolean;
	documentLink: boolean;
	resourceCompletion: boolean;
	diagnostics: boolean;
	foldingRange: boolean;
	definition: boolean;
	formatting: boolean;
	inlayHint: boolean;
};

export type StartServerOptions = {
	features?: Partial<LspFeatureOptions>;
};

export type ConnectionDocumentsType = {
	onDidClose: Event<TextDocumentChangeEvent<TextDocument>>;
	get(uri: URI): TextDocument | undefined;
};

export type ConnectionHandler = (
	documents: ConnectionDocumentsType,
	connection: Connection
) => void;

export type WebgalDocumentLinkCandidate = {
	line: number;
	start: number;
	end: number;
	text: string;
	command: string;
};

export type WebgalVirtualCode = VirtualCode & {
	webgalDefinitionMap?: IDefinetionMap;
	webgalDocumentLinkCandidates?: WebgalDocumentLinkCandidate[];
	webgalFoldingRanges?: FoldingRange[];
	webgalLines?: string[];
	webgalLineCommandTypes?: string[];
	webgalOriginalId?: string;
	/** 当前文件引用的所有场景依赖 */
	webgalDeps?: IDepItem[];
};
