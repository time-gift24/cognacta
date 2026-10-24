---
name: Cognacta Graphite
description: Cognacta 企业 agent 工作台的设计系统。石墨近黑为默认画布，单一电光蓝作为行动信号，Geist 字体，1px 细线与色调分层替代投影；亮色是同一结构的白昼镜像，默认简体中文并以英文为完整镜像。
colors:
  background: "#1a1a1a"
  surface: "#1a1a1a"
  surface-raised: "#242424"
  surface-active: "#2c2c2c"
  muted: "#2c2c2c"
  foreground: "#f4f4f4"
  muted-foreground: "#a6a6a6"
  faint: "#858585"
  border: "rgb(255 255 255 / 0.07)"
  border-strong: "rgb(255 255 255 / 0.12)"
  primary: "#1688ff"
  primary-strong: "#0b72e0"
  primary-foreground: "#ffffff"
  danger: "#ff7066"
  danger-strong: "#c4352c"
  danger-foreground: "#ffffff"
  light-background: "#ffffff"
  light-surface: "#ffffff"
  light-surface-raised: "#f6f6f6"
  light-surface-active: "#ebebeb"
  light-muted: "#ebebeb"
  light-foreground: "#202020"
  light-muted-foreground: "#646464"
  light-faint: "#707070"
  light-border: "rgb(0 0 0 / 0.09)"
  light-border-strong: "rgb(0 0 0 / 0.16)"
  light-primary: "#0874e3"
  light-primary-strong: "#0874e3"
  light-danger: "#c4352c"
  light-danger-strong: "#c4352c"
  light-danger-foreground: "#ffffff"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.65rem, 4vw, 2.15rem)"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  micro:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.12em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.625rem"
    fontWeight: 400
    lineHeight: 1.4
spacing:
  base: "4px"
  tight: "8px"
  compact: "12px"
  standard: "16px"
  roomy: "24px"
  section: "32px"
  page: "64px"
rounded:
  control: "8px"
  field: "12px"
  panel: "16px"
  composer: "20px"
  full: "9999px"
components:
  button-send:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
    size: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 12px"
  button-primary:
    backgroundColor: "{colors.primary-strong}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
    height: "40px"
    padding: "0 20px"
  button-danger:
    backgroundColor: "{colors.danger-strong}"
    textColor: "{colors.danger-foreground}"
    rounded: "{rounded.full}"
    height: "44px"
    padding: "0 20px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.full}"
    height: "40px"
    padding: "8px 14px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.field}"
    height: "44px"
    padding: "0 12px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 12px"
  composer:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.composer}"
    padding: "3px"
  floating-menu:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.field}"
    padding: "6px"
---

# Cognacta 设计系统

## Overview

**Creative North Star: "The Quiet Instrument"**

Cognacta 是企业级 agent 运行底座：agent 在服务端运行，人在这里下达意图、观察执行、接管异常。界面不是展示 AI 的橱窗，而是一台安静的仪器——大部分时间它是暗的、稳的、可读的；只有当机器需要人做决定或正在回应时，才亮起一处电光蓝。

这个系统建立在石墨近黑而不是纯黑上。长时间值守时，纯黑会让 1px 细线消失，石墨保留层级；深度用色调台阶与发丝边框表达，投影只属于真正浮在内容之上的层。排版只有 Geist 一个家族，负字距只出现在 display，正文保持中性。动效分两档：结构变化用弹簧，状态反馈用 160–220ms 的快速缓出。界面默认简体中文，英文是完整镜像；两套语言共享同一套令牌、栅格与组件。

**Key Characteristics:**
- 石墨近黑底，电光蓝是唯一彩度，且单屏不超过 10%
- 1px 发丝线与三级色调台阶分层；静态表面没有投影
- Geist 单一家族；display 收字距，正文不收
- 248px 固定侧栏 + 单列工作区（44rem / 48rem）
- 弹簧只给结构变化，状态反馈 160–220ms；全量 reduced-motion 降级

## Colors

克制的单色信号系统：中性面负责结构与可读性，电光蓝负责"可以行动"和"机器正在回应"。

