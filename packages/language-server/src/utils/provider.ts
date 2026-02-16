import {
	CompletionItem,
	CompletionItemKind,
	MarkupKind,
	MarkupContent,
	InsertTextFormat
} from "@volar/language-server";

export const WebGALCommandPrefix =
	"https://docs.openwebgal.com/script-reference/commands/";

export enum commandType {
	say, // 对话
	changeBg, // 更改背景
	changeFigure, // 更改立绘
	bgm, // 更改背景音乐
	video, // 播放视频
	pixi, // pixi演出
	pixiInit, // pixi初始化
	intro, // 黑屏文字演示
	miniAvatar, // 小头像
	changeScene, // 切换场景
	choose, // 分支选择
	end, // 结束游戏
	setComplexAnimation, // 动画演出
	setFilter, // 设置效果
	label, // 标签
	jumpLabel, // 跳转标签
	chooseLabel, // 选择标签
	setVar, // 设置变量
	if, // 条件跳转
	callScene, // 调用场景
	showVars,
	unlockCg,
	unlockBgm,
	filmMode,
	setTextbox,
	setAnimation,
	playEffect,
	setTempAnimation,
	comment,
	setTransform,
	setTransition,
	getUserInput,
	applyStyle,
	wait,
	callSteam
}

export type CommandName = Extract<keyof typeof commandType, string>;
export type CommandNameSpecial = Exclude<
	CommandName,
	| "playVideo"
	| "video"
	| "pixi"
	| "setFilter"
	| "chooseLabel"
	| "if"
	| "comment"
>;

export function markdown(content: string): MarkupContent {
	return {
		kind: MarkupKind.Markdown,
		value: content
	};
}

