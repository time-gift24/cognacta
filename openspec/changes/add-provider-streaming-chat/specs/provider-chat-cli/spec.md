## ADDED Requirements

### Requirement: Feature-gated clap command

现有 cognacta-cli SHALL 使用 clap 处理帮助、版本和命令参数。默认关闭的 Cargo feature `cognacta-test` SHALL 控制 chat 子命令及接入所需可选依赖，不控制整个 binary。启用后 chat SHALL 要求 --config、--provider 和 --model 三个参数；模型选择只在启动时完成。

#### Scenario: Default CLI remains available
- **WHEN** 未启用 cognacta-test 构建并运行 CLI
- **THEN** 无参数版本输出、--help 和 --version 可用，帮助中不包含 chat，调用 chat 以未知命令失败

#### Scenario: Launch configured chat
- **WHEN** 启用 cognacta-test 并传入合法的 chat --config providers.toml --provider company-gateway --model model-a
- **THEN** 加载并校验 TOML，选择该 Model 后进入逐行交互

#### Scenario: Missing argument or unknown model
- **WHEN** 缺少必填参数或配置中不存在指定 Provider/模型
- **THEN** 输出明确错误并非零退出，不猜测默认值，不发送模型请求

### Requirement: Interactive streamed text and complete history

CLI SHALL 逐行读取输入，忽略纯空白行，只去掉正常输入的行末换行；每个非空输入发起一轮生成。收到文本 delta SHALL 立即写 stdout 并 flush。只有完整成功的生成 SHALL 将本轮 user 与 Completed 中的完整 assistant 一起追加到内存历史；下一轮 SHALL 携带全部已成功历史。

#### Scenario: Carry two successful turns
- **WHEN** 用户依次输入两个问题且第一轮正常完成
- **THEN** 第二个 HTTP 请求恰好包含第一轮 user、第一轮完整 assistant 和第二轮 user
- **AND** 每轮文字在对应响应结束之前开始出现在 stdout

#### Scenario: Ignore blank input
- **WHEN** 用户输入空行或纯空白行
- **THEN** 继续等待输入，历史不变且不调用 Provider

### Requirement: Simple exit and failure behavior

输入 EOF 或独占一行的 /exit SHALL 正常退出。配置、鉴权、HTTP、传输、解码、截断或终端 I/O 失败 SHALL 报错并非零退出；未完成轮次 SHALL 不进入历史，不自动重试或继续对话。响应流 EOF SHALL 不被当作输入 EOF 处理。

#### Scenario: Exit on input EOF or exit command
- **WHEN** 等待下一条输入时遇到 EOF 或 /exit
- **THEN** 正常退出且不发起新的模型请求

#### Scenario: Fail after partial output
- **WHEN** 已显示部分文本但生成流返回错误或缺少 Completed 就结束
- **THEN** stderr 显示错误，进程非零退出，当前 user 和部分 assistant 不提交历史，不发送下一轮请求

### Requirement: Local automated streaming acceptance

验收 SHALL 使用人工标注的测试数据、临时 TOML、假凭据和本地 HTTP 服务，不依赖真实模型账户或付费服务。CLI 集成测试 SHALL 验证 feature、两轮上下文、首段实时输出和失败退出；工具调用 SHALL 不纳入本次测试范围。联网集成目标 SHALL 与无网络 UT 分开。

#### Scenario: Verify the configuration-to-CLI path
- **WHEN** 自动测试用 stdin/stdout 驱动启用 feature 的 CLI，连接本地 HTTP 服务
- **THEN** 验证选中 Provider、路径前缀、模型、认证头和两轮 messages，并在服务发出终止事件前确认收到首段输出
- **AND** 正常结束、HTTP 错误及截断场景均得到规定的退出结果，测试超时明确失败
