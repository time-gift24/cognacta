# Tasks

本清单用于后续 Rust 实施；本轮仅交付文档，未完成任何实现任务。行为依据为 [内核 delta](specs/graph-kernel-execution/spec.md) 与 [CLI delta](specs/graph-check-cli/spec.md)，公开签名和内部组织依据为 [design](design.md)。没有待决设计问题；interrupt/resume、外部 agent 实现、调用包装及全树并发控制继续排除在范围外。

业务 UT 放在源码测试模块，优先通过公开 LocalScheduler::run / Scheduler::call 驱动小型手写节点或 Scheduler fake。并发使用受控通知/屏障；不新增通用 mock 框架、私有执行状态访问口或观测回调。公开 API 与编译期夹具补充类型约束验收，不连接数据库或外部业务服务。

## 1. 输入、上下文与错误基础

- [x] 1.1 增加 GraphInput 的公开构造/entry 读取及 Input::new，保持私有内部存储；补充 UT 验证空 Input、MissingEntry、值顺序、Arc 共享和 Origin::Run 重建，确认既有 entry/one/many/all 的数量与来源行为不变。
- [x] 1.2 增加 RunContext<R = ()>、root/root_builder、只读 getter、child 与 with_resources；补充 UT 验证根/子/孙关联、完整父 NodeKey、max_depth=0、恰好到上限后拒绝、新子 ID，以及克隆和换资源均保留身份/预算且不要求 R: Clone。
- [x] 1.3 按 design 第7节扩展根 Error::Call、CallError 及 GraphError/InputError/RunError 必要变体，保留既有错误构造和安全 Display；用分类及 source 断言验证统一出口，不增加自动重试建议或无上下文转换。
- [x] 1.4 按实际用途在 core 通过 workspace 引入既有 uuid/tracing 等依赖，保留 core 与 Collector、SDK、CLI、数据库的边界；补齐本组类型、错误和 bon 生成入口的根导出及 rustdoc，使用外部公开 API 测试验证可达，依赖变更通过 cargo deny 检查。

## 2. 静态图、异构节点与初始化策略

- [x] 2.1 将 Node、NodeInstance、NodeContext 扩展为资源泛型，Outcome.value 改为 Option<Arc<O>>，调整内部输出擦除以直接共享 Arc<O>；补充非 Clone 输出的节点/Input UT，验证真实 TypeId、Arc 指向一致及不存在二次 Arc 包装。
- [x] 2.2 将 Graph 调整为 Graph<S, O, R = ()>，以必填 return_node 替代 Node.terminal，保留普通节点与 template 规则；补充构图 UT 验证未知/template/类型不符返回节点、有出边返回节点、自动及显式有入度 entries，并保留重复节点、目标、静态写冲突等原有校验。
- [x] 2.3 提供默认与自定义异步初始化的两个 bon 构造入口，统一构图校验并私有保存回调；验证构图零初始化调用，自定义路径接受无 Default、无 Clone 的 State，默认路径才要求 Default，State trait/derive 不增加初始化方法。
- [x] 2.4 更新本组根导出、builder 及 rustdoc 构图示例，扩展现有 trybuild 目标覆盖非 Clone 输出、非 Default 自定义 State 的成功路径，以及默认构造缺少 Default、异步回调/资源不满足必要 Send/Sync 的失败路径；保持既有 State derive 成功和诊断夹具通过。

## 3. 本地执行生命周期与类型化 Run