export const argsMap = {
	when: {
		label: "when",
		kind: CompletionItemKind.Constant,
		insertText: "when=",
		detail: "条件执行",
		documentation: markdown(`
在语句后加上 \`-when=(condition)\` 参数，可以根据条件判断当前语句是否要执行。

例如：

\`\`\`webgal
setVar:a=1;
; // 当 a 大于 1 时跳转到场景 1
changeScene:1.txt -when=a>1;
; // 只有 a 为 1 时才跳转，注意相等运算符是 ==
changeScene:2.txt -when=a==1;
; // 如果 a 小于 1，那么上面的语句不执行，自然就执行这一句了
changeScene:3.txt;

\`\`\`

> \`=\` 是赋值符号，不可用于条件判断，\`==\`是相等运算符。


任何语句都可以加上 \`-when\` 参数来控制是否执行。通过组合 \`-when\` 参数和 \`jumpLabel\` \`callScene\` \`changeScene\`，你可以实现带条件判断的流程控制。
`)
	},
	next: {
		label: "next",
		kind: CompletionItemKind.Constant,
		insertText: "next",
		detail: "连续执行",
		documentation: markdown(`
你可以在任意语句后加上参数 \`-next\`，这样做可以在执行完本条语句后立刻跳转到下一条语句。这对需要在同一时间内执行多步操作非常有用。

示例：

\`\`\`webgal
changeBg:testBG03.jpg -next; // 会立刻执行下一条语句
\`\`\`
  `)
	},
	continue: {
		label: "continue",
		kind: CompletionItemKind.Constant,
		insertText: "continue",
		detail: "继续执行",
		documentation: markdown(`
在某些情况下，你可能希望在执行完当前语句后继续执行下一条语句。这时可以使用 \`-continue\` 参数。
此参数即使在用户未开启自动播放的情况下也会生效。

示例：

\`\`\`webgal
changeBg:testBG03.jpg -continue; // 会在当前语句执行完后继续执行下一条语句
\`\`\`
  `)
	},
	notend: {
		label: "notend",
		kind: CompletionItemKind.Constant,
		insertText: "notend",
		detail: "文字展示完执行下一句",
		documentation: markdown(`
有时候，可能你希望在某一句对话执行到某个阶段时加入演出效果，比如切换表情等。
这时候，你可以使用 \`-notend\` \`-concat\` 参数来实现在对话中插入任意语句。

\`-concat\` 代表本句对话连接在上一句对话之后

\`-notend\` 代表本句对话没有结束，在后面可能连接演出或对话。

示例如下：这是一个在对话进行中切换立绘的演示。

\`\`\`webgal
WebGAL:测试语句插演出！马上切换立绘...... -notend;
changeFigure:k1.png -next;
切换立绘！马上切换表情...... -notend -concat;
changeFigure:k2.png -next;
切换表情！ -concat;
\`\`\`

你也可以只使用 \`-concat\` 参数，将下一句连接在上一句对话之后，因为 \`-notend\` 参数会在对话渐显完成后转到下一句。

\`\`\`
这是第一句......;
用户点击鼠标后才会转到第二句 -concat;
\`\`\`
  `)
	},
	concat: {
		label: "concat",
		kind: CompletionItemKind.Constant,
		insertText: "concat",
		detail: "将该对话与上一句连接",
		documentation: markdown(`
有时候，可能你希望在某一句对话执行到某个阶段时加入演出效果，比如切换表情等。
这时候，你可以使用 \`-notend\` \`-concat\` 参数来实现在对话中插入任意语句。

\`-concat\` 代表本句对话连接在上一句对话之后

\`-notend\` 代表本句对话没有结束，在后面可能连接演出或对话。

示例如下：这是一个在对话进行中切换立绘的演示。

\`\`\`
WebGAL:测试语句插演出！马上切换立绘...... -notend;
changeFigure:k1.png -next;
切换立绘！马上切换表情...... -notend -concat;
changeFigure:k2.png -next;
切换表情！ -concat;
\`\`\`

你也可以只使用 \`-concat\` 参数，将下一句连接在上一句对话之后，因为 \`-notend\` 参数会在对话渐显完成后转到下一句。

\`\`\`
这是第一句......;
用户点击鼠标后才会转到第二句 -concat;
\`\`\`
  `)
	},
	hold: {
		kind: CompletionItemKind.Constant,
		label: "hold",
		insertText: "hold",
		detail: "文字显示完不自动播放",
		documentation: markdown(`
在手动播放模式下，文字显示完不自动播放下一句
> 注：此参数对自动播放模式无效
  `)
	},
	title: {
		kind: CompletionItemKind.Constant,
		label: "title",
		insertText: "title=",
		detail: "对话框标题",
		documentation: markdown(`
对话框标题
  `)
	},
	buttonText: {
		kind: CompletionItemKind.Constant,
		label: "buttonText",
		insertText: "buttonText=",
		detail: "确认按钮文本",
		documentation: markdown(`
确认按钮文本
  `)
	},
	defaultValue: {
		kind: CompletionItemKind.Constant,
		label: "defaultValue",
		insertText: "defaultValue",
		detail: "默认值",
		documentation: markdown(`
默认值
  `)
	},
	leftSay: {
		kind: CompletionItemKind.Constant,
		label: "left",
		insertText: "left",
		detail: "对话属于左侧立绘",
		documentation: markdown(`
指定该对话所属的立绘为左侧立绘

\`\`\`webgal
WebGAL:这是左侧立绘的对话 -left;
\`\`\`
  `)
	},
	centerSay: {
		kind: CompletionItemKind.Constant,
		label: "center",
		insertText: "center",
		detail: "对话属于中间立绘",
		documentation: markdown(`
指定该对话所属的立绘为中间立绘

\`\`\`webgal
WebGAL:这是中间立绘的对话 -center;
\`\`\`
  `)
	},
	left: {
		kind: CompletionItemKind.Constant,
		label: "left",
		insertText: "left",
		detail: "将立绘置于左侧",
		documentation: markdown(`
现在，你可以在页面的三个不同位置放置不同的立绘，只需要在放置立绘的语句处加上你要放置的位置就可以了，示例如下：

\`\`\`webgal
changeFigure:testFigure03.png -left;
changeFigure:testFigure04.png;
changeFigure:testFigure03.png -right;
\`\`\`

以上三行分别对应着左、中、右三个不同的位置。三个不同位置的立绘是相互独立的，所以如果你需要清除立绘，必须分别独立清除：

\`\`\`webgal
changeFigure:none -left;
changeFigure:none;
changeFigure:none -right;
\`\`\`
  `)
	},
	right: {
		kind: CompletionItemKind.Constant,
		label: "right",
		insertText: "right",
		detail: "将立绘置于右侧",
		documentation: markdown(`
现在，你可以在页面的三个不同位置放置不同的立绘，只需要在放置立绘的语句处加上你要放置的位置就可以了，示例如下：

\`\`\`
changeFigure:testFigure03.png -left;
changeFigure:testFigure04.png;
changeFigure:testFigure03.png -right;
\`\`\`

以上三行分别对应着左、中、右三个不同的位置。三个不同位置的立绘是相互独立的，所以如果你需要清除立绘，必须分别独立清除：

\`\`\`
changeFigure:none -left;
changeFigure:none;
changeFigure:none -right;
\`\`\`
  `)
	},
	rightSay: {
		kind: CompletionItemKind.Constant,
		label: "right",
		insertText: "right",
		detail: "对话属于右侧立绘",
		documentation: markdown(`
指定该对话所属的立绘为右侧立绘

\`\`\`
WebGAL:这是右侧立绘的对话 -right;
\`\`\`
  `)
	},
	idFigure: {
		kind: CompletionItemKind.Constant,
		label: "id",
		insertText: "id=",
		detail: "设置id",
		documentation: markdown(`
如果你想要更精确地控制立绘，或使用超过 3 个立绘，可以为立绘指定 \`id\` 和初始位置：

\`\`\`
; // 一个初始位置在右侧的自由立绘
changeFigure:testFigure03.png -left -id=test1;
; // 通过 id 关闭立绘
changeFigure:none -id=test1;
\`\`\`

> 如果你要重设某个带ID立绘的位置，请先关闭再重新打开。
  `)
	},
	idSound: {
		kind: CompletionItemKind.Constant,
		label: "id",
		insertText: "id=",
		detail: "设置id",
		documentation: markdown(`
为效果音赋予一个 \`id\` 将会自动启用效果音循环，后续使用相同的 \`id\` 来停止。

\`\`\`
playEffect:xxx.mp3 -id=xxx;
playEffect:none -id=xxx; // 停止这个循环的效果音
\`\`\`
  `)
	},
	zIndex: {
		kind: CompletionItemKind.Constant,
		label: "zIndex",
		insertText: "zIndex=",
		detail: "图层排序",
		documentation: markdown(`
图层排序索引值，值越大越靠上，值相同时晚加入的靠上

\`\`\`
changeFigure:xxx.png -id=xxx -zIndex=0;
changeFigure:yyy.png -id=yyy -zIndex=1;
\`\`\`
  `)
	},
	blendMode: {
		kind: CompletionItemKind.Constant,
		label: "blendMode",
		insertText: "blendMode=",
		detail: "混合模式",
		documentation: markdown(`
设置立绘的混合模式，可用的混合模式有
- normal (默认值, 透明度混合)
- add (线性减淡)
- multiply (正片叠底)
- screen (滤色)

\`\`\`
changeFigure:xxx.png -blendMode=add;
\`\`\`
  `)
	},
	noneFigure: {
		label: "none",
		kind: CompletionItemKind.Constant,
		documentation: markdown(`将语句内容替换为空字符串`),
		detail: `option -none`,
		insertText: "none"
	},
	animationFlag: {
		kind: CompletionItemKind.Constant,
		label: "animationFlag",
		insertText: "animationFlag=",
		detail: "唇形同步与眨眼",
		documentation: markdown(`
当 \`animationFlag\` 设置为 \`on\` 时，可为图片立绘开启唇形同步与眨眼
本质上是多个静态图片切换

\`\`\`
changeFigure:char.png -animationFlag=on -eyesOpen=char_eyes_open.png -eyesClose=char_eyes_close.png -mouthOpen=mouth.png -mouthHalfOpen=char_mouth_half_open.png -mouthClose=char_mouth_close.png; 
\`\`\`
  `)
	},
	mouthOpen: {
		kind: CompletionItemKind.Constant,
		label: "mouthOpen",
		insertText: "mouthOpen=",
		detail: "嘴巴张开的图片立绘",
		documentation: markdown(`
当 \`animationFlag\` 设置为 \`on\` 时，可为图片立绘开启唇形同步与眨眼
本质上是多个静态图片切换

\`\`\`
changeFigure:char.png -animationFlag=on -eyesOpen=char_eyes_open.png -eyesClose=char_eyes_close.png -mouthOpen=mouth.png -mouthHalfOpen=char_mouth_half_open.png -mouthClose=char_mouth_close.png; 
\`\`\`
  `)
	},
	mouthHalfOpen: {
		kind: CompletionItemKind.Constant,
		label: "mouthHalfOpen",
		insertText: "mouthHalfOpen=",
		detail: "嘴巴半张开的图片立绘",
		documentation: markdown(`
当 \`animationFlag\` 设置为 \`on\` 时，可为图片立绘开启唇形同步与眨眼
本质上是多个静态图片切换

\`\`\`
changeFigure:char.png -animationFlag=on -eyesOpen=char_eyes_open.png -eyesClose=char_eyes_close.png -mouthOpen=mouth.png -mouthHalfOpen=char_mouth_half_open.png -mouthClose=char_mouth_close.png; 
\`\`\`
  `)
	},
	mouthClose: {
		kind: CompletionItemKind.Constant,
		label: "mouthClose",
		insertText: "mouthClose=",
		detail: "嘴巴闭上的图片立绘",
		documentation: markdown(`
当 \`animationFlag\` 设置为 \`on\` 时，可为图片立绘开启唇形同步与眨眼
本质上是多个静态图片切换

\`\`\`
changeFigure:char.png -animationFlag=on -eyesOpen=char_eyes_open.png -eyesClose=char_eyes_close.png -mouthOpen=mouth.png -mouthHalfOpen=char_mouth_half_open.png -mouthClose=char_mouth_close.png; 
\`\`\`
  `)
	},
	eyesOpen: {
		kind: CompletionItemKind.Constant,
		label: "eyesOpen",
		insertText: "eyesOpen=",
		detail: "眼睛睁开的图片立绘",
		documentation: markdown(`
当 \`animationFlag\` 设置为 \`on\` 时，可为图片立绘开启唇形同步与眨眼
本质上是多个静态图片切换

\`\`\`
changeFigure:char.png -animationFlag=on -eyesOpen=char_eyes_open.png -eyesClose=char_eyes_close.png -mouthOpen=mouth.png -mouthHalfOpen=char_mouth_half_open.png -mouthClose=char_mouth_close.png; 
\`\`\`
  `)
	},
	eyesClose: {
		kind: CompletionItemKind.Constant,
		label: "eyesClose",
		insertText: "eyesClose=",
		detail: "眼睛闭上的图片立绘",
		documentation: markdown(`
当 \`animationFlag\` 设置为 \`on\` 时，可为图片立绘开启唇形同步与眨眼
本质上是多个静态图片切换

\`\`\`
changeFigure:char.png -animationFlag=on -eyesOpen=char_eyes_open.png -eyesClose=char_eyes_close.png -mouthOpen=mouth.png -mouthHalfOpen=char_mouth_half_open.png -mouthClose=char_mouth_close.png; 
\`\`\`
  `)
	},
	motion: {
		kind: CompletionItemKind.Constant,
		label: "motion",
		insertText: "motion=",
		detail: "live2D的动作",
		documentation: markdown(`
你可以使用 \`-motion=motionName\` 或 \`-expression=expressionName\` 参数来切换表情，如：

\`\`\`
changeFigure:xxx.json -motion=angry -expression=angry01;
\`\`\`
  `)
	},
	expression: {
		kind: CompletionItemKind.Constant,
		label: "expression",
		insertText: "expression=",
		detail: "live2D的表情",
		documentation: markdown(`
你可以使用 \`-motion=motionName\` 或 \`-expression=expressionName\` 参数来切换表情，如：

\`\`\`
changeFigure:xxx.json -motion=angry -expression=angry01;
\`\`\`
  `)
	},
	bounds: {
		kind: CompletionItemKind.Constant,
		label: "bounds",
		insertText: "bounds=",
		detail: "live2D的边界",
		documentation: markdown(`
当live2D默认显示范围不足时，调整此参数以拓展边界

\`\`\`
changeFigure:xxx.json -bounds=0,50,0,50;
\`\`\`
  `)
	},
	series: {
		kind: CompletionItemKind.Constant,
		label: "series",
		insertText: "series=",
		detail: "鉴赏系列名称",
		documentation: markdown(`
CG或音乐解锁进鉴赏模式后应当放在哪个系列
  `)
	},
	transform: {
		kind: CompletionItemKind.Constant,
		label: "transform",
		insertText: "transform=",
		detail: "设置变换效果",
		documentation: markdown(`
有关效果的字段说明，请参考 [动画](https://docs.openwebgal.com/webgal-script/animation.html)

你可以在设置立绘或背景的时候就为立绘设置一些变换和滤镜效果，以下是一个示例：

\`\`\`
changeFigure:stand.png -transform={"alpha":1,"position":{"x":0,"y":500},"scale":{"x":1,"y":1},"rotation":0,"blur":0,"brightness":1,"contrast":1,"saturation":1,"gamma":1,"colorRed":255,"colorGreen":255,"colorBlue":255,"oldFilm":0,"dotFilm":0,"reflectionFilm":0,"glitchFilm":0,"rgbFilm":0,"godrayFilm":0} -next;
\`\`\`
  `)
	},
	blink: {
		kind: CompletionItemKind.Constant,
		label: "blink",
		insertText: "blink=",
		detail: "Live2D 立绘眨眼",
		documentation: markdown(`
设置 Live2D 立绘眨眼的参数, 参数有
- blinkInterval: 眨眼间隔时间, 单位毫秒, 默认24小时
- blinkIntervalRandom: 眨眼间隔时间随机范围, 单位毫秒, 默认1000
- closingDuration: 眨眼闭合时间, 单位毫秒, 默认100
- closedDuration: 眨眼闭合保持时间, 单位毫秒, 默认50
- openingDuration: 眨眼睁开时间, 单位毫秒, 默认150

\`\`\`
changeFigure:xxx.json -blink={"blinkInterval":5000,"blinkIntervalRandom":2000,"closingDuration":100,"closedDuration":50,"openingDuration":150};
\`\`\`
  `)
	},
	focus: {
		kind: CompletionItemKind.Constant,
		label: "focus",
		insertText: "focus=",
		detail: "Live2D 立绘注视",
		documentation: markdown(`
设置 Live2D 立绘的注视方向, 参数有
- x: 注视点 X 坐标, 范围 -1.0 ~ 1.0, 默认 0.0
- y: 注视点 Y 坐标, 范围 -1.0 ~ 1.0, 默认 0.0
- instant: 是否立即生效, 布尔值, 默认 false

\`\`\`
changeFigure:xxx.json -focus={"x":0.5,"y":0.0,"instant":false};
\`\`\`
  `)
	},
	unlockname: {
		kind: CompletionItemKind.Constant,
		label: "unlockname",
		insertText: "unlockname=",
		detail: "解锁名称",
		documentation: markdown(`
CG或音乐解锁进鉴赏模式的命名
  `)
	},
	volume: {
		kind: CompletionItemKind.Constant,
		label: "volume",
		insertText: "volume=",
		detail: "音量大小",
		documentation: markdown(`
设置音量大小
  `)
	},
	skipOff: {
		kind: CompletionItemKind.Constant,
		label: "skipOff",
		insertText: "skipOff",
		detail: "禁止跳过",
		documentation: markdown(`
禁止跳过
  `)
	},
	enterBgm: {
		kind: CompletionItemKind.Constant,
		label: "enter",
		insertText: "enter=",
		detail: "音量淡入时长",
		documentation: markdown(`
音量淡入时间
  `)
	},
	enterAnimation: {
		kind: CompletionItemKind.Constant,
		label: "enter",
		insertText: "enter=",
		detail: "入场动画",
		documentation: markdown(`
设置入场动画（来自 \`game/animation\` 目录，通常不带 \`.json\` 后缀）
  `)
	},
	exitAnimation: {
		kind: CompletionItemKind.Constant,
		label: "exit",
		insertText: "exit=",
		detail: "退场动画",
		documentation: markdown(`
设置退场动画（来自 \`game/animation\` 目录，通常不带 \`.json\` 后缀）
  `)
	},
	enterDuration: {
		label: "enterDuration",
		kind: CompletionItemKind.Constant,
		insertText: "enterDuration=",
		detail: "入场时长",
		documentation: markdown(`
入场动画的持续时间，单位为毫秒(ms)。
若同时设置 \`duration\`，则此项优先生效。
  `)
	},
	duration: {
		kind: CompletionItemKind.Constant,
		label: "duration",
		insertText: "duration=",
		detail: "持续时间",
		documentation: markdown(`
这个时间片的持续时间，单位为毫秒(ms)
  `)
	},
	exitDuration: {
		label: "exitDuration",
		kind: CompletionItemKind.Constant,
		insertText: "exitDuration=",
		detail: "退场时长",
		documentation: markdown(`
退场动画的持续时间，单位为毫秒(ms)。
  `)
	},
	global: {
		kind: CompletionItemKind.Constant,
		label: "global",
		insertText: "global",
		detail: "全局变量",
		documentation: markdown(`
WebGAL 的普通变量是跟随存档的，也就是说，任何变量只存在于当前的游戏场景中，只有存档才能将其保存下来，读档将其恢复。

为了解决可能存在的作者希望设置多周目的问题，提供长效（全局）变量，一旦设置，则在整个游戏中生效，除非用户清除全部数据。

加上 \`-global\` 参数可以设置长效（全局）变量

\`\`\`ws
setVar:a=1 -global;
\`\`\`

这样就设置了一个不随存档读取而改变的变量。

使用例：

\`\`\`ws
jumpLabel:turn-2 -when=a>0;
setVar:a=1 -global;
一周目;
changeScene:一周目剧情.txt;
label:turn-2;
二周目;
changeScene:二周目剧情.txt;
\`\`\`
  `)
	},
	ease: {
		kind: CompletionItemKind.Constant,
		label: "ease",
		insertText: "ease=",
		detail: "缓动类型",
		documentation: markdown(`
为动画设置缓动类型
可用的缓动类型有
- linear
- anticipate
- easeIn
- easeOut
- easeInOut (默认值)
- circIn
- circOut
- circInOut
- backIn
- backOut
- backInOut
- bounceIn
- bounceOut
- bounceInOut
  `)
	},
	writeDefault: {
		kind: CompletionItemKind.Constant,
		label: "writeDefault",
		insertText: "writeDefault",
		detail: "补充默认值",
		documentation: markdown(`
若变换与效果中有未填写的属性时, 补充默认值, 否则继承现有的值
  `)
	},
	speaker: {
		kind: CompletionItemKind.Constant,
		label: "speaker",
		insertText: "speaker=",
		detail: "说话者",
		documentation: markdown(`
说话者
  `)
	},
	clear: {
		kind: CompletionItemKind.Constant,
		label: "clear",
		insertText: "clear",
		detail: "清除说话者",
		documentation: markdown(`
清除说话者
  `)
	},
	vocal: {
		kind: CompletionItemKind.Constant,
		label: "vocal",
		insertText: "vocal=",
		detail: "播放语音文件",
		documentation: markdown(`
播放语言文件
  `)
	},
	fontSize: {
		label: "fontSize",
		kind: CompletionItemKind.Constant,
		insertText: "fontSize=",
		detail: "字体大小",
		documentation: markdown(`
调整字体大小
  `)
	},
	fontColor: {
		kind: CompletionItemKind.Constant,
		label: "fontColor",
		insertText: "fontColor=",
		detail: "字体颜色",
		documentation: markdown(`
指定字体颜色
  `)
	},
	backgroundColor: {
		kind: CompletionItemKind.Constant,
		label: "backgroundColor",
		insertText: "backgroundColor=",
		detail: "背景颜色",
		documentation: markdown(`
指定背景颜色
  `)
	},
	backgroundImage: {
		kind: CompletionItemKind.Constant,
		label: "backgroundImage",
		insertText: "backgroundImage=",
		detail: "背景图片",
		documentation: markdown(`
指定背景图片
  `)
	},
	animation: {
		kind: CompletionItemKind.Constant,
		label: "animation",
		insertText: "animation=",
		detail: "动画",
		documentation: markdown(`
指定动画
  `)
	},
	delayTime: {
		kind: CompletionItemKind.Constant,
		label: "delayTime",
		insertText: "delayTime=",
		detail: "延迟时长",
		documentation: markdown(`
延迟时长
  `)
	},
	userForward: {
		kind: CompletionItemKind.Constant,
		label: "userForward",
		insertText: "userForward",
		detail: "手动播放一行一行文字",
		documentation: markdown(`
手动播放一行一行文字
  `)
	},
	figureId: {
		label: "figureId",
		kind: CompletionItemKind.Constant,
		insertText: "figureId=",
		detail: "指定立绘ID",
		documentation: markdown(`
为对话指定立绘ID，可同步该立绘的唇形
  `)
	},
	target: {
		kind: CompletionItemKind.Constant,
		label: "target",
		insertText: "target=",
		detail: "指定目标",
		documentation: markdown(`
将动画或效果应用于指定目标
  `)
	},
	name: {
		kind: CompletionItemKind.Constant,
		label: "name",
		insertText: "name=",
		detail: "名称",
		documentation: markdown(`
指定名称
  `)
	},
	keep: {
		kind: CompletionItemKind.Constant,
		label: "keep",
		insertText: "keep",
		detail: "跨语句动画",
		documentation: markdown(`
开启后, 动画可以跨对话播放, 直至被下一个同目标的
\`setTransform\` \`setAnimation\` \`setTempAnimation\` 打断
  `)
	},
	achievementId: {
		kind: CompletionItemKind.Constant,
		label: "achievementId",
		insertText: "achievementId=",
		detail: "成就ID",
		documentation: markdown(`
成就ID
  `)
	}
} as const;

