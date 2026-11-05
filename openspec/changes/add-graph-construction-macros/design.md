# 图构建宏接口与展开契约

## 1. 当前构造与宏边界

当前子图通过 `Node::new(id, child_graph)` 声明，前驱输出 GraphInput 后经普通静态边、Transition 或 Deliver 进入该节点。Graph 的 NodeInstance 实现再派生子 Run。宏只替换 Graph 和 GraphInput 的组装表达式，不包装 NodeInstance::run，不接收 Scheduler，不产生子图调用。

## 2. graph! 公开接口

```rust
let graph = graph! {
    state: ParentState,
    output: usize,
    resources: ParentResources,

    nodes {
        prepare: Prepare,
        child: child => .with_resources(|r: &ParentResources| Ok(r.child.clone())),
        report: Report => .writes(vec![ParentStateField::LastLength]),
    }

    edges {
        prepare -> child,
        child -> report when |state| state.last_length > 0,
    }

    entries [prepare],
    init: |input, context| async move { Ok(ParentState::default()) },

    return report;
}?;
```

- `state`、`output` 和 `nodes` 必填；`resources` 默认为 `()`。
- `edges` 省略为空；`entries` 省略展开为现有 `entries(vec![])`，即自动入口；`init` 省略使用默认初始化 builder。
- 节点左侧标识符成为 NodeId 文本；右侧是任意 NodeInstance 表达式。
- `=>` 后原样保留普通 Node 的链式配置，因此 writes、template、join、declared_targets、with_resources 不另建一套配置语义。
- 宏表达式返回 `Result<Graph<S, O, R>, cognacta_core::Error>`，由调用方显式处理；Graph 构造仍是唯一运行时图校验入口。
- 宏内重复节点名产生带 span 的编译错误；边、入口和返回引用展开为对应生成的 NodeId 变量，未知名称由 Rust 在宏展开处报错。

## 3. graph_input! 公开接口

```rust
let input = graph_input! {
    text: "hello".to_owned(),
    selected: shared(existing_arc),
    empty: [],
    many: [first_value, second_value],
};
```

- 普通表达式经 Arc::new 后 coerce 为 SharedValue。
- `shared(expr)` 不新增 Arc，直接将已有 Arc coerce 为 SharedValue，避免 Arc<Arc<T>>。
- `[]` 为空 Input； bracket 列表表示多个业务值。单个数组/Vec 业务值可用括号或 vec! 表达式避免与多值语法混淆。
- 返回 GraphInput，不返回 Result；重复入口名是编译错误。入口集合、类型和数量仍在现有 run/Input 边界校验一次。

## 4. 展开与错误契约

宏在 cognacta-derive 中使用 syn Parse、proc_macro2 TokenStream/Span 和 quote 实现。语法错误通过 syn::Error 转为 compile_error，不 panic。生成代码只引用 `::cognacta_core` 和 `::std` 的公开名称，兼容外部 crate 与 core 自身文档测试。

`graph!` 展开到 Graph::builder 或 builder_with_initializer；`graph_input!` 展开到 GraphInput::new(HashMap<NodeId, Input>)。不新增运行时类型、Error variant、日志、span、指标或依赖。现有 GraphError、InputError、CallError 和调度错误完全不变。

## 5. 验收

- trybuild 验证两个宏从 core 根可达、Node 链式配置可编译、重复节点/入口和非法语法有诊断。
- 公开执行测试用宏构造父子图，验证静态边调度和资源投影；Deliver template 仍使用普通 Node 配置。
- GraphInput 测试覆盖普通值、已有 Arc 的身份、多值、空输入和来源重建。
- 运行仓库格式、check、clippy、无数据库 UT、公开 API/compile/doc 和 CLI 回归。