- [x] 3.1 按 design 第5.1节将现有具体 Scheduler 改名 LocalScheduler，并建立私有 scheduler 模块：local 管入口/配置，execution 中的 Execution 直接持有 Run 与跨 wave 数据，observation 承载随后接入的观测；随实际实现建立文件，不留空层。验证根类型及 bon run_builder 仍可达，调度算法未被拆成可替换步骤或复制运行快照。
- [x] 3.2 调整 LocalScheduler.run(graph, input, context)：入口键集合单次校验后执行本次初始化，成功才创建 Run/Execution；用公开执行 UT 验证缺失/多余键先于初始化报错、有效空输入由节点判断、异构多入口、初始化能读本次资源，以及启动失败直接 Err、初始化完成前零节点执行。
- [x] 3.3 将 Transition 许可、实例输入及 instance_order 等调度临时数据归入 Execution，保留 Run.instances 诊断索引；wave 数据就地保存并在归并前释放 State 快照。运行既有受控调度 UT，验证固定 wave 补位、ready/Sweep、稳定实例顺序、空扇出、Transition、Deliver、State 所有权及全部错误结算顺序不变。
- [x] 3.4 实现 Run<S, O> 的只读接口、身份记录与类型化最终结果，执行完毕移交同一 Run 并释放调度资源；用公开执行 UT 验证唯一返回、提前返回不提前结束、返回节点重激活、Skipped/None 导致 MissingOutput，以及 O=() 和业务 Option<T> 的合法返回。
- [x] 3.5 实现 Run.into_result 及私有执行错误聚合；通过运行失败测试验证 State/节点诊断仍在 Run 中、所有实际错误及 source 保留、已有执行错误不附加 MissingOutput，成功交付原 Arc，单独缺失返回映射为 CallError::MissingOutput。
- [x] 3.6 更新本地执行和 Run 的 rustdoc、根导出与现有公开 API 样例，删除旧 RunOutput 使用；验证 run 的 State 读取不变为 Option<S>、Run 不因内部保存 RunContext 延长资源生命，并以现有公开 API 测试覆盖正常/启动失败/执行失败三条路径。

## 4. Scheduler 调用、隔离与并发

- [x] 4.1 按 design 第5节实现 Scheduler<T, O, R = ()> 的 RPIT + Send 调用契约及 LocalScheduler 对本地 Graph 的实现；call 仅派生 child、复用同一 run、消费 into_result。用真实父子图验证返回 Arc 与五类调用错误，不引入 GraphCall/LocalGraphCall 或另一套生命周期。
- [x] 4.2 增加父子隔离与资源 UT：父子使用不同 State、同图重复/并发执行、显式换资源、仅选定值传入、父 Origin 不泄漏；通过各 Run 的 State、输入、身份和结果断言，不读取私有 Execution。
- [x] 4.3 增加普通静态节点及 template 实例调用子图的 UT，复用内部 NodeId/实例 key，验证不同 Run 无冲突、template fan-out/join 与普通实例完全一致；不增加节点对象重建或克隆策略。
- [x] 4.4 验证每 Run 独立并发名额：同一 LocalScheduler 且 K=1 的父等待子能完成，受控多子图各自不超过 K，父任务等待期间仍计入父名额；结合既有固定 wave 测试确认没有全树共享限额。
- [x] 4.5 以非 Graph 目标的小型 Scheduler fake 验证构造注入和仅依赖输入/结果的父节点；更新 trait rustdoc 和 design 第8.1节对应的公开 API 示例，确认无需本地 State/Run、dyn 异步 trait 或外部 agent 实现。

## 5. 父节点策略与递归组装

- [x] 5.1 增加父节点重试 UT，验证每次 call 新身份、新初始化/记录，同父关联与同深度，不从失败位置续跑；显式记录副作用次数，证明前次副作用未自动撤销且框架不自动重试。
- [x] 5.2 增加处理/传播错误 UT，验证父正常返回 Outcome 后 Completed 并正常结算 Delta/Directive，未处理错误向上传播；直接 DepthExceeded 与外层 Execution 的分类各自正确，父决策不依赖错误文本或子内部节点布局。
- [x] 5.3 将 design 第8.2节的自递归与 A/B 相互调用组装落为仅用根公开 API 的可执行验收示例：应用 OnceLock 固定槽位先分配、构图后填齐，节点运行时读取；断言 max_depth=2 时仅启动深度0/1/2，下一层零初始化且直接拒绝方得到 DepthExceeded(2, 2)，根传播结果为 Execution。
- [x] 5.4 为递归示例增加释放断言并补齐相关 rustdoc：图、节点及初始化闭包不永久捕获资源 Arc；执行及宿主持有句柄释放后 Weak 图引用不可升级，验证无需 core 注册中心、包装抽象或节点工厂。

## 6. Run 观测与 panic 边界

