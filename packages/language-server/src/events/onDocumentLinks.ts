import { getTypeDirectory } from "@/utils/resources";
import type { Connection, DocumentLink } from "@volar/language-server";
import { Range, Position } from "@volar/language-server";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import type { WebgalDocumentLinkCandidate } from "@/types";

/** 图片文件扩展名 */
const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|bmp|webp|svg)$/i;

/** 判断文件路径是否为图片 */
export function isImageFile(path: string): boolean {
	return IMAGE_EXTENSIONS.test(path);
}

/** 构建图片预览 Markdown 内容 */
export function buildImagePreviewMarkdown(fileUri: string, filePath: string): string {
	return `![Preview](${fileUri}|height=200)\n\n${filePath}`;
}

/** 解析候选文件的实际路径 */
export async function resolveCandidateFile(
	candidate: WebgalDocumentLinkCandidate,
	currentDirectory: string,
	isConfig: boolean,
	connection: Connection
): Promise<string | null> {
	const matchText = candidate.text;
	const dirResources = getTypeDirectory(candidate.command, matchText);
	let targetPath: string;
	if (isConfig) {
		targetPath = await connection.sendRequest<string>(
			"client/FJoin",
			currentDirectory + "/"
		);
	} else {
		targetPath = await connection.sendRequest<string>(
			"client/FJoin",
			currentDirectory + "/" + dirResources
		);
	}
	const defaultPath = await connection.sendRequest<string>(
		"client/FJoin",
		targetPath + "/" + matchText
	);

	let stat = await connection.sendRequest<unknown>(
		"client/FStat",
		defaultPath
	);
	let resolvedPath = defaultPath;

	if (!stat) {
		const foundPath = await connection.sendRequest<string>(
			"client/findFile",
			[currentDirectory, matchText]
		);
		if (foundPath) {
			resolvedPath = foundPath;
			stat = await connection.sendRequest<unknown>(
				"client/FStat",
				resolvedPath
			);
		}
	}

	return stat ? resolvedPath : null;
}

export default function () {
	return async function provideDocumentLinks(
		document: TextDocument,
		connection: Connection,
		candidates: WebgalDocumentLinkCandidate[]
	): Promise<DocumentLink[]> {
		const toFileTarget = (path: string | null) => {
			if (!path) {
				return undefined;
			}
			if (path.startsWith("file://")) {
				return URI.parse(path).toString();
			}
			return URI.file(path).toString();
		};
		const pathArray = document.uri.split("/");
		const currentDirectory = await connection.sendRequest<string>(
			"client/currentDirectory"
		);
		const documentLinks: DocumentLink[] = [];
		const pathName =
			pathArray[
				pathArray.length - 3 > 0
					? pathArray.length - 3
					: pathArray.length - 2
			];
		const isConfig =
			pathArray[pathArray.length - 1] === "config.txt" &&
			pathArray[pathArray.length - 2] === "game" &&
			pathName === pathArray[pathArray.length - 3];
		for (const candidate of candidates) {
			const resolvedPath = await resolveCandidateFile(
				candidate,
				currentDirectory,
				isConfig,
				connection
			);

			if (!resolvedPath) {
				continue;
			}

			const fileUri = toFileTarget(resolvedPath)!;
			// 图片预览由 hover handler 负责，这里 tooltip 只显示路径
			const tooltip = resolvedPath;

			documentLinks.push({
				target: fileUri,
				range: Range.create(
					Position.create(candidate.line, candidate.start),
					Position.create(candidate.line, candidate.end)
				),
				tooltip
			} as DocumentLink);
		}

		return [...documentLinks];
	};
}