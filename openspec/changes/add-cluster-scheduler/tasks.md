# Tasks

## 1. Core 公共类型、错误与注册

- [x] 1.1 在现有 core 中增加私有调度模块并根导出设计规定的类型，完成 State、NodeContext、NodeInstance、Outcome、Control 和带校验的 Node 构造；所有异步 trait/impl 使用 async_trait，bon 具名入口可由外部调用；通过构造 UT 验证非法 ID、合法 ID 及公开读取，不增加 Plan 别名。
- [x] 1.2 扩充既有 thiserror Error struct 的 node_id 上下文、读取/构造入口和六种调度 ErrorKind，保留既有全部来源与诊断 API；同步 Generation 的穷尽分类映射；通过错误 UT 验证原 source 链与原有模型分类不变。
- [x] 1.3 实现 Cluster 的 new/Default、消费式注册及私有异构适配，保持 Input/Payload 的关联类型和注册时的生命周期约束；通过公开注册 UT 验证重复 ID 不覆盖原节点，并检查节点作者不需要访问 Data 或 ErasedNode。

## 2. Run 与串行 Scheduler

- [x] 2.1 实现 Cluster 的 bon start 入口和借用 Cluster 的 Run，完成 state/status/node_id 只读 API；通过构造 UT 验证未知入口、Ready 初始化、构造不调用 body，以及两个 Run 的独立 State；公开文档说明借用期间不能注册节点。
- [x] 2.2 实现 begin_step 的 Ready 检查与 mem::replace 所有权转移，以及 drive 的节点执行、Delta 应用、Goto/Finish 主循环；通过公共驱动 UT 验证非 Clone Input、不同输入类型的链、互斥分支、循环、None 增量与 Finish 携带最终 Delta。
- [x] 2.3 实现统一失败结算和分类转换，保证先写 Failed 再返回 Error；通过公共驱动 UT 验证未知目标、目标 Input 错误、body 错误、Delta 拒绝、前步 Delta 保留、源错误保留，以及再次驱动 Completed/Failed/遗留 Running 时原阶段不变。
- [x] 2.4 为实际使用的 State 示例补充最小增量原子性契约检查，验证非法 Delta 不留下部分修改；在 core 公开 rustdoc 中提供完整注册、start、drive、读取示范，并通过 `SQLX_OFFLINE=true cargo test -p cognacta-core --doc --locked` 验证示范只使用公开 API。

## 3. 已确认的最小观测

- [x] 3.1 使用标准 tracing 为有效 drive 建立 INFO Run span，为每次调用尝试建立 DEBUG step span，按设计记录开始、成功和 WARN 失败；覆盖查找到 Delta 结算的整步，加入安全 NodeId 与固定错误分类；通过捕获事件的 UT 验证失败位置、阶段、层级和结算次数，不增加 Scheduler 指标。
- [x] 3.2 实现私有观测生命周期收尾，正常 drop 时为未结算 Run 与活跃步骤各记录一次 DEBUG 取消，保持业务 phase 不变；验证未 poll 无事件、完成/失败后不重复取消、取消后为遗留 Running，以及 panic 不被误报为正常取消。
- [x] 3.3 对 NodeId 字段编码控制字符并按 UTF-8 边界限制最终 256 字节，所有日志字段显式选取；通过秘密标记和超长/控制字符测试验证 State/Input/Payload/Delta/错误正文/source 均不泄漏，错误 API 的完整 source 仍可访问。
- [x] 3.4 复用现有宿主与 Collector 观测测试边界，验证无初始化、导出失败和输出背压下节点顺序、状态、Error 与业务输出不变；文档注明日志级别、边界、字段和指标延期范围，不增加 Subscriber、日志门面或同步网络发送。

## 4. CLI 六张图与进程验收

