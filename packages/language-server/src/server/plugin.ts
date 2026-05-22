import type { LanguagePlugin } from "@volar/language-core";
import type { URI } from "vscode-uri";
import {
	createWebgalVirtualCode,
	updateWebgalVirtualCode
} from "./virtualCode";
import { languageConfigId, languageId } from "@/utils/resources";

const webgalLanguagePlugin: LanguagePlugin<URI> = {
	getLanguageId(scriptId) {
		const path = scriptId.path.toLowerCase();
		if (scriptId.scheme !== "file") {
			if (
				path.endsWith("/game/config.txt") ||
				path.endsWith("config.txt")
			) {
				return languageConfigId;
			}
			if (path.endsWith(".txt")) {
				return languageId;
			}
			return languageId;
		}
		if (path.endsWith("/game/config.txt")) {
			return languageConfigId;
		}
		if (path.endsWith(".txt") && path.includes("/game/scene/")) {
			return languageId;
		}
		return undefined;
	},
	createVirtualCode(scriptId, langId, snapshot) {
		if (langId !== languageId && langId !== languageConfigId) {
			return;
		}
		return createWebgalVirtualCode(scriptId, languageId, snapshot);
	},
	updateVirtualCode(_scriptId, virtualCode, newSnapshot) {
		if (
			virtualCode.languageId !== languageId &&
			virtualCode.languageId !== languageConfigId
		) {
			return;
		}
		return updateWebgalVirtualCode(virtualCode, newSnapshot);
	},
	isAssociatedFileOnly(scriptId, langId) {
		if (langId === languageId) {
			return scriptId.path.toLowerCase().endsWith(".txt");
		}
		if (langId === languageConfigId) {
			return scriptId.path.toLowerCase().endsWith("/game/config.txt");
		}
		return false;
	}
};
export default webgalLanguagePlugin;
