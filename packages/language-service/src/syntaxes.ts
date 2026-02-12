import webgalTm from "../syntaxes/webgal.tmLanguage.json" with { type: "json" };
import webgalConfigTm from "../syntaxes/webgal-config.tmLanguage.json" with { type: "json" };
import languageConfig from "../syntaxes/language-configuration.json" with { type: "json" };

export const webgalGrammar = webgalTm;
export const webgalConfigGrammar = webgalConfigTm;
export const webgalLanguageConfiguration = languageConfig;
