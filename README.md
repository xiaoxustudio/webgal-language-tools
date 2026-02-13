# webgal-language-tools

[English](./README.en.md) | 中文

> ⚡提供 WebGAL 脚本的语言支持，基于 Volar.js [Volar.js](https://volarjs.dev/)

## 快速开始

### VSCode 用户

安装 [webgal-for-vscode](https://marketplace.visualstudio.com/items?itemName=Xuran1783558957.webgal-for-vscode) 扩展。

### Monaco 用户

推荐统一从 @webgal/language-service 主入口导入，避免分散子路径导入。

我们提供在 Monaco 中使用 WebGAL 语言服务的两种启动方式。示例基于 monaco-editor 与 @monaco-editor/react。

- 前置初始化（必读）：在页面加载后先初始化 WebGAL 的 Monaco 语言配置与语法高亮。

```ts
import { initWebgalMonaco } from "@webgal/language-service";

await initWebgalMonaco();
```

- WebSocket 模式：通过 WebSocket 连接到本地语言服务器。

启动语言服务器：

```bash
pnpm --filter @webgal/language-server run dev:ws
```

前端示例（使用 @monaco-editor/react）：

```ts
import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import {
  initWebgalMonaco,
  createWebgalMonacoLanguageClient,
  createMemoryFileSystem
} from "@webgal/language-service";

export function WebgalEditor() {
  const clientRef = useRef<{ webSocket: WebSocket } | null>(null);
  const vfsRef = useRef(
    createMemoryFileSystem({
      root: "file:///project",
    })
  );

  useEffect(() => {
    void initWebgalMonaco();
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
          languageServerUrl: "ws://localhost:3001/webgal-lsp",
          editor,
          virtualFileSystem: vfsRef.current,
        });
      }}
    />
  );
}
```

- 浏览器模式：通过 Web Worker 在浏览器中启动语言服务器，并与前端语言客户端通信。

步骤一：创建本地 Worker 入口文件（例如 src/webgal-lsp.worker.ts）

```ts
import { startServer } from "@webgal/language-server/browser";

startServer();
```

步骤二：前端示例（使用 @monaco-editor/react）

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

说明：initWebgalMonaco 具有幂等特性，可在多处安全调用；使用本地 Worker 入口可避免构建工具对包路径的 MIME 误判。

- 主线程模式：直接在主线程运行语言服务器（无需 Worker）。

```ts
import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import {
  initWebgalMonaco,
  createWebgalMonacoLanguageClientWithPort,
  createMemoryFileSystem
} from "@webgal/language-service";
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
       // 清理逻辑
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

        // 服务端
        const reader = new BrowserMessageReader(port1);
        const writer = new BrowserMessageWriter(port1);
        const connection = createConnection(reader, writer);
        startServer(connection);

        // 客户端
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

## 包

| 包                                                      | 描述                   |
| :------------------------------------------------------ | :--------------------- |
| [@webgal/language-core](./packages/language-core)       | 包含部分配置与核心工具 |
| [@webgal/language-server](./packages/language-server)   | LSP 语言服务器         |
| [@webgal/language-service](./packages/language-service) | LSP 语言服务           |
| [playground](./packages/playground)                     | 演示                   |
| [vscode-extension](./packages/vscode-extension)                   | VSCode 扩展            |

## 许可证

[MPL 2.0](./LICENSE) 许可证
