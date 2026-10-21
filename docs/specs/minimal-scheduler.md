# 最小 Scheduler：讨论记录与规格草稿

记录日期：2026-10-17。用户确认本次“先记录接口，测试边界待定”。本文整理已确认决定、适配原型和待确认草案，不是完整实施规格，也不表示已批准完整实现。Rust 产品代码中尚无本文描述的 Scheduler。

## Problem Statement

Cognacta 需要一个可复用的执行框架，把“执行节点、结算结果、安排下一次调用”与模型、工具等业务行为分开。一次 Generation 完成后仍可能执行工具并开始新的 Generation，因此 Generation 的 Completed 不能充当整个 Run 的结束条件。

节点需要同时使用共享业务 State 和本次调用的 Input。不同节点的 Input、路由 Payload 可以不同；框架必须保留节点内部的明确类型，又能把这些节点放进同一个 Plan 统一调用。状态修改还需要一个明确的结算位置，避免每个 body 自行改变调度中的共享业务状态。

## Solution

采用只支持 Outcome 路由的最小框架。业务作者实现带具体 Input、Payload 的 NodeBody，返回可选的 State Delta 和 Goto 或 Finish。Plan 注册节点；内部 ErasedNode 适配负责输入类型检查和载荷包装。Scheduler 调用节点，在成功执行后统一应用 Delta，再处理路由。

State 使用泛型 S，每种 S 通过关联类型 S::Delta 声明自己的增量类型。State 与 Input 分别表达共享数据与单次调用数据，不互相替代。Run 持有 State 和执行进度的具体结构目前是草案，仍需确认。

## User Stories

以下用户故事记录使用诉求，不把诉求自动视为已批准的接口设计；Run 的具体表示与测试入口仍分别标注为待确认。

1. 作为框架使用者，我希望 Scheduler 不识别模型与工具的业务含义，以便复用同一套调度逻辑。
2. 作为流程作者，我希望由 Outcome 的 Goto 和 Finish 决定后续行为，以便先用最小路由规则表达循环与结束。
3. 作为流程作者，我希望一次 Generation 完成后仍能安排工具节点，以便完整 Run 不被误判为结束。
4. 作为业务作者，我希望用具体的 S 定义共享状态，以便编译器检查状态字段与类型。
5. 作为业务作者，我希望通过 S::Delta 绑定增量类型，以便每种 State 有明确的修改语义。
6. 作为节点作者，我希望同时收到 Input 和只读 State 访问入口，以便区分单次输入与已有业务上下文。
7. 作为节点作者，我希望返回 Delta 描述修改意图，以便由 Scheduler 统一结算。
8. 作为业务作者，我希望自行定义 apply_delta 的应用规则，以便追加、替换等业务语义由业务类型决定。
9. 作为框架使用者，我希望 Delta 应用失败时 State 保持应用前的值，以便失败不会留下部分应用的增量。
10. 作为框架使用者，我希望 Delta 应用失败使 Run 失败且不再路由，以便下游不在错误状态下执行。
11. 作为框架使用者，我希望失败保留此前成功应用的 Delta，以便不隐含整次 Run 的回滚。
12. 作为节点作者，我希望用具体 Input 编写 body，以便无需在业务逻辑中手动 downcast。
13. 作为节点作者，我希望用具体 Payload 返回下一跳数据，以便返回载荷仍受编译期类型约束。
14. 作为流程作者，我希望不同 Input 和 Payload 的节点进入同一个 Plan，以便组合异构业务步骤。
15. 作为节点作者，我希望所有异步 trait 和实现统一使用 async_trait，以便接口与实现保持一致的写法。
16. 作为节点作者，我希望注册时自动获得 ErasedNode 适配，以便无需为每种 body 重复编写转换代码。
17. 作为流程作者，我希望重复 NodeId 注册返回错误且保留原节点，以便错误配置不会静默覆盖已有流程。
18. 作为流程作者，我希望未知节点与不匹配 Input 返回明确错误，以便在调用业务 body 前发现路由问题。
19. 作为框架维护者，我希望类型擦除只发生在 Plan 的内部调用边界，以便业务 State 与 Delta 始终保持具体类型。
20. 作为流程作者，我希望明确每种 body 只能声明一种 Payload 的初版限制，以便不误以为任意异构分支已获支持。
21. 作为框架使用者，我希望 Run 能表达待执行、执行中、完成与失败，以便识别一次执行当前处于何处；具体表示待确认。
22. 作为框架使用者，我希望待执行节点和它的 Input 一起移动，以便避免进度和载荷不一致；具体构造与读取入口待确认。
23. 作为测试作者，我希望通过注册 fake body 并驱动 Run 检查可观察行为，以便不依赖真实模型、工具服务或数据库；测试入口待确认。

