# webgal-language-tools

> ⚡Provide language support for WebGAL script based on Volar.js [Volar.js](https://volarjs.dev/)

## Quick Start

### VSCode Users

Install the [webgal-for-vscode](https://marketplace.visualstudio.com/items?itemName=Xuran1783558957.webgal-for-vscode) extension.

### Monaco Users

We provide two ways to run the WebGAL language service in Monaco. Examples are based on monaco-editor and @monaco-editor/react.

- Pre-initialization: initialize Monaco language configuration and syntax highlighting after page load.

```ts
import { initWebgalMonaco } from "@webgal/language-service/monaco-init";

await initWebgalMonaco();
```

- WebSocket Mode: connect to a local language server via WebSocket.

Start the language server:

```bash
pnpm --filter @webgal/language-server run dev:ws
```

Frontend example (@monaco-editor/react):

```ts
import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { initWebgalMonaco } from "@webgal/language-service/monaco-init";
import { createWebgalMonacoLanguageClient } from "@webgal/language-service/monaco";
import { createMemoryFileSystem } from "@webgal/language-service";

export function WebgalEditor() {
  const clientRef = useRef<{ webSocket: WebSocket } | null>(null);
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
      clientRef.current?.webSocket?.close();
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
        clientRef.current = createWebgalMonacoLanguageClient({
          languageServerUrl: "ws://localhost:3001/webgal-lsp",
          editor,
          virtualFileSystem: vfsRef.current,
        });
      }}
    />
  );
}
```

- Browser (Worker) Mode: start the language server in a Web Worker and communicate with the frontend language client.

Step 1: Create a local Worker entry file (e.g., src/webgal-lsp.worker.ts)

```ts
import { startServer } from "@webgal/language-server/browser";

startServer();
```

Step 2: Frontend example (@monaco-editor/react)

```ts
import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { initWebgalMonaco } from "@webgal/language-service/monaco-init";
import { createWebgalMonacoLanguageClientWithWorker } from "@webgal/language-service/monaco";
import { createMemoryFileSystem } from "@webgal/language-service";

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

Note: initWebgalMonaco is idempotent and can be safely called multiple times. Using a local Worker entry avoids MIME type issues that may arise with package entry URLs.

- Main Thread Mode: Run the language server directly in the main thread (no Worker required).

```ts
import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { initWebgalMonaco } from "@webgal/language-service/monaco-init";
import { createWebgalMonacoLanguageClientWithPort } from "@webgal/language-service/monaco";
import { createMemoryFileSystem } from "@webgal/language-service";
import { startServer, createConnection } from "@webgal/language-server/browser";
import { BrowserMessageReader, BrowserMessageWriter } from "vscode-languageclient/browser.js";

export function WebgalEditor() {
  const clientRef = useRef<{ port: MessagePort } | null>(null);
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
       // cleanup if needed
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

        const channel = new MessageChannel();
        const port1 = channel.port1;
        const port2 = channel.port2;

        // Server side
        const reader = new BrowserMessageReader(port1);
        const writer = new BrowserMessageWriter(port1);
        const connection = createConnection(reader, writer);
        startServer(connection);

        // Client side
        clientRef.current = createWebgalMonacoLanguageClientWithPort({
          port: port2,
          editor,
          virtualFileSystem: vfsRef.current,
        });
      }}
    />
  );
}
```

## Packages

| Package                                                 | Description                                 |
| :------------------------------------------------------ | :------------------------------------------ |
| [@webgal/language-core](./packages/language-core)       | Contains configurations and core tools      |
| [@webgal/language-server](./packages/language-server)   | LSP Language Server                         |
| [@webgal/language-service](./packages/language-service) | LSP Language Service                        |
| [playground](./packages/playground)                     | Playground                                  |
| [vscode-extension](./packages/vscode-extension)                   | VSCode extension                            |

## License

[MPL 2.0](./LICENSE) License
