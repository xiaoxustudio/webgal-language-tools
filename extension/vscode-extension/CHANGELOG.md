# Change Log

All notable changes to the "webgal-for-vscode" extension will be documented in this file.

## [2.0.4] - 2026.07.9
### 🚀 特性
- **core,server**：添加场景依赖分析 - 作者 **xiaoxustudio** [<samp>(f3a72)</samp>](https://github.com/xiaoxustudio/webgal-language-tools/commit/f3a7270)  
- **language-server**：添加鼠标悬停时的图片预览 - 作者 **xiaoxustudio** [<samp>(9ed6a)</samp>](https://github.com/xiaoxustudio/webgal-language-tools/commit/9ed6a54)  
- **lsp**：通过通知重启服务器 - 作者 **xiaoxustudio** [<samp>(ee656)</samp>](https://github.com/xiaoxustudio/webgal-language-tools/commit/ee6565c)  
- **vscode**：添加重启LSP服务器命令 - 作者 **xiaoxustudio** [<samp>(8ff10)</samp>](https://github.com/xiaoxustudio/webgal-language-tools/commit/8ff10ce)
### 🐞 修复
- WebgalFoldingRanges 无法工作 - 作者 **xiaoxustudio** [<samp>(125a3)</samp>](https://github.com/xiaoxustudio/webgal-language-tools/commit/125a3ba)
- **core**：全局 navigator 对象的 TypeScript 错误 - 作者 **xiaoxustudio** [<samp>(ed5df)</samp>](https://github.com/xiaoxustudio/webgal-language-tools/commit/ed5df38)
- **lang-server**：减少日志噪音并优化解析 - 作者 **xiaoxustudio** [<samp>(93fdc)</samp>](https://github.com/xiaoxustudio/webgal-language-tools/commit/93fdc3a)
- **language-server**：修复资源路径完成和回退逻辑 - 作者 **xiaoxustudio** [<samp>(c2d03)</samp>](https://github.com/xiaoxustudio/webgal-language-tools/commit/c2d038f)
- **server**：验证无效 - 作者 **xiaoxustudio** [<samp>(5d17e)</samp>](https://github.com/xiaoxustudio/webgal-language-tools/commit/5d17e2c)
- **service**：改进 getState 函数 - 作者 **xiaoxustudio** [<samp>(cb8cc)</samp>](https://github.com/xiaoxustudio/webgal-language-tools/commit/cb8cc7e)

## [2.0.3] - 2026.05.17

- 增加格式化文件`fmt.json`，可通过指令生成该文件
- 增加`nobreak`、`rule`、`ruleFlag`、`ruleText`、`ruleButtonText`
- 同步`webgal`高亮文件

## [2.0.2] - 2026.03.27

- 增加扩展设置本地化（`简体中文`、`English`）
- 修改LSP启动提示到终端中而不是显示Tip
- 当文件无法找到时显示`unknown file`

## [2.0.1] - 2026.02.20

- 修复扩展图标问题

## [2.0.0] - 2026.02.20

- 重构插件
- 使用`webgal-language-tools`提供lsp服务
- 修复图标和启动问题

## [1.4.12] - 2025.10.29

- 增加新指令支持
- 增加设置（是否禁用警告）
- API 文档地址更新

## [1.4.11] - 2024.9.3

- 优化 DocumentLink，未找到文件将不会提示
- 修复类型镶嵌位置错误的bug

## [1.4.10] - 2024.7.4

- 优化格式化功能
- 优化类型镶嵌

## [1.4.9] - 2024.6.30

- 更新语言高亮
- 修改 Hover 样式

## [1.4.8] - 2024.6.12

- 更新语言高亮
- 修复 issue **4**
- 修复 config 配置文件无法找到的 bug

## [1.4.7] - 2024.6.11

- 更新 README
- 修复 websocket 连接失败问题

## [1.4.5] - 2024.4.21

- 修复词组匹配
- 修复资源链接匹配问题

## [1.4.4] - 2024.3.31

- 修复重新调试 bug
- 调试功能迭代 03
- 调试可直接修改变量数值

## [1.4.3] - 2024.3.30

- 修复 bug
- 调试功能迭代 02

## [1.4.2] - 2024.3.30

- 调试功能迭代

## [1.4.1] - 2024.3.29

- 修复配置文件不生效
- 调试增加新指令

## [1.4.0] - 2024.3.28

- 优化资源链接识别
- 增加跳转行指令和右键菜单
- 增加简单调试功能

## [1.3.9] - 2024.3.25

- 优化操作
- 增加标签跳转定义

## [1.3.8] - 2024.3.24

- 修复资源定义跳转
- 增加资源定义跳转检测，未识别则不可跳转

## [1.3.7] - 2024.3.24

- 增加资源定义跳转
- 修复补全后删除前缀失效 bug

## [1.3.6] - 2024.3.24

- 优化操作
- 更换图标
- 修复变量补全 bug
- 变量插值补全增加描述显示

## [1.3.5] - 2024.3.23

- 修复类型镶嵌失效 bug
- 类型镶嵌增加设置位置配置

## [1.3.4] - 2024.3.23

- 修复格式化问题
- 修复字符串类型镶嵌
- 增加类型镶嵌启用配置

## [1.3.3] - 2024.3.23

- 优化格式化
- 增加语言高亮
- 优化变量定义跳转
- 为变量添加类型镶嵌提示
- 变量类型识别增加**表达式**类型

## [1.3.2] - 2024.3.22

- 优化资源补全，补全后删除前缀
- 优化 Hover 参数提示

## [1.3.1] - 2024.3.22

- 修复资源补全的 bug

## [1.3.0] - 2024.3.22

- 优化 0005 警告
- 增加资源文件补全功能
- 新增指令启动插件指令
- 变量注释支持 MarkDown 文本

## [1.2.8] - 2024.3.21

- 暂时去除冒号相关的格式化和警告
- 增加;的警告信息
- 变量插值 Hover 增加描述功能
- 整理目录结构

## [1.2.7] - 2024.3.20

- 修复 0003 警告
- 优化警告信息截取
- 增加示例
- 格式化优化
- 增加跳转定义功能

## [1.2.6] - 2024.3.20

- 修复工作区 lsp 不启用的 bug
- 优化操作

## [1.2.5] - 2024.3.19

- 增加部分提示
- 修复 random 不能提示的 bug

## [1.2.4] - 2024.3.19

- fixbug

## [1.2.3] - 2024.3.19

### Add

- 优化补全功能（更改为 LSP 补全）
- 变量 Hover 提示

## [1.2.2] - 2024.3.19

### Add

- 禁止格式化 setVar

## [1.2.1] - 2024.3.19

### Add

- 修复警告中文异常
- 格式化

## [1.2.0] - 2024.3.19

### Add

- 警告提示
- 插值变量提示

## [1.0.1] - 2024.3.17

### Add

- 颜色选择器

## [1.0.0] - 2024.3.17

### Add

- 基础 Hover 提示
- 基础关键字补全