### Primary
- **Electric Blue**（`primary`）：图标、链接、品牌标记、focus ring、发送键。它是唯一允许出现彩度的信号色。
- **Electric Blue Deep**（`primary-strong`）：承载白色文字（含 14px 标签）的实底按钮；对白字 ≥4.5:1。同族加深，不引入第二种蓝。
- **Electric Blue (Light)**（`light-primary` / `light-primary-strong`）：亮色主题下统一收敛到更深的同族蓝，链接与实底按钮都满足 ≥4.5:1。

### Neutral
- **Graphite**（`background`）：应用与内容底。不是纯黑，保留细线可见性。
- **Graphite Raised**（`surface-raised`）：品牌 tile、浮层、需要从底面上抬起一级的表面。
- **Graphite Active**（`surface-active`）：hover、当前行、当前模式 pill 的填充。
- **Bone**（`foreground`）：主文字与图标。
- **Ash**（`muted-foreground`）：次级文字、说明、placeholder；对底色 ≥4.5:1。
- **Dust**（`faint`）：三级信息，只用于 10–12px 的快捷键角标与分组标签。
- **Hairline / Hairline Strong**（`border` / `border-strong`）：1px 分隔线、输入框、浮层轮廓；强线只给需要明确边界的浮层。

### Tertiary
- **Signal Red**（`danger`）：错误文字、破坏性图标与 focus；对石墨底 6.4:1。不参与品牌表达。
- **Signal Red Deep**（`danger-strong`）：带白字的破坏性实底按钮；白字 ≥4.5:1。

### Named Rules
**The Blue Signal Rule.** 蓝色只回答两个问题："这里可以行动"和"机器正在回应"。不铺底、不做渐变、不做装饰性光晕；单屏蓝色面积不超过 10%。

**The No-Pure-Black Rule.** 深色底是石墨，不是纯黑；纯黑只允许出现在图片遮罩和媒体预览。

**The Daylight Mirror Rule.** 亮色主题是同一套层级的白昼镜像，不是反色补丁；每个中性 token 都有对应的 light 值，切换主题不改变信息层级。

**The Text-Safe Fill Rule.** 任何承载白色文字的实底按钮使用 `primary-strong` 或 `danger-strong`；`primary` / `danger` 只用于图标、文字、边框和 focus，保证信号色在深色底与白字之间都成立。

## Typography

**Display Font:** Geist Variable（next/font 自托管，`ui-sans-serif` 回退）
**Body Font:** 同族 Geist Variable；中文回退 PingFang SC / Microsoft YaHei
**Mono Font:** Geist Mono

**Character:** 工程感的无衬线，字面窄、字重收敛。它不靠字体个性说话，靠字号、字重和字距的落差建立层级；没有衬线、没有第二个展示字体、也没有标题上方全大写宽字距的 eyebrow。

### Hierarchy
- **Display**（500，`clamp(1.65rem, 4vw, 2.15rem)`，1.25，-0.04em）：只给空状态的主问句。字距收到底线 -0.04em，不再更低。
- **Headline**（600，1.5rem，1.4，-0.025em）：页面标题，如 Settings、Projects。
- **Title**（600，1.25rem，1.4，-0.02em）：侧栏字标与区块标题。
- **Body**（400，0.875rem，1.5）：对话、设置、说明的默认正文。
- **Small**（400，0.8125rem，1.45）：starter chip 与次级说明。
- **Label**（500，0.75rem，1.4）：表单标签、菜单说明。
- **Micro**（500，0.625rem，1.4，0.12em，uppercase）：只用于侧栏与命令面板的分组标签，不用于标题上方。
- **Mono**（400，0.625rem，1.4）：快捷键、ID、代码、数值。

### Named Rules
**The One Family Rule.** 拉丁字形只有 Geist 一个家族；不引入第二套展示字体，不用衬线制造"编辑感"。

**The Tracking Floor Rule.** 负字距只属于 display 与 headline，最深 -0.04em；正文、标签、按钮一律 0。

**The Mono Is Data Rule.** 等宽只用于快捷键、ID、代码和需要对齐的数值；不用它给普通标签制造"技术感"。

**The Chinese-First Rule.** 简体中文是默认界面语言，英文是同一组消息键的完整镜像。中文正文行高不低于 1.5；不靠加宽字距制造标题层级，布局按中文字符宽度验证。

