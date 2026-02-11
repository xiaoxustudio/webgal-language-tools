# webgal-language-tools

> ⚡Provide language support for webgal script based-on Volar.js [Volar.js](https://volarjs.dev/)

## Quick Start

### For VSCode Users

Install the [webgal-for-vscode](https://marketplace.visualstudio.com/items?itemName=Xuran1783558957.webgal-for-vscode) extension.

### For Monaco Users

The first step is to start the language server with websocket:

```bash
pnpm --filter @webgal/language-server run dev:ws
```

```ts
import * as monaco from "monaco-editor";
import { createWebgalMonocaLanguageClient } from "@webgal/monoca";

await createWebgalMonocaLanguageClient({
	monaco,
	languageServerUrl: "ws://localhost:3001/webgal-lsp"
});
```

You can also use the `clientHandlers` to override the default behavior of the language client.

```ts
await createWebgalMonocaLanguageClient({
	monaco,
	languageServerUrl: "ws://localhost:3001/webgal-lsp",
	clientHandlers: {
		"client/currentDirectory": () => "/project",
		"client/FJoin": (args) =>
			Array.isArray(args) ? args.filter(Boolean).join("/") : args,
		"client/findFile": ([root, name]) => `${root}/${name}`,
		"client/FStat": () => true,
		"client/goPropertyDoc": () => null,
		"client/showTip": () => null
	}
});
```

## Packages

| Package                                               | Description                                 |
| :---------------------------------------------------- | :------------------------------------------ |
| [@webgal/language-core](./packages/language-core)     | Contains some configurations and core tools |
| [@webgal/language-server](./packages/language-server) | LSP Language Service                        |
| [@webgal/language-client](./packages/language-server) | LSP Language Client                         |
| [vscode](./packages/vscode-extension)                 | vscode extension                            |

## License

[MIT](./LICENSE) License
