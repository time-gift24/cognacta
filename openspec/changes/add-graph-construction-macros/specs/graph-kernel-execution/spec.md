# Graph Kernel Execution Delta

## MODIFIED Requirements

### Requirement: Kernel has a reachable public API independent of dev

cognacta-core SHALL 从根导出 graph! 与 graph_input! 构造宏。graph! SHALL 仅展开到现有 Graph builder，graph_input! SHALL 仅展开到现有 GraphInput/Input 构造；宏 SHALL 不接收 Scheduler、不调用 NodeInstance::run，也不增加子图调用或调度入口。

#### Scenario: Macros compose ordinary graph nodes

- **WHEN** 调用方用 graph! 声明普通前驱、Graph 子节点及其资源投影，并用静态边连接
- **THEN** 展开后的子节点仍是普通 Node::new，由既有 wave/dispatch 调度，父子 State、Run 和错误语义不变

#### Scenario: Node policies remain ordinary Rust configuration

- **WHEN** 节点在 `=>` 后配置 writes、template、join、declared_targets 或 with_resources
- **THEN** 宏将这些调用链附加到对应 Node::new，不另建配置类型或调度解释

#### Scenario: Input values are not wrapped twice

- **WHEN** graph_input! 使用普通业务值或 shared(existing_arc)
- **THEN** 普通值获得一层 Arc，已有 Arc 保持原分配；多值和空 Input 按现有 Input 契约执行

#### Scenario: Invalid macro declarations fail at compile time

- **WHEN** 宏含重复节点/入口或不符合声明语法
- **THEN** proc macro 产生带相关 span 的编译错误，不 panic、不生成部分运行定义