- [x] 6.1 在私有 observation 实现并由 run 管理生命周期：首次 poll、校验/初始化前开始，覆盖初始化与执行，结果返回前关闭；用受控初始化与 tracing 记录器验证 DEBUG 开始/完成、WARN 输入/初始化/执行失败、阶段/分类、总耗时包含初始化及只结算一次，call 不重复结算。
- [x] 6.2 增加身份字段与深度拒绝观测，限长并编码 ID/NodeKey，禁止业务内容与完整 source；用敏感测试标记验证安全字段、父子关联及超限无子开始事件，不增加指标、SDK 初始化或遥测端点读取。
- [x] 6.3 按 design 第9.1节覆盖未 poll、已开始正常 drop、正常成功与预期 Err 的矩阵；通过真实公开执行 future 和受控通知验证零事件或一次 DEBUG 本地 cancel，以及返回/消费/drop Run 后不重复结算，不新增停止状态或结果。
- [x] 6.4 增加根初始化 panic 的 caught-unwind 测试：在测试外层用 catch_unwind 包住独立 runtime 的 block_on，让 panic 穿过真实观测 guard；断言开始一次、零普通 cancel/完成/伪造失败、零节点执行，捕获后不恢复原 Run。
- [x] 6.5 增加普通节点 panic 与嵌套子初始化 panic 测试：验证既有任务边界保留 JoinError，普通节点所在 Run 恰好一次 WARN 失败；嵌套时按 run_id 区分子无伪造结算与父一次执行失败，清理无重复事件，不给产品增加通用 panic 捕获。
- [x] 6.6 更新观测 rustdoc 并复用既有 Collector/CLI 测试方式验证未初始化、过滤、导出失败及输出背压时结果/错误/执行次数不变；确认仍使用宿主有界后台输出及关闭预算，core 无 Collector/SDK 运行依赖，测试记录器不成为产品回调接口。

## 7. CLI dev 样例与报告适配

- [x] 7.1 将六类十六个现有变体迁移到 LocalScheduler、GraphInput、RunContext、显式唯一返回和 Arc Outcome，按样例需要使用 Default 或自定义初始化；运行 fixture UT，验证 chain/diamond/branch/fanout/transition/settlement 的原有 State、波数、节点状态和完整错误断言继续成立。
- [x] 7.2 按已知样例类型读取 final_output 并更新报告断言，删除旧 terminal/RunOutput 映射处理；验证 fanout 的0/1/3实例均返回 aggregate、transition 的提前返回仍等整图结束、不要求通用 Debug/Serialize，错误节点输出类型不得用期望值替代 actual。
- [x] 7.3 适配启动 Err 与 Failed Run 的报告及退出码，新增入口/初始化失败的测试注入；验证无 Run 时不伪造状态、该 case 失败不跳过独立 case、预期 Run 失败仍 PASS、all 仍为16个变体，以及报告 I/O 失败不重跑图。
- [x] 7.4 更新 CLI 使用文档/帮助涉及的新结果含义，保留默认关闭 dev、原场景参数及六类入口；运行默认与 dev 的 graph_check 测试确认帮助/参数错误退出2，正常汇总退出0，断言或启动错误退出1。
- [x] 7.5 复用 core Run 观测，避免 CLI 重复生命周期日志；执行 graph_check 与 telemetry 验收，验证无端点、不可用端点及 stderr 背压下 stdout/退出码一致，Collector 仍遵守原3秒关闭/最终诊断总预算。

## 8. 跨模块集成验证

- [x] 8.1 按仓库要求执行 `cargo fmt --all -- --check`、`SQLX_OFFLINE=true cargo check --workspace --all-targets --all-features --locked` 和 `SQLX_OFFLINE=true cargo clippy --workspace --all-targets --all-features --locked -- -D warnings`，修复本变更造成的问题；存在依赖变更时执行 `cargo deny check --disable-fetch`，全部通过方可完成。
- [x] 8.2 执行无数据库 UT：`SQLX_OFFLINE=true cargo test --workspace --lib --bins --all-features --locked`；另执行 `SQLX_OFFLINE=true cargo test -p cognacta-core --test public_api --test compile --all-features --locked`，验证跨模块行为、根 API 可达、builder 与类型约束，未以全量 all-targets 测试混入数据库目标。
- [x] 8.3 分别执行 `SQLX_OFFLINE=true cargo test -p cognacta-cli --test graph_check --test telemetry --locked` 与 `SQLX_OFFLINE=true cargo test -p cognacta-cli --test graph_check --test telemetry --all-features --locked`，确认默认/dev 入口、十六个样例、报告及宿主遥测行为一起通过。
- [x] 8.4 对照两个 delta specs 和 design 的公开 API 表、递归示例、panic 矩阵检查实现/测试覆盖，执行 `openspec validate add-subgraph-scheduler --strict --no-interactive` 及文档空白/文件结尾检查；确认没有误加 interrupt/resume、调用包装、全树名额、远程实现或项目规范修改后再标记本任务完成。
