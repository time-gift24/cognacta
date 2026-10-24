---
name: Cognacta Canopy
description: Cognacta 企业 agent 工作台的设计系统。石墨绿为默认画布，单一翠绿信号色，Geist 字体；玻璃只给 composer、浮层与抽屉，亮色是同一层级的白昼镜像，默认简体中文并以英文为完整镜像。
colors:
  background: "#131513"
  surface: "#1a1d1a"
  surface-raised: "#202420"
  surface-active: "#272d27"
  muted: "#1a1d1a"
  foreground: "#eff3f1"
  muted-foreground: "#9aa39c"
  faint: "#8a918d"
  border: "rgb(255 255 255 / 0.07)"
  border-strong: "rgb(255 255 255 / 0.13)"
  primary: "#3ace93"
  primary-strong: "#3ace93"
  primary-foreground: "#011c11"
  danger: "#ee343b"
  danger-strong: "#9e2026"
  danger-foreground: "#ffffff"
  glass: "oklch(20% 0.01 160 / 0.55)"
  glass-border: "rgb(255 255 255 / 0.08)"
  light-background: "#fcfcfc"
  light-surface: "#f4f6f4"
  light-surface-raised: "#eef1ef"
  light-surface-active: "#e7ebe9"
  light-muted: "#f1f4f2"
  light-foreground: "#0e1310"
  light-muted-foreground: "#5d6561"
  light-faint: "#636d67"
  light-border: "rgb(18 30 24 / 0.08)"
  light-border-strong: "rgb(18 30 24 / 0.14)"
  light-primary: "#007d53"
  light-primary-strong: "#007d53"
  light-primary-foreground: "#ffffff"
  light-danger: "#a92227"
  light-danger-strong: "#9e2026"
  light-danger-foreground: "#ffffff"
  light-glass: "rgb(255 255 255 / 0.72)"
  light-glass-border: "rgb(18 30 24 / 0.12)"
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
    backgroundColor: "{colors.glass}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.composer}"
    padding: "3px"
  floating-menu:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.field}"
    padding: "6px"
---

# Cognacta Canopy 设计系统

## Overview

**Creative North Star: "The Quiet Instrument"**

Cognacta 是企业级 agent 运行底座：agent 在服务端运行，人在这里下达意图、观察执行、接管异常。界面不是展示 AI 的橱窗，而是一台安静的仪器——大部分时间它是暗的、稳的、可读的；只有当机器需要人做决定或正在回应时，才亮起一处翠绿。

这个系统建立在石墨绿而不是纯黑上。长时间值守时，纯黑会让 1px 细线消失，石墨保留层级；深度用色调台阶、发丝边框与一层克制的玻璃表达。排版只有 Geist 一个家族，负字距只出现在 display，正文保持中性。动效分两档：结构变化用弹簧，状态反馈用 160–220ms 的快速缓出。界面默认简体中文，英文是完整镜像；两套语言共享同一套令牌、栅格与组件。

**Key Characteristics:**
- 石墨绿底，翠绿是唯一彩度，且单屏不超过 10%
- 1px 发丝线、三级色调台阶与克制的玻璃分层
- Geist 单一家族；display 收字距，正文不收
- 248px 固定侧栏 + 单列工作区（44rem / 48rem）
- 玻璃只给 composer、浮层与抽屉；静态内容保持实色
- 弹簧只给结构变化，状态反馈 160–220ms；全量 reduced-motion 降级

## Colors

克制的绿色信号系统：石墨绿中性面负责结构与可读性，翠绿负责"可以行动"和"机器正在回应"。

### Primary
- **Canopy Green**（`primary`）：图标、链接、品牌标记、focus ring、发送键。暗主题用亮翠绿，亮主题用深翠绿；它是唯一允许出现彩度的信号色。
- **Canopy Green Deep**（`primary-strong`）：承载文字的主按钮。与 `primary` 同值，靠 `primary-foreground` 保证对比：暗主题深墨字，亮主题白字。
- **Canopy Green (Light)**（`light-primary` / `light-primary-strong`）：亮色主题下的深翠绿，白字与白底链接都满足 ≥4.5:1。

### Neutral
- **Graphite Canopy**（`background`）：应用与内容底。不是纯黑，而是带绿倾向的 #131513。
- **Pine Surface**（`surface`）：侧栏与需要从内容底上抬起一级的表面。
- **Pine Raised**（`surface-raised`）：菜单、卡片、需要更明确层级的表面。
- **Pine Active**（`surface-active`）：hover、当前行、当前模式 pill 的填充。
- **Bone**（`foreground`）：主文字与图标。
- **Sage Ash**（`muted-foreground`）：次级文字、说明、placeholder；对底色 ≥4.5:1。
- **Moss Dust**（`faint`）：三级信息，只用于 10–12px 的快捷键角标与分组标签。
- **Hairline / Hairline Strong**（`border` / `border-strong`）：1px 分隔线、输入框、浮层轮廓；强线只给需要明确边界的浮层。

