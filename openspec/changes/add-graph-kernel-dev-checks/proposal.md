## Why

Cognacta 已移除旧 core/provider 与 cluster-demo，目前缺少能够实际验证新图执行设计的 Rust 内核和 CLI 入口。需要把已讨论的 Prodagent Rust 语义落到 Cognacta，并用确定性小图检查输入来源、wave 结算、状态归并、路由和错误，而不只比较最终答案。

## What Changes

- 在 Cognacta workspace 新建 `cognacta-core`，实现 Graph、NodeInstance、Input、State、Outcome、Directive、Run 和 Scheduler；Prodagent 仅作为设计与行为参考，不另建第二套 Rust workspace。
- 新建必要的 `cognacta-derive`，提供强类型 State Delta、字段元数据、reducer 属性诊断和原子批量归并；core 的正式能力不由 `dev` feature 门控。
- 在 `cognacta-cli` 增加默认关闭的 Cargo feature `dev`，仅开启 `graph-check <SCENARIO>`、确定性样例及所需可选依赖。
- 提供 chain、diamond、branch、fanout、transition、settlement 六类图及 `all`；使用本地计算节点、固定输入和受控同步，无 agent loop、模型、网络业务服务或数据库。
- 只输出最终文本报告：实际节点状态与执行次数、wave 数、State、Output、错误分类和逐项断言；不增加逐 wave 观察接口。
- 区分 Run 结果和验收结果：预期的 Failed/Stalled 等行为满足全部断言时仍为 PASS，退出 0；断言或执行基础设施失败退出 1；参数错误退出 2。
- 复用现有 Collector 生命周期，本轮不新增日志、span 或指标；验收依靠显式结果和断言。

## Capabilities

### New Capabilities

- `graph-kernel-execution`: 身份、统一 Input、构图、ready/join/Sweep、固定 wave、有限并发、动态路由、错误汇总和 RunOutput。
- `typed-state-reducers`: State derive、强类型 Delta、字段写入声明、四种 reducer、Sort 与整批原子提交。
- `graph-check-cli`: dev feature、六类确定性图、最终报告、自动断言、退出码及现有遥测生命周期兼容。

### Modified Capabilities

无。已作废的 cluster-execution/cluster-demo-cli 不作为本变更的增量基线；现有 CLI 帮助、版本和 Collector 契约继续有效。

## Impact

- 后续实施涉及根 Cargo.toml/Cargo.lock、新 core/derive crate、CLI 私有 graph_check 模块和验收测试；本轮仅新增本 change 的规划文件。
- 运行时复用 workspace 的 Tokio、thiserror，构造入口按需使用 bon；derive 解析与生成使用 syn/quote/proc-macro2，版本由实施时根 workspace.dependencies 统一管理并通过 cargo deny。
- 公共可失败入口统一返回 `cognacta_core::Error`；Run 保留完整 `Vec<RunError>`，执行失败不压缩成单一 Result。具体签名及与 Prodagent 提案的适配见 design。
- 不修改 AGENTS.md、CONTEXT.md、Prodagent 资料、旧 change、前端或数据库；不增加通用图 DSL、序列化、EventLog、恢复、重试、超时或业务模型接入。
