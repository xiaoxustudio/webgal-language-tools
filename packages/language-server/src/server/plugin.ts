import type { LanguagePlugin } from "@volar/language-core";
import type { URI } from "vscode-uri";
import { createWebgalVirtualCode, updateWebgalVirtualCode } from "../utils";

const webgalLanguagePlugin: LanguagePlugin<URI> = {
	getLanguageId(scriptId) {
		const path = scriptId.path.toLowerCase();
		if (scriptId.scheme !== "file") {
			if (
				path.endsWith("/game/config.txt") ||
				path.endsWith("config.txt")
			) {
				return "webgal-config";
			}
			if (path.endsWith(".txt")) {
				return "webgal";
			}
			return "webgal";
		}
		if (path.endsWith("/game/config.txt")) {
			return "webgal-config";
		}
		if (path.endsWith(".txt") && path.includes("/game/scene/")) {
			return "webgal";
		}
		return undefined;
	},
	createVirtualCode(scriptId, languageId, snapshot) {
		if (languageId !== "webgal" && languageId !== "webgal-config") {
			return;
		}
		return createWebgalVirtualCode(scriptId, languageId, snapshot);
	},
	updateVirtualCode(_scriptId, virtualCode, newSnapshot) {
		if (
			virtualCode.languageId !== "webgal" &&
			virtualCode.languageId !== "webgal-config"
		) {
			return;
		}
		return updateWebgalVirtualCode(virtualCode, newSnapshot);
	}
};
export default webgalLanguagePlugin;
