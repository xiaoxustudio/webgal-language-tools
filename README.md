# webgal-language-tools

> ⚡Provide language support for webgal script based-on Volar.js [Volar.js](https://volarjs.dev/)

## Quick Start

### For VSCode Users

Install the [webgal-for-vscode](https://marketplace.visualstudio.com/items?itemName=Xuran1783558957.webgal-for-vscode) extension.

### For Monaco Users (Ideal state, currently not achieved)

We have two startup modes: 

- **Websocket Mode**: Start the language server with websocket.

```bash
pnpm --filter @webgal/language-server run dev:ws
```

```ts
import * as monaco from "monaco-editor";
import { createWebgalMonocaLanguageClient } from "@webgal/monoca";

await createWebgalMonocaLanguageClient({
  monaco,
  languageServerUrl: "ws://localhost:3001/webgal-lsp",
  virtualFileSystem: vfsRef.current,
});
```

- **Browser Mode**: Start the language server with browser.

```ts
import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { createWebgalMonocaLanguageClient } from "@webgal/monoca";
import { createMemoryFileSystem } from "@webgal/language-client";

export function WebgalEditor() {
  const clientRef = useRef<any>(null);

  const vfsRef = useRef(
    createMemoryFileSystem({
      root: "/project",
    })
  );

  useEffect(() => {
    void vfsRef.current.applyChanges([
      { type: "mkdir", path: "/project/game" },
      { type: "mkdir", path: "/project/game/scene" },
      { type: "writeFile", path: "/project/game/config.txt", content: "Game_name:Demo\n" },
      { type: "writeFile", path: "/project/game/scene/start.txt", content: "setVar:heroine=WebGAL;\n" },
    ]);

    return () => {
      clientRef.current?.stop?.();
    };
  }, []);

  return (
    <Editor
      height="70vh"
      defaultLanguage="webgal"
      path="file:///project/game/scene/start.txt"
      defaultValue={"setVar:heroine=WebGAL;\n"}
      onMount={async (_editor, monaco) => {
        if (clientRef.current) return;
        clientRef.current = await createWebgalMonocaLanguageClient({
          monaco,
          mode: "worker",
          virtualFileSystem: vfsRef.current,
          id: "webgal",
          name: "WebGAL Language Client",
        });
      }}
    />
  );
}
```

## Packages

| Package                                                 | Description                                 |
| :------------------------------------------------------ | :------------------------------------------ |
| [@webgal/language-core](./packages/language-core)       | Contains some configurations and core tools |
| [@webgal/language-server](./packages/language-server)   | LSP Language Server                         |
| [@webgal/language-service](./packages/language-service) | LSP Language Service                        |
| [playground](./packages/playground)                     | Playground                                  |
| [vscode](./packages/vscode-extension)                   | vscode extension                            |

## License

[MPL 2.0](./LICENSE) License
