import type {
	InitializeParams,
	InitializeResult
} from "@volar/language-server";
import type { LanguageServerSettings } from "@/server/setting";

export function applyClientCapabilities(
	settings: LanguageServerSettings,
	params: InitializeParams
) {
	settings.applyClientCapabilities(params);
}

export function applyServerCapabilities(
	settings: LanguageServerSettings,
	result: InitializeResult
) {
	settings.applyServerCapabilities(result);
}