// 通用全局参数
export const globalArgs = [argsMap.when, argsMap.next, argsMap.continue];

export const commandURL =
	"https://docs.openwebgal.com/script-reference/commands/";

export type IArgs = Record<keyof typeof argsMap, Partial<CompletionItem>>;

export type WebGALKeyWords = Record<
	CommandNameSpecial,
	{
		type: commandType;
		desc: string;
		args: IArgs[];
	} & Partial<CompletionItem>
>;

/**
 * @description: 关键字
 */
export const WebGALKeywords = {
	say: {
		type: commandType.say,
		desc: "对话命令。任何识别不了的命令，都将尝试作为对话命令执行。",
		args: [
			argsMap.when,
			argsMap.notend,
			argsMap.concat,
			argsMap.fontSize,
			argsMap.idFigure,
			argsMap.figureId,
			argsMap.speaker,
			argsMap.vocal,
			argsMap.clear,
			argsMap.leftSay,
			argsMap.rightSay,
			argsMap.centerSay
		],
		label: "say",
		kind: CompletionItemKind.Function,
		documentation: `对话
		\`\`\`webgal
		say:你好;
		\`\`\``,
		detail: `say:<content> [...args];`,
		insertText: "say:$1;$2"
	},
	changeBg: {
		type: commandType.changeBg,
		desc: "更改背景命令。",
		args: [
			argsMap.when,
			argsMap.next,
			argsMap.continue,
			argsMap.duration,
			argsMap.enterDuration,
			argsMap.exitDuration,
			argsMap.transform,
			argsMap.unlockname,
			argsMap.series,
			argsMap.enterAnimation,
			argsMap.exitAnimation,
			argsMap.ease
		],
		label: "changeBg",
		kind: CompletionItemKind.Function,
		documentation: `更新背景图片
		\`\`\`webgal
		changeBg:testBG03.jpg -next;
		\`\`\``,
		detail: `changeBg:<fileName> [-next];`,
		insertText: "changeBg:$1;$2"
	},
	changeFigure: {
		type: commandType.changeFigure,
		desc: "更改立绘命令。",
		args: [
			argsMap.when,
			argsMap.next,
			argsMap.continue,
			argsMap.duration,
			argsMap.enterDuration,
			argsMap.exitDuration,
			argsMap.idFigure,
			argsMap.left,
			argsMap.right,
			argsMap.transform,
			argsMap.zIndex,
			argsMap.motion,
			argsMap.expression,
			argsMap.bounds,
			argsMap.animationFlag,
			argsMap.eyesOpen,
			argsMap.eyesClose,
			argsMap.mouthOpen,
			argsMap.mouthHalfOpen,
			argsMap.mouthClose,
			argsMap.enterAnimation,
			argsMap.exitAnimation,
			argsMap.ease,
			argsMap.blink,
			argsMap.focus,
			argsMap.blendMode
		],
		label: "changeFigure",
		kind: CompletionItemKind.Function,
		documentation: `更新立绘
		\`\`\`webgal
		changeFigure:testFigure03.png -left -next;
		\`\`\``,
		detail: `changeFigure:<fileName> [-left] [-right] [id=figureId] [-next];`,
		insertText: "changeFigure:$1;$2"
	},
	bgm: {
		type: commandType.bgm,
		desc: "更改背景音乐命令。",
		args: [
			argsMap.when,
			argsMap.volume,
			argsMap.enterBgm,
			argsMap.unlockname,
			argsMap.series
		],
		label: "bgm",
		kind: CompletionItemKind.Function,
		documentation: `背景音乐（BGM）
		\`\`\`webgal
		bgm:夏影.mp3;
		\`\`\``,
		detail: `bgm:<fileName>;`,
		insertText: "bgm:$1;$2"
	},
	playVideo: {
		type: commandType.video,
		desc: "播放视频命令。",
		args: [argsMap.when, argsMap.skipOff],
		label: "playVideo",
		kind: CompletionItemKind.Function,
		documentation: `播放视频
		\`\`\`webgal
		playVideo:OP.mp4;
		\`\`\``,
		detail: `playVideo:<fileName>;`,
		insertText: "playVideo:$1;$2"
	},
	pixiPerform: {
		type: commandType.pixi,
		desc: "添加舞台特效",
		args: [argsMap.when],
		label: "pixiPerform",
		kind: CompletionItemKind.Function,
		documentation: `初始化 Pixi 特效
		注意：特效作用后，如果没有初始化，特效会一直运行。`,
		detail: `pixiPerform:<performName>;`,
		insertText: "pixiPerform:$1;$2"
	},
	pixiInit: {
		type: commandType.pixiInit,
		desc: "pixi初始化命令。",
		args: [argsMap.when],
		label: "pixiInit",
		kind: CompletionItemKind.Function,
		documentation: `初始化 Pixi 特效
		1.如果你要使用特效，那么你必须先运行这个命令来初始化 Pixi。
		2.如果你想要消除已经作用的效果，你可以使用这个语法来清空效果。`,
		detail: `pixiInit;`,
		insertText: "pixiInit;"
	},
	intro: {
		type: commandType.intro,
		desc: "黑屏文字演示命令。",
		args: [
			argsMap.when,
			argsMap.backgroundColor,
			argsMap.backgroundImage,
			argsMap.fontColor,
			argsMap.fontSize,
			argsMap.animation,
			argsMap.delayTime,
			argsMap.hold,
			argsMap.userForward
		],
		label: "intro",
		kind: CompletionItemKind.Function,
		documentation: `黑屏独白
		在许多游戏中，会以黑屏显示一些文字，用来引入主题或表现人物的心理活动。你可以使用 intro 命令来演出独白。
		独白的分拆以分隔符(|)来分割，也就是说，每一个 | 代表一个换行。

		\`\`\`webgal
		intro:回忆不需要适合的剧本，|反正一说出口，|都成了戏言。;
		\`\`\``,
		detail: `intro:<text> [|<text of line 2>] ...;`,
		insertText: "intro:$1;$2"
	},
	miniAvatar: {
		type: commandType.miniAvatar,
		desc: "小头像命令。",
		args: [argsMap.when],
		label: "miniAvatar",
		kind: CompletionItemKind.Function,
		documentation: `放置小头像
		很多游戏可以在文本框的左下角放置小头像，以下是在本引擎中使用的语法

		\`\`\`webgal
		miniAvatar:minipic_test.png;显示
		miniAvatar:none;关闭
		\`\`\``,
		detail: `miniAvatar:<fileName>;`,
		insertText: "miniAvatar"
	},
	changeScene: {
		type: commandType.changeScene,
		desc: "切换场景命令。",
		args: [argsMap.when],
		label: "changeScene",
		kind: CompletionItemKind.Function,
		documentation: `场景跳转
		你可以将你的剧本拆分成多个 txt 文档，并使用一个简单的语句来切换当前运行的剧本。
		\`\`\`webgal
		changeScene:Chapter-2.txt;
		\`\`\``,
		detail: `changeScene:<newSceneFileName>;`,
		insertText: "changeScene:$1;$2"
	},
	choose: {
		type: commandType.choose,
		desc: "分支选择命令。",
		args: [argsMap.when],
		label: "choose",
		kind: CompletionItemKind.Function,
		documentation: `分支选择
		如果你的剧本存在分支选项，你希望通过选择不同的选项进入不同的章节，请使用以下语句。
		其中，|是分隔符。
		\`\`\`webgal
		choose:叫住她:Chapter-2.txt|回家:Chapter-3.txt;
		\`\`\``,
		detail: `choose:<chooseText:newSceneName> [|<chooseText:newSceneName>] ...;`,
		insertText: "choose:$1|$2;"
	},
	end: {
		type: commandType.end,
		desc: "结束游戏命令。",
		args: [argsMap.when],
		label: "end",
		kind: CompletionItemKind.Function,
		documentation: `结束游戏并返回到标题
		\`\`\`webgal
		end;
		\`\`\``,
		detail: `end;`,
		insertText: "end;"
	},
	setComplexAnimation: {
		type: commandType.setComplexAnimation,
		desc: "动画演出命令。",
		args: [
			argsMap.when,
			argsMap.next,
			argsMap.continue,
			argsMap.target,
			argsMap.duration
		],
		label: "setComplexAnimation",
		kind: CompletionItemKind.Function,
		documentation: `填写复杂动画的名称。
		目前 WebGAL 提供的复杂动画有：
		universalSoftIn：通用透明度淡入
		universalSoftOff：通用透明度淡出

		\`\`\`webgal
		setComplexAnimation:universalSoftIn -target=aaa -duration=1000;
		\`\`\``,
		detail: `setComplexAnimation:<name> [-target=...|-duration=...];`,
		insertText: "setComplexAnimation:$1;$2"
	},
	label: {
		type: commandType.label,
		desc: "标签命令。",
		args: [argsMap.when],
		label: "label",
		kind: CompletionItemKind.Function,
		documentation: `定义标签`,
		detail: `label:<Name>;`,
		insertText: "label:$1;$2"
	},
	jumpLabel: {
		type: commandType.jumpLabel,
		desc: "跳转标签命令。",
		args: [argsMap.when],
		label: "jumpLabel",
		kind: CompletionItemKind.Function,
		documentation: `跳转到指定标签`,
		detail: `jumpLabel:<Laebl Name>;`,
		insertText: "jumpLabel:$1;$2"
	},
	setVar: {
		type: commandType.setVar,
		desc: "设置变量命令。",
		args: [argsMap.when, argsMap.global],
		label: "setVar",
		kind: CompletionItemKind.Function,
		documentation: `使用变量
		\`\`\`webgal
		setVar:a=1;可以设置数字
		setVar:a=true;可以设置布尔值
		setVar:a=人物名称;可以设置字符串
		\`\`\``,
		detail: `setVar:<expression>;`,
		insertText: "setVar:$1;$2"
	},
	callScene: {
		type: commandType.callScene,
		desc: "调用场景命令。",
		args: [argsMap.when],
		label: "callScene",
		kind: CompletionItemKind.Function,
		documentation: `
		如果你需要在执行完调用的场景后回到先前的场景（即父场景），你可以使用 callScene 来调用场景
		\`\`\`webgal
		callScene:Chapter-2.txt;
		\`\`\``,
		detail: `callScene:<newSceneFileName>;`,
		insertText: "callScene:$1;$2"
	},
	showVars: {
		type: commandType.showVars,
		desc: "显示所有本地/全局变量值",
		args: [argsMap.when],
		label: "showVars",
		kind: CompletionItemKind.Function,
		documentation: `在对话框中，显示所有本地变量与全局变量的值。
		\`\`\`webgal
		showVars;
		\`\`\``,
		detail: `showVars;`,
		insertText: "showVars;"
	},
	unlockCg: {
		type: commandType.unlockCg,
		desc: "解锁立绘命令。",
		args: [argsMap.when, argsMap.name, argsMap.series],
		label: "unlockCg",
		kind: CompletionItemKind.Function,
		documentation: `解锁 CG 鉴赏
		\`\`\`webgal
		unlockCg:xgmain.jpeg -name=星光咖啡馆与死神之蝶 -series=1;
		\`\`\``,
		detail: `unlockCg:<fileName> -name=cgName -series=serisId;`,
		insertText: "unlockCg:$1;$2"
	},
	unlockBgm: {
		type: commandType.unlockBgm,
		desc: "解锁背景音乐命令。",
		args: [argsMap.when, argsMap.name, argsMap.series],
		label: "unlockBgm",
		kind: CompletionItemKind.Function,
		documentation: `解锁 BGM 鉴赏
		\`\`\`webgal
		unlockBgm:s_Title.mp3 -name=Smiling-Swinging!!;
		\`\`\``,
		detail: `unlockBgm:<fileName> -name=bgmName;`,
		insertText: "unlockBgm:$1;$2"
	},
	filmMode: {
		type: commandType.filmMode,
		desc: "电影模式命令。",
		args: [argsMap.when],
		label: "filmMode",
		kind: CompletionItemKind.Function,
		documentation: `当不填写或填写 none 时，关闭电影模式。其他任何字符串均表示开启电影模式。
		\`\`\`webgal
		filmMode:on;
		角色A:真相只有一个;
		filmMode:none;
		\`\`\``,
		detail: `filmMode:[on|none];`,
		insertText: "filmMode:$1;$2"
	},
	setTextbox: {
		type: commandType.setTextbox,
		desc: "设置文本框命令。",
		args: [argsMap.when],
		label: "setTextbox",
		kind: CompletionItemKind.Function,
		documentation: `设置文本框开启/关闭
		\`\`\`webgal
		setTextbox:hide;关闭文本框
		setTextbox:on;开启文本框，可以是除 hide 以外的任意值。
		\`\`\``,
		detail: `setTextbox:[hide] [others];`,
		insertText: "setTextbox:$1;$2"
	},
	setAnimation: {
		type: commandType.setAnimation,
		desc: "设置动画命令。",
		args: [
			argsMap.when,
			argsMap.next,
			argsMap.continue,
			argsMap.target,
			argsMap.writeDefault,
			argsMap.keep
		],
		label: "setAnimation",
		kind: CompletionItemKind.Function,
		documentation: `设置动画
		\`\`\`webgal
		setAnimation:enter-from-bottom -target=fig-center -next;为中间立绘设置一个从下方进入的动画，并转到下一句。
		\`\`\``,
		detail: `setAnimation:<animationName> -target=targetId;`,
		insertText: "setAnimation"
	},
	playEffect: {
		type: commandType.playEffect,
		desc: "播放效果命令。",
		args: [argsMap.when, argsMap.volume, argsMap.idSound],
		label: "playEffect",
		kind: CompletionItemKind.Function,
		documentation: `效果音
		\`\`\`webgal
		playEffect:xxx.mp3;
		\`\`\``,
		detail: `playEffect:<fileName>;`,
		insertText: "playEffect:$1;$2"
	},
	setTempAnimation: {
		type: commandType.setTempAnimation,
		desc: "设置临时动画命令。",
		args: [
			argsMap.when,
			argsMap.next,
			argsMap.continue,
			argsMap.target,
			argsMap.writeDefault,
			argsMap.keep
		],
		label: "setTempAnimation",
		kind: CompletionItemKind.Function,
		documentation: `与 setAnimation 读取动画文件不同，setTempAnimation 允许用户直接在代码里定义多段动画。
		语句内容格式为动画文件的单行形式，即 [{},{},{}] 。

		相关信息

		如果您想复用动画，请使用 setAnimation 命令。
		如果您只想设置单段动画，请使用 setTransform 命令。
		
		\`\`\`webgal
		changeFigure:1/open_eyes.png -id=aaa;
		; 闪光弹动画
		setTempAnimation:[{"duration":0},{"brightness":2,"contrast":0,"duration":200,"ease":"circIn"},{"brightness":1,"contrast":1,"duration":200},{"brightness":2,"contrast":0,"duration":200,"ease":"circIn"},{"brightness":1,"contrast":1,"duration":2500}] -target=aaa;
		\`\`\`
		`,
		detail: `setTempAnimation:<name>|<JSON> [-target=...|-writeDefault...|-keep=...];";`,
		insertText: "setTempAnimation:$1;$2"
	},
	setTransform: {
		type: commandType.setTransform,
		desc: "设置变换命令。",
		args: [
			argsMap.when,
			argsMap.next,
			argsMap.continue,
			argsMap.target,
			argsMap.ease,
			argsMap.writeDefault,
			argsMap.keep,
			argsMap.duration
		],
		label: "setTransform",
		kind: CompletionItemKind.Function,
		documentation: `设置效果`,
		detail: `setTransform:<expression>;`,
		insertText: "setTransform:"
	},
	setTransition: {
		type: commandType.setTransition,
		desc: "设置过渡命令。",
		args: [
			argsMap.when,
			argsMap.target,
			argsMap.enterAnimation,
			argsMap.exitAnimation
		],
		label: "setTransition",
		kind: CompletionItemKind.Function,
		documentation: `不需要填写任何语句内容。
		详情请见设置进出场效果。
		
		\`\`\`webgal
		changeFigure:1/open_eyes.png -id=aaa -next;
		setTransition: -target=aaa -enter=enter-from-left;
		角色A: 你好！
		setTransition: -target=aaa -exit=exit-to-right;
		changeFigure:none -id=aaa -next;
		角色A: 再见！
		\`\`\``,
		detail: `setTransition:[name] [-target=...|-enter=...|-exit=...];`,
		insertText: "setTransition:$1;$2"
	},
	getUserInput: {
		type: commandType.getUserInput,
		desc: "获取用户输入命令。",
		label: "getUserInput",
		args: [
			argsMap.when,
			argsMap.title,
			argsMap.buttonText,
			argsMap.defaultValue
		],
		kind: CompletionItemKind.Function,
		documentation: `获取用户输入
		\`\`\`webgal
		填写变量名称，用户输入的值将保存在该变量中。
		角色B:真的是太感谢您了，能告诉我您的名字吗？;
		getUserInput:player_name -title=您的名字 -buttonText=确认 -defaultValue=Bob;
		角色B:{player_name}，我记住了。;
		\`\`\`
`,
		detail: `getUserInput:[...args];`,
		insertText: "getUserInput:$1;$2"
	},
	applyStyle: {
		type: commandType.applyStyle,
		desc: "应用样式命令。",
		args: [argsMap.when],
		label: "applyStyle",
		kind: CompletionItemKind.Function,
		documentation: `首先需要在 UI 模板中新写一个样式，然后可以用 applyStyle 命令，将新样式替换原样式。
		原样式名与新样式名之间用 -> 连接，您可以同时替换多个样式，每个替换之间用英文逗号 , 分隔。
		格式如:原样式名->新样式名,原样式名2->新样式名2,...
		\`\`\`webgal
		; 将角色名背景替换为红色，前提是在 UI 模板里写了新样式
		applyStyle:TextBox_ShowName_Background->TextBox_ShowName_Background_Red;
		角色名:这是一句话;
		; 同时替换多个样式
		applyStyle:TextBox_ShowName_Background->TextBox_ShowName_Background_Green,TextBox_main->TextBox_main_Black;
		无论原样式被替换为什么新样式，替换样式依旧是原样式名在前;
		applyStyle:原样式名->新样式名1;
		applyStyle:新样式名1->新样式名2; 错误
		applyStyle:原样式名->新样式名2;
		\`\`\``,
		detail: `applyStyle:<old_style_name>-><new_style_name>;`,
		insertText: "applyStyle:$1;$2"
	},
	wait: {
		type: commandType.wait,
		desc: "等待命令。",
		args: [argsMap.when],
		label: "wait",
		kind: CompletionItemKind.Function,
		documentation: `填写一个数字，作为等待时间，单位为毫秒。
		有时出于演出效果的需要，可能需要等待一段时间，再执行下一句。
		\`\`\`webgal
		角色A:让我想想;
		角色A:......;
		wait:5000; 等待 5 秒
		角色A:想不出来，算了。;
		\`\`\``,
		detail: `wait:<number>;`,
		insertText: "wait:$1;$2"
	},
	callSteam: {
		type: commandType.callSteam,
		desc: "调用 Steam 命令。",
		args: [argsMap.when, argsMap.achievementId],
		label: "callSteam",
		kind: CompletionItemKind.Function,
		documentation: `调用 Steam 命令。
		\`\`\`webgal
		callSteam:xxx;
		\`\`\``,
		detail: `callSteam: <...arguments>;`,
		insertText: "callSteam:$1;$2"
	}
};