## Layout

应用外壳是 `h-dvh` 的左右结构：左侧 248px 固定侧栏，右侧单列工作区。侧栏在 <1024px 收起为 `min(85vw, 17rem)` 的抽屉；内容区不设卡片网格，所有主要任务都在单列里完成。

- **Rail：** 248px；水平内边距 10px、垂直 12px；品牌行 40px；模式切换 3 等分 40px；导航行 36px；分组间距 20px；底部账户行 56px。
- **空状态：** 内容列 44rem；顶部 `clamp(4rem, 11vh, 7.5rem)`；主问句与 composer 间距 28px；starter chips 与 composer 间距 16px。
- **对话：** 列宽 48rem；消息间距 28px；顶部 40–64px；composer 固定在列底。
- **设置与知识库：** 列宽 48rem；顶部 80px（桌面 48px）；左右 20–32px。
- **节奏：** 4px 基线；常用步进 8 / 12 / 16 / 24 / 32 / 64。紧邻元素用 4–8，区块之间用 24–32，页面顶部用 64–80。

### Named Rules
**The Rail Rule.** 侧栏固定 248px，不随视口变宽；信息密度靠行高与分组建立，不靠拉伸。

**The One Column Rule.** 工作区永远是一列。需要并列比较时用行内分组或临时浮层，不把页面拆成卡片矩阵。

## Elevation & Depth

默认平面。深度由三级色调台阶（底 → raised → active）和 1px 发丝线表达，静态表面不使用投影。投影只属于真正覆盖在内容之上的层：下拉菜单、命令面板、技能浮层、图片预览。Composer 用 3px 的 muted 外圈包住内层背景，制造一条"凹槽"，不靠阴影。

### Shadow Vocabulary
- **Floating**（`0 16px 48px -28px rgb(0 0 0 / 0.55)`）：覆盖内容的菜单与浮层；配合 1px `border-strong`。
- **Ambient**（`0 1px 2px rgb(0 0 0 / 0.05)`）：只用于需要轻微离面的预览卡。

### Named Rules
**The Border-or-Shadow Rule.** 静态表面只用边框；浮层才同时拥有边框与投影。两者不在同一张卡片上重复声明。

**The Frosted Layer Rule.** 背景模糊只给瞬时浮层和模态背板；内容卡片、侧栏、composer 永远实色。

## Shapes

控制件 8px，字段与面板 12px，卡片 16px，composer 外圈 20px（内圈 17.6px 形成 3px 凹槽），状态与筛选 chip 全圆角。所有边框 1px；不使用 24px 以上的容器圆角。

### Named Rules
**The 8/12/16 Rule.** 可点击的小控制件 8px，输入与面板 12px，容器 16px；同一视图内不超过三档圆角。

## Components

### Buttons
- **Send（primary）：** 36px 圆形、电光蓝底、白色 18px 箭头；hover 降到 85% 不透明度；focus-visible 用 2px ring + 2px offset；生成中切换为 stop 方块。箭头是图形，3:1 即可。
- **Primary text（primary-strong）：** 40px 高（设置页 44px）、全圆角、白色标签；保存、连接、创建等带文字的主动作，白字 ≥4.5:1。
- **Danger text（danger-strong）：** 44px 高、全圆角、白字；只用于确认删除这类不可逆动作。
- **Ghost / icon：** 36–40px 方形、透明底、8px 圆角；hover 用 `surface-active`；focus 同 ring。
- **Text / link：** 蓝色文字 + 4px 下划线偏移；不把链接做成按钮。

### Chips
- **Starter chip：** 最小 40px 高、全圆角、透明底、1px `border`、13px 文字、`muted-foreground`；hover 时边框升到 `border-strong`、底变 `surface-raised`、文字变 `foreground`，图标转蓝。
- **状态 chip：** 全圆角 + 1px 边框 + 12px 文字；颜色只用于状态，不填充大面积。

### Inputs / Fields
- **Default：** 44px 高、12px 圆角、`background` 底、1px `border`、14px 文字；placeholder 用 `muted-foreground`。
- **Focus：** 边框转 `muted-foreground`，不加蓝色 glow；主按钮才有蓝色 ring。
- **Error：** `aria-invalid` 时边框转 `danger`；禁用态 50% 不透明度。

