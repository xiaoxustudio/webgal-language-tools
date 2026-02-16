# @webgal/language-server

[English](./README.en.md) | 中文

WebGAL LSP 语言服务器，支持 stdio 与 WebSocket 两种运行模式，可用于 VSCode 扩展或浏览器端语言服务。

## 安装

```bash
npm i @webgal/language-server
```

## 启动

```bash
npx webgal-language-server --stdio
```

```bash
npx webgal-language-server --ws --wsPort=5882 --wsPath=/webgal-lsp
```

## 仓库

https://github.com/xiaoxustudio/webgal-language-tools/tree/main/packages/language-server
