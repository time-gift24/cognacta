# 自动记录执行事实

> 历史阶段设计，由 [EventLog 事实协议与递归恢复设计](../../../docs/design/event-log.md) 及其 [公开接口附录](../../../docs/design/event-log-api.md) 取代，修订日期为 2026-11-05。新文档已明确默认记录、节点结果提前保存、统一 append → apply、StateDelta／Control 和递归调用协议。下文保留可选记录阶段的交付依据；对应 proposal、specs 和 tasks 的完成状态不代表新设计已经实现。

## Context

依赖工作树已完成的 EventLog 基础模块；动机见 proposal.md。当前 Run 只在初始化成功后构造，Execution 的推进与结果回收是同步方法，SharedValue 是 Arc<dyn Any + Send + Sync>。用户已明确要求：保留 Any，同时让值满足 Serde。

## Goals / Non-Goals

**Goals:** 在统一运行路径中自动写入已有事件集合，完整保存输入、初始 State 和 Outcome；父子 Run 各自编号；记录失败阻止依赖它的业务推进。

**Non-Goals:** 不实现 resume、历史数据迁移、数据库、类型登记表、自定义 Codec、取消事件或新遥测。业务错误的既有波次归并规则继续适用。

## Decisions

### 1. 可序列化的 Any

core 根新增导出 Value，调整 SharedValue。标准 Serialize 含泛型方法，不能直接构成 dyn；用 erased-serde 保留标准 Serde 的对象安全调用能力。

```rust
pub trait Value: std::any::Any + erased_serde::Serialize + Send + Sync {
    fn type_name(&self) -> &'static str;
}

impl<T> Value for T
where
    T: std::any::Any + serde::Serialize + Send + Sync,
{ /* blanket 实现，返回 std::any::type_name::<T>() */ }

pub type SharedValue = std::sync::Arc<dyn Value>;

impl dyn Value {
    pub fn downcast_ref<T: std::any::Any>(&self) -> Option<&T>;
    pub fn downcast<T: std::any::Any + Send + Sync>(
        self: std::sync::Arc<Self>,
    ) -> Result<std::sync::Arc<T>, std::sync::Arc<Self>>;
}
```

dyn Value 实现标准 Serialize 和只展示类型名的 Debug。downcast 保留标准 Any 语义及同一 Arc 分配；这是类型检查结果，沿用 Option／Result<Arc<T>, Arc<Self>>，不包装为 core::Error。业务值不需要 Clone 或 Debug，不改为 JSON Value。

NodeInstance::Output 增加 serde::Serialize。State 增加 Serialize，State::Delta 与 Reducer::Delta 增加 Serialize，Delta 仍只要求 Send，不增加 Sync 或 Clone。这些是显式类型约束升级，调用方给 State／输出／payload 补 derive 或手写标准 Serialize。

State derive 自动为生成的 Delta 实现 Serialize，不增加新宏属性。泛型约束基于实际关联 Delta 字段，不能因泛型参数出现在 Reducer 路径中就无条件要求该参数 Serialize。原 State 的 Serialize 仍由用户实现。

相关公开 trait 的完整签名为：

```rust
pub trait State: serde::Serialize + Send + Sync + 'static {
    type Delta: serde::Serialize + Default + Send + 'static;
    type Field: Copy + Eq + std::hash::Hash + Send + Sync + 'static;
    fn fields() -> &'static [StateField<Self::Field>];
    fn merge_batch(&mut self, deltas: Vec<Self::Delta>) -> Result<(), Error>;
}

pub trait Reducer<T> {
    type Delta: serde::Serialize + Send + 'static;
    const POLICY: WritePolicy;
    fn reduce(&mut self, current: &T, delta: Self::Delta) -> Result<T, Error>;
    fn finish(self, value: T) -> Result<T, Error>;
}

pub trait NodeInstance<S: State, R: Send + Sync + 'static = ()>: Send + Sync + 'static {
    type Output: serde::Serialize + Send + Sync + 'static;
    fn run<'a>(
        &'a self,
        input: &'a Input,
        ctx: NodeContext<S, R>,
        scheduler: std::sync::Arc<dyn Scheduler>,
    ) -> impl std::future::Future<Output = Result<Outcome<S, Self::Output>, Error>> + Send + 'a;
}
```

原有 StateField、WritePolicy、Input、NodeContext、Outcome、Scheduler 均由 core 根导出；这些方法的构造／读取和错误分类沿用现有契约。

### 2. 序列化表示

