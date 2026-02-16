import { startServer } from "@webgal/language-server/browser";

startServer(undefined, {
	features: {
		completion: true,
		hover: true,
		documentLink: true,
		resourceCompletion: true,
		diagnostics: true,
		foldingRange: true,
		definition: true
	}
});
