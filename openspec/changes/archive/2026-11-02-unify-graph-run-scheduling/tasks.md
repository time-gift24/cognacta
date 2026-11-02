## 1. 共用运行记录与状态转换

- [x] 1.1 将既有 Run/NodeRun 状态修改集中到内部方法，保持对外只读；完成判定在 drive 返回后一次提交，验证缺失输出和驱动错误不经过 Completed→Failed。
- [x] 1.2 从现有私有 Execution 中分离通用 ready、Sweep、固定 wave 结果结算和路由操作，保留原有顺序与全部实际错误；不新增第二种 Run、状态机或子图分支。
- [x] 1.3 保持 State::Delta 仅要求 Send、成功输出共享原 Arc、任务释放后独占 State 的契约；让部分启动后驱动失败也能结算实际结果而禁止路由。

## 2. 实际调度接口与本地后端

- [x] 2.1 实现设计中的对象安全 Scheduler 与三操作 Execution，保持泛型运行数据私有；校验驱动操作的合法顺序，不重复验证已构建 Graph。
- [x] 2.2 建立 Arc<dyn Scheduler> 的共用 run/run_builder，迁移入口键校验、异步初始化和现有观测；根导出 SchedulerRunBuilder 及其 bon 状态模块，移除 call-only trait 和重复本地运行入口。
- [x] 2.3 将 LocalScheduler 的 JoinSet 调度循环迁入 drive，由它负责实际准入、逐 Run 并发、补位、panic 归属及全部任务回收；共用入口不隐含创建 LocalScheduler。
- [x] 2.4 增加 Error::Scheduling、Error::scheduling 和 RunError::Scheduling 的 thiserror 契约，保留真实 source；普通节点 Err 经 complete 记录而不中断本波，驱动失败不误分类为初始化失败。

## 3. 普通节点组合与递归绑定

- [x] 3.1 同步调整 NodeInstance 和私有异构 adapter，在执行参数中传入所选 Arc<dyn Scheduler>；Graph/Node/Run/RunContext/NodeContext 不增加调度器字段或泛型。
- [x] 3.2 为 Graph<C, O, R> 实现任意父状态 P 下的 NodeInstance<P, R>，统一提取 GraphInput、派生身份、进入同一 Scheduler、交付原 Arc<O>；父 Delta 为默认值，无额外 Directive。
- [x] 3.3 实现普通 Node::with_resources，保留全部外围配置和输出声明；按次执行资源投影，保留身份/State/预算，资源投影错误归属当前节点且不启动子 Run。
- [x] 3.4 实现 Arc<N>、Weak<N>、OnceLock<N> 的通用 NodeInstance 转发，以及 UnboundInstance/DroppedInstance；构图不解析绑定，执行不阻塞等待，不增加专属类型、构造器、工厂或注册中心。

## 4. 调用方与公开示例迁移

- [x] 4.1 迁移 core 单测、crate 文档示例、CLI graph-check fixtures/report 中全部 NodeInstance 签名和根调用；保留六类 CLI 图、报告及退出行为。
- [x] 4.2 更新 tests/public_api.rs、tests/examples/nested.rs、tests/examples/recursive.rs 和 tests/graph 下编译样例，仅通过根公开 API 展示普通图 Node、异构资源、静态边、Deliver 和递归绑定；不在业务节点中保存 Scheduler 或手写 Scheduler::call。
- [x] 4.3 将原 RemoteTarget/FakeScheduler 调用测试迁移为普通 NodeInstance/业务边界测试，另建实际驱动 Execution 的小型测试 Scheduler；仅显式错误处理用例使用通用 NodeInstance 组合，不新增生产重试策略。

## 5. 行为与正交性验收

- [x] 5.1 用外部测试 Scheduler 改变任务准入与完成顺序，证明同一个 Graph 可替换真实后端、所有子层进入同一 driver、结算仍按固定 ready 顺序；同时验证 K 个名额、补位和普通失败不取消本波排队成员。
- [x] 5.2 用同一参数化组图路径覆盖三层/五层、K=1/K=2、静态边/Deliver 及本地/替代后端，检查每层普通 Run 的身份、深度、State、输入、NodeRun、实例集合独立和非 Clone 输出 Arc 身份。
- [x] 5.3 验证直接图节点接受来自 entry、静态前驱、Transition、Deliver 的 GraphInput；零份/多份、错误入口键、异步初始化错误在正确边界失败，不隐式转发其他输入。
- [x] 5.4 验证不同 State 和资源类型的 A→B→A 投影、投影错误、外围配置保留，以及普通非 Graph Node 同样适用资源投影。
- [x] 5.5 验证标准 Weak/OnceLock 组装的自递归、互递归、未绑定、目标失效、深度预算；保留诊断 Run 并释放宿主句柄后，图/资源/Scheduler 可释放，不存在内部强引用环。
- [x] 5.6 验证 driver 操作顺序错误、实际驱动失败、task panic、缺失输出和深层错误传播；所有已启动任务回收且记录终结，保留错误来源及顺序，不应用失败波次的路由。
- [x] 5.7 保留并迁移原有 State 归并、Sweep、模板聚合、Transition 重激活、非 Clone 输出、Send 非 Sync Delta 和显式失败处理/同层重试测试；图定义不在运行时重建。
- [x] 5.8 迁移观测测试，验证无初始化、过滤/背压、启动失败、深度拒绝、子初始化 panic、任务 panic、父 future drop 和资源释放，根子共用现有事件/级别/字段且只结算一次，不增加指标。

## 6. 完整验证与交付

- [x] 6.1 运行 `cargo fmt --all -- --check`、`SQLX_OFFLINE=true cargo check --workspace --all-targets --all-features --locked`、`SQLX_OFFLINE=true cargo clippy --workspace --all-targets --all-features --locked -- -D warnings`，不得通过放宽警告或业务类型约束绕过检查。
- [x] 6.2 运行无数据库 UT：`SQLX_OFFLINE=true cargo test --workspace --lib --bins --all-features --locked`；失败时修复实际原因，不把本次基线通过当作新实现的证据。
- [x] 6.3 单独运行公开 API/编译测试：`SQLX_OFFLINE=true cargo test -p cognacta-core --test public_api --test compile --all-features --locked`，以及 `SQLX_OFFLINE=true cargo test -p cognacta-core --doc --all-features --locked`；验证所有 bon 类型从根可达及新示例可编译。
- [x] 6.4 按现有 hook 完成空白、EOF、冲突标记与文件大小检查，严格校验本 change；本设计不需要新依赖，若实施中实际改变依赖，另运行 `cargo deny check --disable-fetch`。
- [x] 6.5 逐项核对 design 的验收表和差量规格场景，确认没有残留 call-only Scheduler、子图专属定义、具体调度器字段、重复状态机或未迁移调用方；报告实际验证范围和剩余限制。实施完成后再按用户授权处理正式规格与归档，本任务不预先修改它们。