## Implementation Decisions

**已确认的职责与类型边界**

- Scheduler 负责执行、结算和安排下一次调用，不依赖模型或工具业务语义。初版只处理 Outcome 路由，不增加条件边或 join。
- Node 组合 NodeId 与 body。业务逻辑由 NodeBody 承载；Plan 保存已注册节点，内部按 NodeId 查找异构 body。
- State 为泛型 S，关联类型为 S::Delta。State 和 Delta 分别具有 Send + Sync、Send 约束；无需默认要求 S: Clone。
- NodeContext 提供对 S 的共享借用。借用本身不能禁止内部可变性；业务实现仍须遵守“业务状态只能通过返回 Delta 更新”的契约。
- apply_delta 同步执行，只应用内存中的业务状态修改。成功时完整应用 Delta，失败时保留应用前状态。该原子性由 State 实现负责，框架不自动回滚任意用户类型。
- Outcome 包含可选 state_delta 和 control。没有增量时为 None；control 为携带目标与 Payload 的 Goto，或不携带载荷的 Finish。
- Scheduler 等待 body 返回、结束对 State 的借用，再应用 Delta；应用成功后处理 control。Delta 失败使 Run 失败，该 Outcome 不再路由。
- body 执行失败、未知节点、输入类型不匹配均通过错误传播；此前成功应用的 Delta 保留。类型不匹配必须在进入目标 body 前被拒绝，不通过 panic 处理。
- NodeBody<S: State> 自身要求 Send + Sync，为每种 body 声明 Input 和 Payload 关联类型，两者均为 Send；注册进 Plan 时另要求 body、Input、Payload 满足 'static。
- 同一个 Plan<S> 共享同一种 State 与 Delta 类型；不同 body 的 Input/Payload 可以不同。同一个 body 的不同 Goto 分支仍必须使用其唯一 Payload 类型。
- 全部异步 trait 及其实现，包括节点作者编写的实现，统一使用 async_trait。这是本次会话的明确选择，覆盖项目默认优先原生异步 trait 的偏好；同步 apply_delta 不因此变成异步。

**适配原型已表达的接口形状**

下列短签名摘自会话中的可运行适配原型，用于精确保存接口决定，不是完整库 API。Error 的最终所属 crate 和完整分类仍待确定。

| 类型或入口 | 原型中的形状与约束 | 状态 |
| --- | --- | --- |
| State | `type Delta: Send`；`fn apply_delta(&mut self, delta: Self::Delta) -> Result<(), Error>` | 语义已确认 |
| NodeContext | `NodeContext<'a, S>` 持有 `&'a S` | 已采用的只读访问草案 |
| NodeBody | `async fn run(&self, input: Self::Input, ctx: NodeContext<'_, S>) -> Result<Outcome<S::Delta, Self::Payload>, Error>` | 已确认，使用 async_trait |
| Outcome / Control | `Outcome<D, P>`；`Control<P>::Goto { target, input }` 与 `Finish` | 已确认 |
| 内部 Data | `Box<dyn Any + Send>` | 已确认，保留实际类型供检查 |
| 内部 ErasedNode | `async fn run_erased(&self, input: Data, ctx: NodeContext<'_, S>) -> Result<Outcome<S::Delta, Data>, Error>` | 已确认，使用 async_trait |
| Plan 注册 | `fn add<B>(&mut self, node: Node<B>) -> Result<(), Error>`；B 实现 NodeBody<S>，且 B、B::Input、B::Payload 满足 'static | 已确认的注册入口 |
| NodeId | 原型采用 String | 最终名称校验与公开构造未定 |
| Plan 构造 | 原型采用 Default | 最终公开构造与校验未定 |

- 通用的 ErasedNode 实现覆盖符合约束的 NodeBody：将 Data downcast 为 B::Input，调用具体 body，将 Goto 的 B::Payload 装箱为 Data；Delta 不做类型擦除。
- Plan 注册消费 Node，保存其 body 的动态接口。无需节点作者额外实现 ErasedNode，也无需为每个 body 编写单独 Adapter 类型。
- 注册阶段检查重复 ID；动态调用阶段检查目标存在与 Input 类型。async_trait 解决异步动态调用，不自动统一 Input/Payload，也不使基于 NodeId 的路由获得编译期匹配保证。
- 原型验证范围是异构节点注册、两次手工调用、Delta 在调用间应用，以及错误输入、重复 ID 和未知节点。它不包含完整 Scheduler 或 Run，不能作为完整运行时已经实现的证据。

