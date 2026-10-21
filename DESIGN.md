---
version: alpha
name: Cognacta Pine
description: 企业级 agent 运行底座的设计系统。亮色为主、暗色一等公民；克制策略：带绿倾向的中性面 + 单一深青绿签名色；中文 MiSans + 西文 Geist Variable 自托管。
colors:
  pine-50: "oklch(0.965 0.012 168)"
  pine-100: "oklch(0.925 0.028 168)"
  pine-200: "oklch(0.845 0.05 168)"
  pine-300: "oklch(0.75 0.075 169)"
  pine-400: "oklch(0.65 0.095 170)"
  pine-500: "oklch(0.55 0.1 170)"
  pine-600: "oklch(0.46 0.085 169)"
  pine-700: "oklch(0.38 0.065 167)"
  pine-800: "oklch(0.3 0.045 165)"
  pine-900: "oklch(0.24 0.03 163)"
  background: "oklch(0.985 0.003 168)"
  surface: "oklch(1 0 0)"
  foreground: "oklch(0.21 0.012 168)"
  muted: "oklch(0.955 0.006 168)"
  muted-foreground: "oklch(0.46 0.015 168)"
  border: "oklch(0.905 0.008 168)"
  primary: "{colors.pine-700}"
  primary-hover: "{colors.pine-800}"
  primary-foreground: "oklch(0.985 0.004 168)"
  accent: "{colors.pine-100}"
  accent-foreground: "{colors.pine-800}"
  destructive: "oklch(0.577 0.215 27)"
  dark-background: "oklch(0.175 0.01 170)"
  dark-surface: "oklch(0.215 0.012 170)"
  dark-foreground: "oklch(0.965 0.005 168)"
  dark-muted: "oklch(0.26 0.012 170)"
  dark-muted-foreground: "oklch(0.72 0.02 170)"
  dark-border: "oklch(1 0 0 / 10%)"
  dark-primary: "oklch(0.74 0.115 172)"
  dark-primary-foreground: "{colors.pine-900}"
typography:
  display:
    fontFamily: "'Geist Variable', 'MiSans', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: "'Geist Variable', 'MiSans', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.015em
  headline-md:
    fontFamily: "'Geist Variable', 'MiSans', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: -0.01em
  body-lg:
    fontFamily: "'Geist Variable', 'MiSans', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.7
  body-md:
    fontFamily: "'Geist Variable', 'MiSans', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.7
  body-sm:
    fontFamily: "'Geist Variable', 'MiSans', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.6
  label-md:
    fontFamily: "'Geist Variable', 'MiSans', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
  label-sm:
    fontFamily: "'Geist Variable', 'MiSans', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
  mono-data:
    fontFamily: "'Geist Mono', 'JetBrains Mono', 'MiSans', monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.6
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
rounded:
  sm: 6px
  md: 8px
  lg: 10px
  xl: 14px
  shell: 18px
  full: 9999px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
    height: 36px
    padding: 16px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: 36px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: 24px
  floating-layer:
    backgroundColor: "color-mix(in oklch, {colors.surface} 80%, transparent)"
    rounded: "{rounded.xl}"
---

# Cognacta 设计系统

## Overview

Cognacta 是企业级 agent 运行底座，主用户是中国企业的业务构建者。界面的情绪目标是：打开时感到**笃定**（基础设施的分量）、使用中感到**通透**（信息无黑盒、永远可以下钻）、细节上感到**手工艺的**（动效、字体、材质都被照顾过）。

色彩策略是克制（Restrained）：主体是带极轻微绿倾向的中性面，唯一的签名色是深青绿（Pine），占用 ≤10% 视觉面积。亮色主题为主，暗色是一等公民而非反色补丁。磨砂质感只出现在有浮层语义的地方。运维端复用全部令牌，但信息密度更高、动效更收敛。

## Colors

- **Primary / 松绿（`pine-700`，亮主题操作色）：** 深青绿是唯一签名色，只给每屏最重要的主操作、导航激活态和关键强调。亮主题用 `pine-700`，hover 降到 `pine-800`；暗主题改用更亮的 `oklch(0.74 0.115 172)` 保证对比度。
- **Neutral / 雾面中性：** `background` 是近白但带 0.003 绿倾向的雾面，`surface` 纯白承载内容卡片，`muted` 给次级填充。所有中性色带 0.003–0.02 的绿彩度，与签名色同族，不做无彩度纯灰。
- **Foreground：** 正文 `foreground`（对比度 >12:1），次要文字 `muted-foreground`（对 `background` ≥4.5:1，不得再浅）。
- **Destructive：** 唯一的功能色，只在破坏性操作和错误态出现。

