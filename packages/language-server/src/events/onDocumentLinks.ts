import { getTypeDirectory } from "@/utils/resources";
import {
	Connection,
	DocumentLink,
	Range,
	Position
} from "@volar/language-server";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { WebgalDocumentLinkCandidate } from "@/utils";

export async function provideDocumentLinks(
	document: TextDocument,
	connection: Connection,
	candidates: WebgalDocumentLinkCandidate[]
): Promise<DocumentLink[]> {
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
		let basePath = await connection.sendRequest<string>(
			"client/FJoin",
			targetPath + "/" + matchText
		);

		const stat = await connection.sendRequest<string>(
			"client/FStat",
			basePath
		);

		if (!stat) {
			basePath = await connection.sendRequest<string>("client/findFile", [
				currentDirectory,
				matchText
			]);
		}
		const tooltip = stat && basePath ? basePath : "unknown file";

		documentLinks.push({
			target: "file:///" + basePath,
			range: Range.create(
				Position.create(candidate.line, candidate.start),
				Position.create(candidate.line, candidate.end)
			),
			tooltip
		} as DocumentLink);
	}

	return [...documentLinks];
}