业务 payload 使用 postcard 1.x（关闭默认特性，启用 use-std），直接调用 Serde；erased-serde 0.4.x 只解决 dyn Value 的对象安全。版本集中在 workspace.dependencies。postcard 的 Option 有独立标记，保留 None、Some(())、Some(None) 等区别，依据其[官方格式说明](https://postcard.jamesmunns.com/wire-format#17---option)。

Input／GraphInput 提供标准 Serialize。Input 按现有 ordered 保存来源、具体类型名及值，TypeId 仅用于内存索引，不写入字节。GraphInput 保存 entry 映射；其作为普通共享值时自然递归序列化。Outcome 的私有 Serde 表示包含 value 的存在性与类型名、原始 Delta、完整 Directive 和所有 payload。原始业务值先编码，再让归并消费 Delta。

格式表示必须保留节点输出 None 与 Some(())、Delta 不修改与显式 None、Transition 的 None payload／immediate=false、Deliver 实例 key 与 payload。不得用空字节、Debug 文本或已归并的最终 State 替代原始结果。此次只实现 Serialize，不承诺对任意类型擦除值自动 Deserialize；未来恢复的具体类型关联仍待设计。

### 3. 日志入口与序号所有权

沿用根导出的 EventLog、InMemoryEventLog、EventData、EventLogError、Error 和 RunContext，新增入口为：

```rust
impl<R: Send + Sync + 'static> RunContext<R> {
    pub fn with_event_log<L: EventLog + 'static>(
        self,
        log: std::sync::Arc<L>,
    ) -> Self;
}
```

该方法只配置记录能力，不开始写入、不分配 seq，保持 root／run／builder 的调用方式。with_resources 保留配置；child 继承同一日志，生成自己的 Run 身份和编号。未配置日志时不进行业务编码或追加，但 Serialize 是统一的业务类型约束。

每个逻辑 Run 在首次执行时创建私有记录状态，在初始化前便持有 last_seq=0，初始化后继续由同一执行内核持有。节点包装层共享本 Run 的串行写入能力；取号、构造 Event、await append、成功后推进 last_seq 属于同一临界区。日志不分配 seq。该状态是 Run 执行生命周期的一部分，不为提前编号创建缺少 State 的 Run，也不在返回的诊断 Run 中保留 Scheduler 或任务。

公共 EventLog 保留 RPIT 静态分派；接入既有类型擦除执行上下文时，仅私有追加适配使用 Send boxed future，不新增公共存储 trait。不同独立根运行互不影响；同一调用树的记录故障通过共享失败状态阻止后续准入、子调用和路由。业务内容不进入 Debug 或遥测诊断。

### 4. 异步 Execution 接口

```rust
pub trait Execution: Send {
    fn advance(&mut self)
        -> std::pin::Pin<Box<dyn std::future::Future<
            Output = Result<Option<Vec<NodeKey>>, Error>
        > + Send + '_>>;

    fn dispatch(&mut self, key: &NodeKey)
        -> Result<std::pin::Pin<Box<dyn std::future::Future<
            Output = Result<(), Error>
        > + Send + 'static>>, Error>;

    fn complete(&mut self, key: NodeKey, result: Result<(), Error>)
        -> std::pin::Pin<Box<dyn std::future::Future<
            Output = Result<(), Error>
        > + Send + '_>>;
}
```

Scheduler::drive 的对象安全签名、config 和共用 run 入口保持。所有后端 await advance／complete；dispatch 仍返回实际任务 future，开始事件在该 future 首次 poll 时写入。不同调度器和子 Run 共用同一记录路径，不能仅在 LocalScheduler 中加日志。

### 5. 写入边界

| 边界 | 事件与行为 |
| --- | --- |
| Run future 首次 poll | 编码入口输入后追加 RunStarted；成功后入口校验和初始化 |
| 初始化成功 | 编码 State，追加 RunInitialized 后才调度 |
| 启动业务错误 | 日志可用时追加 RunFailed，仍返回原 core::Error／CallError |
| 本波 ready 确定 | 内存固定成员及 wave 编号，无开始事件 |
| 节点有名额且 task 首次 poll | 捕获 ts，追加 NodeStarted；成功后资源投影及执行体 |
| 节点成功返回 | 立即采集结束 ts，编码完整 Outcome，追加 NodeCompleted，再交给结算 |
| 节点业务失败 | 采集结束 ts，追加 NodeFailed；仍继续固定 wave 的其他成员 |
| task panic／任务失败 | complete 在现有任务回收边界追加一次 NodeFailed，不新增 panic 恢复 |
| Sweep 确定跳过 | 先追加 NodeSkipped，再提交 Skipped 并重算 ready |
| 完整 wave 结算 | 原顺序归并与指令校验后追加 WaveSettled { wave }，成功后路由及下一波 |
| Run 结束 | 先追加 RunCompleted／RunFailed，再交付对应 Run |

NodeCompleted 的 ts 不包含结束序列化和追加耗时；开始记录必须成功后才运行节点，因此开始追加开销在开始／结束差值内。完整波次即使有业务节点、归并或指令错误仍可结算，其失败事实可由节点记录及确定性归并推导。标记不保存 State 或失败列表。

父节点的实际 attempt 随当前调用上下文传递；子 RunStarted 的 parent_node 记录该完整 NodeAttempt，with_resources 不丢失它。深度拒绝发生于子 Run 开始之前，不伪造子开始事实。

### 6. 失败与取消

序列化和追加错误分别映射为 core::Error::EventLog 的 Encode／Append，保留 source。所有自有可失败执行 API 继续返回 core::Error。外部 Serde 实现遵守 Serializer::Error，只有框架调用格式库的边界才做错误转换。已有业务失败继续返回 Failed Run；记录故障直接 Err，不装成业务节点失败或调度错误。

记录故障后，不新准入任务、不创建子 Run、不路由、不补写 RunFailed；收齐已开始的任务并释放引用。故障发生前已经开始的外部调用可能继续完成，不承诺撤销副作用或回滚远程系统。禁止自动重试记录或业务调用。标记追加失败后的内存候选结果不得作为已提交 Run 返回。

调度协议错误、driver 提前退出和 State 引用泄露保持原有诊断收尾，不伪造正常的完整 wave 提交标记；日志可用时记录 RunFailed。这些异常终态不支持 resume。当前改动不承诺从这些异常历史重建所有内部诊断对象。

未 poll 的调用无事件。Drop 取消保留已成功写入前缀，无需补写取消／暂停／终态；既有 tracing 取消观测不变。记录错误不能被初始化或子调用的 CallError 包装吞掉，默认父节点传播记录故障，停止该调用树。

### 7. 仅通过公开 API 的调用

```rust
use std::sync::Arc;
use cognacta_core::{Error, EventLog, Graph, GraphInput, InMemoryEventLog,
                   Run, RunContext, Scheduler, State};

async fn run_recorded<S, O, R>(
    scheduler: Arc<dyn Scheduler>,
    graph: &Graph<S, O, R>,
    input: GraphInput,
    resources: Arc<R>,
) -> Result<(Run<S, O>, Arc<InMemoryEventLog>), Error>
where
    S: State,
    O: serde::Serialize + Send + Sync + 'static,
    R: Send + Sync + 'static,
{
    let log = Arc::new(InMemoryEventLog::new());
    let context = RunContext::root("example-run".into(), 4, resources)
        .with_event_log(log.clone());
    let run = scheduler.run(graph, input, context).await?;
    let history = log.events("example-run", 0).await?;
    assert_eq!(history.first().unwrap().kind(), "run_started");
    Ok((run, log))
}
```

Node、Input、Directive 的构造方式保持；业务 struct 增加 `#[derive(serde::Serialize)]` 即可进入 SharedValue。调用方仍负责为不同逻辑 Run 提供不同根 ID。

## Risks / Trade-offs

- [公共 Serialize 约束升级] → 更新所有业务样例、泛型约束及编译诊断；验证非 Clone 输出与非 Sync Delta。
- [真实异步追加增加等待] → 执行闸门等待记录成功是业务存储契约，不使用后台丢弃队列或 tracing 代替。
- [postcard 依赖已知 schema] → 本次只写入，保留类型名；后续恢复需约定兼容 Graph 与具体业务类型，不宣称支持跨版本自动恢复。
- [失败／取消只能留下历史前缀] → 不伪造提交，不重试有副作用节点；明确仍未提供 resume。

## Migration Plan

先加入标准 Serde 值和 Delta 支持并更新样例，再接入 RunContext 记录能力与异步执行协议，最后验证成功、失败、取消及嵌套路径。无数据库迁移。已有调用需要补 Serialize，外部驱动增加两处 await；不配置日志的执行结果与归并规则保持。

本次不新增 tracing 日志、span 或指标，已有生命周期观测继续使用安全字段。原始输入、输出、State、payload 和错误 source 不写入遥测。