### Tertiary
- **Signal Red**（`danger`）：错误文字、破坏性图标与 focus；暗主题 #ee343b，亮主题 #a92227。
- **Signal Red Deep**（`danger-strong`）：带白字的破坏性实底按钮；白字 ≥4.5:1。

### Glass
- **Canopy Glass**（`glass` / `glass-border`）：暗主题 55% 松绿底，亮主题 72% 白底；1px 玻璃边框 + 内侧 1px 高光。只用于 composer、下拉菜单、命令面板、移动抽屉与图片预览，不铺在内容卡片上。

### Named Rules
**The Canopy Signal Rule.** 翠绿只回答两个问题："这里可以行动"和"机器正在回应"。不铺底、不做渐变、不做装饰性光晕；单屏绿色面积不超过 10%。

**The No-Pure-Black Rule.** 深色底是石墨绿，不是纯黑；纯黑只允许出现在图片遮罩和媒体预览。

**The Daylight Mirror Rule.** 亮色主题是同一套层级的白昼镜像，不是反色补丁；每个中性 token 都有对应的 light 值，切换主题不改变信息层级。

**The Text-Safe Fill Rule.** 暗主题的亮绿实底配深墨字（8.9:1），亮主题的深绿实底配白字（5.0:1）；实底危险按钮用 `danger-strong`。不靠降低品牌色饱和度换取对比。

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

默认平面，加一层克制的玻璃。深度先由三级色调台阶（底 → surface → raised/active）和 1px 发丝线表达；只有真正浮在内容之上的层才使用 `.glass-panel`：22px 背景模糊、55% 松绿或 72% 白底、1px 玻璃边框、内侧 1px 高光，以及向下扩散的柔和投影。Composer 外层是玻璃，内层输入面是 84% 实底，不再叠第二层模糊。设置卡片、知识条目、侧栏保持实色。

### Shadow Vocabulary
- **Floating**（`0 24px 64px -36px rgb(0 0 0 / 0.5)`）：下拉菜单、命令面板、图片预览等覆盖内容的层。
- **Glass edge**（`inset 0 1px 0 rgb(255 255 255 / 0.07)`）：玻璃上沿的物理高光，暗色更明显，亮色用白色高光。
- **Ambient**（`0 1px 2px rgb(0 0 0 / 0.05)`）：只用于需要轻微离面的预览卡。

### Named Rules
**The Border-or-Shadow Rule.** 静态表面只用边框；浮层才同时拥有边框与投影。两者不在同一张卡片上重复声明。

**The Glass Frontier Rule.** 玻璃只给 composer、下拉菜单、命令面板、移动抽屉和图片预览；设置卡片、知识条目、侧栏保持实色。一层只做一次 backdrop-filter，不把玻璃叠在玻璃上。

**The Daylight Material Rule.** 暗色玻璃用 55% 松绿底与白色高光；亮色玻璃用 72% 白底与松绿边框。两种主题下正文始终落在实色或近实色面上。

## Shapes

控制件 8px，字段与面板 12px，卡片 16px，composer 外圈 20px（内圈 17.6px 形成 3px 凹槽），状态与筛选 chip 全圆角。所有边框 1px；不使用 24px 以上的容器圆角。

### Named Rules
**The 8/12/16 Rule.** 可点击的小控制件 8px，输入与面板 12px，容器 16px；同一视图内不超过三档圆角。

## Components

### Buttons
- **Send（primary）：** 36px 圆形、翠绿底、`primary-foreground` 18px 箭头（暗主题深墨、亮主题白）；hover 降到 85% 不透明度；focus-visible 用 2px ring + 2px offset；生成中切换为 stop 方块。箭头是图形，3:1 即可。
- **Primary text（primary-strong）：** 40px 高（设置页 44px）、全圆角、`primary-foreground` 标签；保存、连接、创建等带文字的主动作，白字 ≥4.5:1。
- **Danger text（danger-strong）：** 44px 高、全圆角、白字；只用于确认删除这类不可逆动作。
- **Ghost / icon：** 36–40px 方形、透明底、8px 圆角；hover 用 `surface-active`；focus 同 ring。
- **Text / link：** 翠绿文字 + 4px 下划线偏移；不把链接做成按钮。

### Chips
- **Starter chip：** 最小 40px 高、全圆角、透明底、1px `border`、13px 文字、`muted-foreground`；hover 时边框升到 `border-strong`、底变 `surface-raised`、文字变 `foreground`，图标转翠绿。
- **状态 chip：** 全圆角 + 1px 边框 + 12px 文字；颜色只用于状态，不填充大面积。

