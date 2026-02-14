# webgal-language-tools

[English](./README.en.md) | 中文

> ⚡提供 WebGAL 脚本的语言支持，基于 [Volar.js](https://volarjs.dev/)

## 快速开始

### VSCode 用户

安装 [webgal-for-vscode](https://marketplace.visualstudio.com/items?itemName=Xuran1783558957.webgal-for-vscode) 扩展。

### Monaco 用户


我们提供在 `Monaco` 中使用 WebGAL 语言服务的两种启动方式。

示例基于 monaco-editor 与 @monaco-editor/react

##### WebSocket 模式

- 通过 WebSocket 连接到本地语言服务器，适用于前后端分离的项目。

启动语言服务器：

如果你是基于本项目源码
```bash
pnpm dev:lsp-ws
```

如果你是基于本项目构建产物，那么需要在`node`下运行，新建一个空`node`项目后，安装`server`包：
```bash
npm i @webgal/language-server
```

再新建一个文件，例如`webgal-lsp.js`，内容如下：
```js
require("@webgal/language-server");
```

最后启动它：

```bash
node webgal-lsp.js --ws --wsPort=5882 --wsPath=/webgal-lsp
```

前端示例（使用 @monaco-editor/react）：

新建一个 `vite` 前端项目后，安装依赖：
```bash
npm i @webgal/language-service
```

然后在主界面`App.tsx`写入以下内容（其他依赖自行安装，注意本文最后的ps）：

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

##### 浏览器模式

- 通过 `Web Worker` 在浏览器中启动语言服务器，并与前端语言客户端通信，无需后端。

创建本地 Worker 入口文件（例如 `src/webgal-lsp.worker.ts`）

```ts
import { startServer } from "@webgal/language-server/browser";

startServer();
```

大概逻辑和`websocket`模式差不多：

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

> ![WARNING]
> 注意：我们需要指定`monaco-editor`的版本 ：`npm i monaco-editor@npm:@codingame/monaco-vscode-editor-api@^26.1.1`

## packages

| packages                                                | 描述                   |
| :------------------------------------------------------ | :--------------------- |
| [@webgal/language-core](./packages/language-core)       | 包含部分配置与核心工具 |
| [@webgal/language-server](./packages/language-server)   | LSP 语言服务器         |
| [@webgal/language-service](./packages/language-service) | LSP 语言服务           |
| [playground](./packages/playground)                     | 演示                   |


| extension                                        | 描述        |
| :----------------------------------------------- | :---------- |
| [vscode-extension](./extension/vscode-extension) | VSCode 扩展 |

## 许可证

[MPL 2.0](./LICENSE) 许可证