- [x] 4.1 在现有 cognacta-test feature 下增加 clap `cluster-demo <SCENARIO>` 分派和私有 cluster_demo 模块，复用 Tokio 与 Collector 生命周期；将 CLI async-trait 增为受 feature 门控的 workspace 正常依赖；用参数 UT 验证七个场景、帮助、未知/缺失参数和默认 feature 关闭行为。
- [x] 4.2 通过 core 公开 API 装配 chain、branch-even、branch-odd，固定初始输入与 State；同时在独立 `tests/cluster_demo.rs` 进程目标增加对应案例，核对精确 stdout 和退出 0，并通过节点行为确认下游看到已提交 Delta 与未选分支不执行。
- [x] 4.3 装配 react-loop 的两个确定性 NodeInstance，使用私有 DemoToolCall 与 ModelInput 实现 model→tool→model；增加进程案例验证 model_calls=2、tool_calls=1、answer=5、退出 0，不读取 Provider 配置或调用真实服务。
- [x] 4.4 装配 node-error、delta-error、input-error 并加入进程案例，核对精确失败摘要、失败节点、保留 value=1、受控错误分类和退出 1；验证 Delta 失败不执行 sentinel、类型错误不进入目标 body，不将预期失败吞成成功。
- [x] 4.5 将 CLI 的 core 错误包装由 Generation 调整为 Core；对调度分类在统一退出路径输出安全分类/节点上下文，既有生成错误保持原展示；通过进程测试验证 stdout/stderr 分离、正常 I/O 下单行摘要、输出失败退出 1且不重跑，以及参数错误退出 2。
- [x] 4.6 在 CLI 使用说明中列出七条可运行命令、六张 Goto 路径图、固定摘要和预期退出码，说明成功/失败案例均由真实 Scheduler 驱动且无需外部业务服务；按说明逐条执行并与 cluster-demo-cli 规格比对，不改项目规范文件。

## 5. 跨模块回归与交付检查

- [x] 5.1 运行 `cargo fmt --all -- --check`、`SQLX_OFFLINE=true cargo check --workspace --all-targets --all-features --locked`、`SQLX_OFFLINE=true cargo clippy --workspace --all-targets --all-features --locked -- -D warnings`；确认新公开接口、feature 门控与穷尽错误映射均通过。
- [x] 5.2 运行 `SQLX_OFFLINE=true cargo test --workspace --lib --bins --all-features --locked`，以及 `SQLX_OFFLINE=true cargo test -p cognacta-cli --test cluster_demo --features cognacta-test --locked` 和同目标的 `--no-default-features --locked` 版本；确认无数据库 UT 与 CLI 进程验收分别通过，不使用全量 all-targets 测试命令。
- [x] 5.3 对改动过的 CLI 统一入口运行既有 `chat` 与 `telemetry` 进程测试目标，确认流式聊天行为、错误展示、Collector 生命周期和遥测故障下输出/退出码未回归；保留新测试图在无 Provider/数据库配置下运行的证据。
- [x] 5.4 对 CLI 依赖用途调整运行 `cargo deny check --disable-fetch`，检查 OpenSpec 与最终 API/场景/文档一致；保留所有测试结果与已知限制，不把未实施任务标为完成。

## 实施验证记录（2026-10-17）

- `cargo fmt --all -- --check`、workspace 全目标全 feature 的 `cargo check` / `cargo clippy -- -D warnings` 均通过，均使用锁定依赖与 `SQLX_OFFLINE=true`（fmt 除外）。
- `cargo test --workspace --lib --bins --all-features --locked`：53 项通过；core rustdoc：1 项通过。
- CLI `cluster_demo` 进程目标：启用 feature 时 6 项通过，关闭时 1 项通过；CLI bin UT 启用时 8 项、关闭时 1 项通过。
- 七条 README 命令逐条执行并匹配精确摘要：chain、branch-even、branch-odd、react-loop 退出 0；node-error、delta-error、input-error 退出 1，分类分别为 NodeExecution、StateDeltaRejected、InputTypeMismatch。
- 所有七案在关闭遥测、正常远程导出、不可用端点和阻塞端点下结果相同；实际 stderr 背压、stdout/stderr BrokenPipe 验证通过。测试子进程清空继承环境，不依赖 Provider、凭据或数据库配置。
- 原有 CLI `chat` / `telemetry` 进程回归各 3 项通过。
- `cargo deny check --disable-fetch` 通过；仍有锁文件中已有的重复版本警告，未修改 Cargo.lock。
- 独立复查未发现执行、生命周期、错误来源或观测契约偏差；没有修改 AGENTS.md、CONTEXT.md 或历史讨论文件。
- 保留设计范围：串行 Goto/Finish，动态目标和输入在执行时校验；没有自动重试、恢复、步数上限或外部副作用回滚。取消可能留下 Running，Delta 原子性由 State 实现保证。
- OpenSpec strict 校验通过，未报告问题；当前 21/21 实施任务完成。
