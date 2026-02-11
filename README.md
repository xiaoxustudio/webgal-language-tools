# webgal-language-tools

> ⚡Provide language support for webgal script based-on Volar.js [Volar.js](https://volarjs.dev/)

## Quick Start

### For VSCode Users

Install the [webgal-for-vscode](https://marketplace.visualstudio.com/items?itemName=Xuran1783558957.webgal-for-vscode) extension.

### For Monaco Users

先启动 WebSocket 版 language-server：

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

如果你需要自定义文件系统能力，可以覆盖 clientHandlers：

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
| [vscode](./packages/vscode-extension)                 | vscode extension                            |

## License

[MIT](./LICENSE) License