export const WebGALKeywordsKeys = Object.keys(
	WebGALKeywords
) as CommandNameSpecial[];

/* server可用补全Map */
export const WebgGALKeywordsCompletionMap = WebGALKeywordsKeys.map(
	(v) =>
		({
			label: WebGALKeywords[v]?.label || v,
			kind: WebGALKeywords[v]?.kind || CompletionItemKind.Keyword,
			documentation: {
				kind: MarkupKind.Markdown,
				value:
					(WebGALKeywords[v].documentation as string)?.replace(
						/\t+/g,
						""
					) || WebGALKeywords[v].desc
			} as MarkupContent,
			detail: WebGALKeywords[v]?.detail || WebGALKeywords[v].desc,
			insertText: WebGALKeywords[v]?.insertText || v,
			insertTextFormat: InsertTextFormat.Snippet
		}) satisfies CompletionItem
);

export interface WebGALConfigToken extends Partial<CompletionItem> {
	desc: string; // 描述
	require?: boolean; // 是否必须
}

export const WebGALConfigMap: Record<string, WebGALConfigToken> = {
	Game_name: {
		desc: "游戏名称",
		require: true
	},
	Game_key: {
		desc: "游戏识别码，长度 6-10 字符，不要与别的游戏重复",
		require: true
	},
	Title_img: {
		desc: "标题图片，放在 background 文件夹",
		require: true
	},
	Title_bgm: {
		desc: "标题背景音乐，放在 bgm 文件夹",
		require: true
	},
	Game_Logo: {
		desc: "游戏 Logo，可以显示多个，用 | 分割"
	},
	Enable_Appreciation: {
		desc: "是否启用鉴赏功能，包括 CG 和背景音乐鉴赏。"
	},
	Default_Language: {
		desc: "默认语言，可设置为 'zh_CN', 'zh_TW', 'en', 'ja', 'fr', 'de'"
	},
	Show_panic: {
		desc: "是否启用紧急回避功能，设置为 true 或 false"
	},
	Legacy_Expression_Blend_Mode: {
		desc: "是否启用 Live2D 的旧表情混合模式，设置为 true 或 false"
	}
};

export const WebGALConfigCompletionMap = Object.fromEntries(
	Object.entries(WebGALConfigMap).map(([key, token]) => {
		const label = key;
		const documentation = token?.documentation ?? token?.desc ?? "";
		const detail = `${key}:<value>;`;
		const insertText = `${key}:$1;`;

		const completion: CompletionItem = {
			...token,
			label,
			kind: CompletionItemKind.Function,
			documentation,
			detail,
			insertText,
			insertTextFormat: InsertTextFormat.Snippet
		};
		return [key, completion];
	})
) as Record<string, WebGALConfigToken & CompletionItem>;