**Run 结构草案，尚待确认**

- 建议 Run<S> 拥有业务 State 与私有 phase。phase 使用互斥变体：Ready 携带节点与 Input；Running 携带正在执行的节点；Completed 表示完成；Failed 记录失败位置。
- 在仅有 Goto/Finish 的初版中，建议每次 Run 最多保留一个待执行调用，不增加队列。Ready 中的 Input 开始执行时移动给 body，不保留副本；Goto 返回的新载荷成为下一次 Ready 的 Input。
- 建议详细 Error 由 Scheduler 返回，Run 的 Failed 只保存失败位置。此错误归属是上一轮提出的问题，用户尚未确认，不能据此锁定调用签名。
- Run 是否绑定某个 Plan、Plan 在 Run 执行期间能否改变、初始节点与 Input 如何注入，以及终态如何读取，尚未确定。

**库接口与错误契约的未完成部分**

- Scheduler 的落点尚未确定，不能把示意中的 Error 当成现有 core::Error 已经覆盖这些错误，也不据此新建 crate。
- 候选公共对象包括 State、NodeBody、NodeContext、Node、NodeId、Outcome、Control、Plan、Run、Scheduler 及所属 crate 的 Error；根导出清单尚未确认。Data、ErasedNode、内部调用入口应保持内部细节。
- 注册至少区分重复节点；调用至少区分未知节点、输入不匹配、body 执行失败与 Delta 应用失败。执行与应用错误应保留来源，跨边界时增加所属节点等上下文；最终 thiserror 结构、来源包装及错误公开读取方式待确认。
- 开始实现前须补齐 Run/Scheduler 完整公开签名、构造与校验、终态读取、可失败入口的 Error 归属，以及只使用公开 API 的完整调用示范。本文不以部分原型替代这些库设计要求。

## Testing Decisions

用户已明确选择“先记录接口，测试边界待定”。本次没有采纳测试入口，也不把建议测试列为验收条件。

已有可借鉴先例是 core 的 Protocol 测试：使用 EchoProtocol / Fake，通过 Model 调用入口观察响应、事件顺序与错误；统一 Error 的测试检查来源保留。未来可讨论“注册 Plan 后由 Scheduler 驱动 Run”的高层入口，检查外部可观察行为；对业务 State 的 Delta 原子性是否另设契约检查也待定。测试应避免绑定内部容器或装箱方式。

本次只检查规格内容、空白与文件结尾，不新增产品测试，不运行与文档变更无关的 Rust 或数据库测试。后续实现仍须遵循项目验证规范。

## Out of Scope

- Send、多实例并行、fan-in/join、条件边和静态边路由。
- 取消、暂停恢复、重试、超时、步数限制与持久化执行；这些运行语义另行设计，不隐含承诺。
- 自动事务回滚、回滚节点已发生的外部副作用、Delta 序列化和事件溯源。
- 编译期检查所有 Goto 目标与载荷的类型匹配；一个 body 直接发送多种互不相关 Payload。
- HTTP、CLI、数据库接入，以及模型和工具业务节点的具体实现。
- axum 的 State 提取器、FromRef 子状态投影、通用依赖注入容器。
- 本次记录不新增 Rust 运行代码、依赖、数据库迁移或遥测埋点。

## Further Notes

本次是接口讨论记录，不是完整实施规格。测试边界按用户决定留待后续讨论，不能根据本文自行扩展为已批准的验收清单。

本规格借鉴 prodagent 的职责划分，包含 Cognacta 本次讨论选定的 Rust 类型与失败策略；它不是 prodagent API 的逐项翻译。axum 调研只支持泛型状态注入的理解，不替我们决定 Run 的业务状态更新和生命周期。

本文中的 Run Completed 指整次框架执行结束，与领域术语中 Generation 的 Completed 分属不同层次。业务状态 State 与运行阶段 phase 也应保持区分。

后续需逐项确认：Run 结构与 Error 归属、公开 API 与 crate 归属、初始输入与 Plan 绑定、测试入口、以及关键日志/span/指标。项目要求遥测方案明确开始、完成、失败、取消边界，以及级别、字段、标签、单位和统计口径；目前仅产出规格和图，无新增业务执行路径，因此本次不增加埋点，也不默认批准未来跳过遥测设计。

发布到 issue tracker 的记录应保留“已确认／原型／待确认”标记，并按 to-spec 流程使用 ready-for-agent 标签。本文仍有待确认项，该标签不替代用户对剩余接口和实施范围的确认。