### Navigation
- **Rail：** 248px、`surface` 底；品牌 20px/600；搜索与收起是 40px 图标按钮。
- **Mode pill：** 3 等分、40px 高、8px 圆角；激活项用 `surface-active` 实底 + `foreground`，用 `SPRING_SWAP` 在项间移动。
- **Rows：** 36px 高、8px 圆角、16px 图标、14px 文字；默认 `muted-foreground`，hover 与当前行用 `surface-active` + `foreground`。
- **Groups：** 10px / 500 / 0.12em uppercase、`faint`；只做分组标签。
- **Profile：** 56px 行；32px 圆形头像；14px 名称 + 12px 次级。

### Composer（signature）
- 外层 `muted` 底、3px padding、20px 圆角；内层 `background`、17.6px 圆角、最小 80px、三行起。
- 顶部 credits 条：12–13px `muted-foreground`，与输入区之间没有分隔线。
- 工具栏：左侧 attach / search / model，右侧 36px 蓝色发送键；模型选择是 13px 文字 + chevron，不做成按钮块。
- compact 态（对话底部）最小 40px、单行起；技能命令浮层覆盖在 composer 上方，带 `border-strong`、磨砂和投影。

### Floating Layers
- **Dropdown：** 12px 圆角、`surface-raised`、1px 强边框、投影；从触发点用 clip-path + scale 0.96 展开，180–220ms。
- **Command palette：** 居中、最大 36rem、16px 圆角、`background` 实底、1px 边框；搜索行 48px；分组标签 10px uppercase；键盘高亮用 `primary/5` 的极浅底 + `foreground` 文字。
- **Modal：** 16px 圆角、`background` 实底、1px 边框、24px padding、最大 24–36rem；背板 `foreground/10` + blur，进出 150–200ms。
- **Image preview：** 全屏 `black/70` + blur-sm；关闭按钮 36px 圆形。

### Motion
- **状态反馈：** `cubic-bezier(0.16, 1, 0.3, 1)`，160–220ms；用于 hover、颜色、透明度。
- **结构变化：** 弹簧（`SPRING_SWAP` 460/30/0.55、`SPRING_PANEL` 420/40/0.5）；用于模式 pill、面板切换与侧栏开合。
- **入场：** 450–600ms 淡入 + 8–14px 位移，错峰 60ms；只增强已经可见的默认态。
- **Reduced motion：** 全局 0.01ms 并关闭弹簧；不把内容可见性门控在动画上。

## Do's and Don'ts

### Do
- **Do** 让电光蓝保持稀缺：单屏 ≤10%，只给主操作、当前状态、链接和 focus。
- **Do** 用 1px 发丝线与色调台阶建立层级；静态表面不加投影。
- **Do** 保持正文与 placeholder ≥4.5:1；`faint` 只用于 10–12px 的三级信息。
- **Do** 用 248px 侧栏 + 单列工作区；把复杂度收进浮层和抽屉。
- **Do** 结构变化用弹簧，状态反馈用 160–220ms 缓出；两者不要互换。
- **Do** 保持 Geist 单一家族，display 最深只收到 -0.04em。
- **Do** 在承载白字的实底按钮上使用 `primary-strong` / `danger-strong`，保证 ≥4.5:1。
- **Do** 中英文各跑一遍主要断点，中文文案不溢出、不挤压控件。

### Don't
- **Don't** 引入第二个品牌色、第二套展示字体或衬线字体。
- **Don't** 使用渐变文字、发光 orb、星光粒子或"AI 感"装饰。
- **Don't** 在内容卡片、侧栏或 composer 上使用背景模糊；磨砂只给浮层。
- **Don't** 把页面拆成同尺寸卡片矩阵或嵌套卡片；工作区是一列。
- **Don't** 用纯黑做底，或用大面积蓝色铺底。
- **Don't** 用亮信号色承载小字号白字；实底按钮走 deep 变体。
- **Don't** 在标题上方加全大写宽字距的 eyebrow；分组标签只属于导航和菜单。
- **Don't** 用投影替代边框，或让边框和投影在同一张静态卡片上同时出现。
