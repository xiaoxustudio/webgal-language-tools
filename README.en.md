# webgal-language-tools

English | [中文](./README.md)

> ⚡ Provides language support for WebGAL scripts, based on [Volar.js](https://volarjs.dev/)

## Packages

| packages                                                | Version                                                                   | Description                   |
| :------------------------------------------------------ | :------------------------------------------------------------------------ | :---------------------------- |
| [@webgal/language-core](./packages/language-core)       | ![NPM Version](https://img.shields.io/npm/v/%40webgal%2Flanguage-core)    | Configurations and core tools |
| [@webgal/language-server](./packages/language-server)   | ![NPM Version](https://img.shields.io/npm/v/%40webgal%2Flanguage-server)  | LSP language server           |
| [@webgal/language-service](./packages/language-service) | ![NPM Version](https://img.shields.io/npm/v/%40webgal%2Flanguage-service) | LSP language service          |
| [playground](./packages/playground)                     |                                                                           | Demo                          |

| extension                                        | Description      |
| :----------------------------------------------- | :--------------- |
| [vscode-extension](./extension/vscode-extension) | VSCode extension |


## Quick Start

### VSCode Users

Install the [webgal-for-vscode](https://marketplace.visualstudio.com/items?itemName=Xuran1783558957.webgal-for-vscode) extension.

### Monaco Users

We provide two ways to use WebGAL language services in `Monaco`.

The examples are based on monaco-editor and @monaco-editor/react.

##### WebSocket Mode

> [!WARNING]
> Note: you need to pin the `monaco-editor` version: `npm i monaco-editor@npm:@codingame/monaco-vscode-editor-api@26.1.1`
>
> - If you hit monaco version mismatch type errors during build, ensure all monaco-vscode packages are locked to 26.1.1 and use pnpm.overrides at the workspace root to enforce it.

- Connect to a local language server via WebSocket, suitable for separated frontend and backend projects.

Start the language server:

If you are using this repo source:

```bash
pnpm dev:lsp-ws
```

If you are using this repo build output, run it under `node`. Create an empty `node` project and install the `server` package:

```bash
npm i @webgal/language-server
```

Then create a file like `webgal-lsp.js`:

```js
require("@webgal/language-server");
```

Finally start it:

```bash
node webgal-lsp.js --ws --wsPort=5882 --wsPath=/webgal-lsp
```

Frontend example (with @monaco-editor/react):

Create a `vite` project and install dependencies:

```bash
npm i @webgal/language-service
```

Then put the following in `App.tsx` (install other dependencies yourself, see the note at the end):

```ts
import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import {
	createMemoryFileSystem,
	initWebgalMonaco,
	createWebgalMonacoLanguageClient
} from "@webgal/language-service/monaco";

await initWebgalMonaco();

export function WebgalEditor() {
  const clientRef = useRef<{ webSocket: WebSocket } | null>(null);
  const vfsRef = useRef(
    createMemoryFileSystem({
      root: "file:///project",
    })
  );

  useEffect(() => {
    void vfsRef.current.applyChanges([
      { type: "mkdir", path: "file:///project/game" },
      { type: "mkdir", path: "file:///project/game/scene" },
      { type: "writeFile", path: "file:///project/game/config.txt", content: "Game_name:Demo\n" },
      { type: "writeFile", path: "file:///project/game/scene/start.txt", content: "setVar:heroine=WebGAL;\n" },
    ]);
    return () => {
      clientRef.current?.webSocket?.close();
    };
  }, []);

  return (
    <Editor
      height="70vh"
      defaultLanguage="webgal"
      path="file:///project/game/scene/start.txt"
      defaultValue={"setVar:heroine=WebGAL;\n"}
      onMount={async (editor: monaco.editor.IStandaloneCodeEditor) => {
        if (clientRef.current) return;
        clientRef.current = createWebgalMonacoLanguageClient({
          languageServerUrl: "ws://localhost:5882/webgal-lsp",
          editor,
          virtualFileSystem: vfsRef.current,
        });
      }}
    />
  );
}
```

##### Browser Mode

- Start the language server in the browser via `Web Worker`, and communicate with the frontend language client without a backend.

Create a local Worker entry file (e.g. `src/webgal-lsp.worker.ts`)

```ts
import { startServer } from "@webgal/language-server/browser";

startServer();
```

The logic is roughly the same as the `websocket` mode:

```ts
import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import {
  initWebgalMonaco,
  createWebgalMonacoLanguageClientWithWorker,
  createMemoryFileSystem
} from "@webgal/language-service";

export function WebgalEditor() {
  const clientRef = useRef<{ worker: Worker } | null>(null);
  const vfsRef = useRef(
    createMemoryFileSystem({
      root: "file:///game",
    })
  );

  useEffect(() => {
    void initWebgalMonaco();
    void vfsRef.current.applyChanges([
      { type: "mkdir", path: "file:///game/scene" },
      { type: "writeFile", path: "file:///game/config.txt", content: "Game_name:Demo\n" },
      { type: "writeFile", path: "file:///game/scene/start.txt", content: "setVar:heroine=WebGAL;\n" },
    ]);
    return () => {
      clientRef.current?.worker?.terminate();
    };
  }, []);

  return (
    <Editor
      height="70vh"
      defaultLanguage="webgal"
      path="file:///game/scene/start.txt"
      defaultValue={"setVar:heroine=WebGAL;\n"}
      onMount={async (editor: monaco.editor.IStandaloneCodeEditor) => {
        if (clientRef.current) return;
        const worker = new Worker(
          new URL("./webgal-lsp.worker.ts", import.meta.url),
          { type: "module" }
        );
        clientRef.current = createWebgalMonacoLanguageClientWithWorker({
          worker,
          editor,
          virtualFileSystem: vfsRef.current,
        });
      }}
    />
  );
}
```

For more information, please refer to [Playground](https://github.com/xiaoxustudio/webgal-language-tools/tree/master/packages/playground) The writing style

## License

[MPL 2.0](./LICENSE) License
