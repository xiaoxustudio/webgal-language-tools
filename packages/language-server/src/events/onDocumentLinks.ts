import { getTypeDirectory } from "@/utils/resources";
import {
	Connection,
	DocumentLink,
	Range,
	Position
} from "@volar/language-server";
import { TextDocument } from "vscode-languageserver-textdocument";

export async function provideDocumentLinks(
	document: TextDocument,
	connection: Connection
): Promise<DocumentLink[]> {
	// 使用 volar.js 的服务式文档链接入口
	const text = document.getText();
	const documentTextArray = text.split("\n");
	const pathArray = document.uri.split("/");
	const currentDirectory = await connection.sendRequest<string>(
		"client/currentDirectory"
	);
	const documentLinks: DocumentLink[] = [];
	for (let i = 0; i < documentTextArray.length; i++) {
		const currentLine = documentTextArray[i];
		let startText = currentLine.substring(
			0,
			currentLine.indexOf(":") !== -1
				? currentLine.indexOf(":")
				: currentLine.indexOf(";")
		);
		startText = startText.startsWith(";") ? startText.substring(1) : startText;
		let match: RegExpExecArray | null;
		const regex = /\$?\{?(\w+)\.(\w+)\}?/g;

		while ((match = regex.exec(currentLine))) {
			if (match[0].startsWith("$")) {
				continue;
			}
			const matchText = match[0];
			const pathName =
				pathArray[
					pathArray.length - 3 > 0 ? pathArray.length - 3 : pathArray.length - 2
				];
			const isConfig =
				pathArray[pathArray.length - 1] === "config.txt" &&
				pathArray[pathArray.length - 2] === "game" &&
				pathName === pathArray[pathArray.length - 3];

			const command = match.input.substring(0, match.input.indexOf(":"));
			const dirResources = getTypeDirectory(command, matchText);
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
				basePath = await connection.sendRequest<string>(
					"client/findFile",
					[currentDirectory, matchText]
				);
			}

			documentLinks.push({
				target: "file:///" + basePath,
				range: Range.create(
					Position.create(i, match.index),
					Position.create(i, match.index + matchText.length)
				),
				tooltip: basePath
			} as DocumentLink);

			if (regex.lastIndex === match.index) {
				regex.lastIndex++;
			}
		}
	}

	return [...documentLinks];
}