## Typography

中西文混排是第一优先级：**西文和数字用 Geist Variable，中文用自托管 MiSans**，浏览器按字形自动分配；系统回退 PingFang SC / 微软雅黑只是兜底，不是设计目标。等宽字体（Geist Mono / JetBrains Mono）只出现在技术下钻层：日志、ID、参数、代码。

- **Display / Headline：** Semibold（600），负字距收紧到 -0.01 ~ -0.02em，不超过 -0.02em；`text-wrap: balance`。
- **Body：** 14px / 1.7 为默认正文（中文长文阅读舒适区），16px 给客户端主要阅读区，13px 给运维端密度场景。
- **Label：** 500 字重，不做全大写 + 宽字距的 eyebrow 样式——中文没有大写，这个 trope 在中文界面里是纯粹的 AI 味。
- 同屏不超过三个字重。

## Layout

4px 基础网格，常用步进 8 / 16 / 24 / 32。客户端内容区宽松（卡片内 padding 24px，区块间距 48–64px），运维端收紧（16 / 24–32）。正文行宽上限 65–75ch（中文约 35–45 字/行）。响应式网格用 `repeat(auto-fit, minmax(280px, 1fr))`，不为每个断点手写媒体查询。z-index 语义分层：dropdown → sticky → modal-backdrop → modal → toast → tooltip，禁止任意值。

## Elevation & Depth

深度用**色调分层 + 1px 边框**表达，不用大面积投影：背景雾面 → 卡片纯白 → 浮层磨砂。浮层（命令面板、popover、peek 面板、modal）允许 `backdrop-filter: blur()` + 80% 透明度背景 + 极窄扩散的阴影（blur ≤ 8px）；1px 边框和投影不同时出现在同一元素上。主内容区卡片永远是实色，不透视。

## Shapes

容器圆角克制：卡片 / 面板 10–14px（`lg`–`xl`），应用外壳 18px（`shell`，仅最外层容器），输入框 10px。按钮、标签、chip 用全圆角（`full`）。禁止 24px 以上的卡片圆角。同一视图内圆角档位不超过三档。

## Motion

分层纪律：**空间结构的变化用弹簧**（侧边栏开合、面板切换、拖拽——沿用 `lib/ease.ts` 的 SPRING_PANEL / SPRING_LAYOUT / SPRING_PRESS），**状态反馈用 150–250ms 的 `EASE_OUT`**（hover、激活、淡入）。不用 bounce、elastic。所有动画必须有 `prefers-reduced-motion` 降级（瞬时或交叉淡入）。入场动画只增强已可见的默认态，不把内容可见性门控在动画 class 上。运维端整体降一档：能用快速缓动的不用弹簧。

## Components

组件基座是 shadcn（radix-nova 风格）+ beui 注册表，视觉令牌以本文件为准覆盖 registry 默认值。

- **Button：** 主按钮松绿实底白字、全圆角、36px 高，每屏至多一个；ghost 按钮用于导航和次级操作。按压反馈用 SPRING_PRESS。
- **Input：** 白底 1px `border` 边框，focus 时边框转 `pine-600` + 2px ring；placeholder 对比度 ≥4.5:1。
- **Card：** 纯白实底、14px 圆角、24px padding、1px 边框或无边框二选一；禁止嵌套卡片。
- **Floating layer（popover / 命令面板 / tooltip / peek）：** 唯一允许磨砂的组件族：80% 白 + backdrop blur + 14px 圆角。
- **SidebarRail：** 现有双层结构（图标栏 + 展开面板）保留，激活态用 `accent`（`pine-100`）底 + `pine-800` 字，不用左侧色条。

## Do's and Don'ts

- Do 每屏只放一个松绿主按钮；激活态用浅绿底而不是深色块。
- Don't 使用蓝紫渐变、渐变文字、发光 orb 或任何"AI 味"装饰。
- Don't 使用节点连线画布；编排一律用结构化表单和流程列表表达。
- Don't 在磨砂浮层之外使用 backdrop-filter 或半透明卡片。
- Do 保持正文对比度 ≥4.5:1，placeholder 同样适用。
- Don't 把超过 1px 的侧边色条当强调手段；用整底 tint 或完整边框。
- Do 中文排版走 MiSans + 1.7 行高，不压缩行高换"紧凑感"——密度靠字号和间距，不靠挤行距。