### Inputs / Fields
- **Default：** 44px 高、12px 圆角、`background` 底、1px `border`、14px 文字；placeholder 用 `muted-foreground`。
- **Focus：** 边框转 `muted-foreground`，不加彩色 glow；主按钮才有翠绿 ring。
- **Error：** `aria-invalid` 时边框转 `danger`；禁用态 50% 不透明度。

### Navigation
- **Rail：** 248px、`surface` 实底；品牌 20px/600；搜索、主题切换与收起是 40px 图标按钮。
- **Mode pill：** 3 等分、40px 高、8px 圆角；激活项用 `surface-active` 实底 + `foreground`，用 `SPRING_SWAP` 在项间移动。
- **Rows：** 36px 高、8px 圆角、16px 图标、14px 文字；默认 `muted-foreground`，hover 与当前行用 `surface-active` + `foreground`。
- **Groups：** 10px / 500 / 0.12em uppercase、`faint`；只做分组标签。
- **Profile：** 56px 行；32px 圆形头像；14px 名称 + 12px 次级。

### Composer（signature）
- 外层 `glass-panel`、3px padding、20px 圆角；内层 84% 实底、17.6px 圆角、最小 80px、三行起。
- 顶部 credits 条：12–13px `muted-foreground`，与输入区之间没有分隔线。
- 工具栏：左侧 attach / search / model，右侧 36px 翠绿发送键；模型选择是 13px 文字 + chevron，不做成按钮块。
- compact 态（对话底部）最小 40px、单行起；技能命令浮层覆盖在 composer 上方，带 `border-strong`、磨砂和投影。

### Floating Layers
- **Dropdown：** 12px 圆角、玻璃面板、1px 玻璃边框、投影；从触发点用 clip-path + scale 0.96 展开，180–220ms。
- **Command palette：** 居中、最大 36rem、16px 圆角、玻璃面板；搜索行 48px；分组标签 10px uppercase；键盘高亮用 `primary/5` 的极浅底 + `foreground` 文字。
- **Modal：** 16px 圆角、`background` 实底、1px 边框、24px padding、最大 24–36rem；背板 `foreground/10` + blur，进出 150–200ms。
- **Image preview：** 全屏 `black/70` + blur-sm；关闭按钮 36px 圆形。

### Motion
- **状态反馈：** `cubic-bezier(0.16, 1, 0.3, 1)`，160–220ms；用于 hover、颜色、透明度。
- **结构变化：** 弹簧（`SPRING_SWAP` 460/30/0.55、`SPRING_PANEL` 420/40/0.5）；用于模式 pill、面板切换与侧栏开合。
- **入场：** 450–600ms 淡入 + 8–14px 位移，错峰 60ms；只增强已经可见的默认态。
- **Reduced motion：** 全局 0.01ms 并关闭弹簧；不把内容可见性门控在动画上。

## Do's and Don'ts

### Do
- **Do** 让翠绿保持稀缺：单屏 ≤10%，只给主操作、当前状态、链接和 focus。
- **Do** 用 1px 发丝线与色调台阶建立层级；静态表面不加投影。
- **Do** 把玻璃给 composer、浮层、命令面板和移动抽屉；一层只做一次模糊。
- **Do** 保持正文与 placeholder ≥4.5:1；`faint` 只用于 10–12px 的三级信息。
- **Do** 用 248px 侧栏 + 单列工作区；把复杂度收进浮层和抽屉。
- **Do** 结构变化用弹簧，状态反馈用 160–220ms 缓出；两者不要互换。
- **Do** 保持 Geist 单一家族，display 最深只收到 -0.04em。
- **Do** 暗主题用亮绿配深墨字，亮主题用深绿配白字；两套都过 4.5:1。
- **Do** 中英文各跑一遍主要断点，中文文案不溢出、不挤压控件。

### Don't
- **Don't** 引入第二个品牌色、第二套展示字体或衬线字体。
- **Don't** 使用渐变文字、发光 orb、星光粒子或"AI 感"装饰。
- **Don't** 在设置卡片、知识条目或侧栏上使用背景模糊；玻璃只给 frontier 层。
- **Don't** 把玻璃叠在玻璃上，或在同一块区域叠加多层 backdrop-filter。
- **Don't** 把页面拆成同尺寸卡片矩阵或嵌套卡片；工作区是一列。
- **Don't** 用纯黑做底，或用大面积绿色铺底。
- **Don't** 用亮信号色承载小字号白字；实底按钮使用对应主题的 `primary-foreground`。
- **Don't** 在标题上方加全大写宽字距的 eyebrow；分组标签只属于导航和菜单。
- **Don't** 用投影替代边框，或让边框和投影在同一张静态卡片上同时出现。
