# axum 泛型 State 源码核对

核对日期：2026-10-17。版本：axum 0.8.9、axum-core 0.5.6。本文件记录源码事实与可讨论的借鉴点，不是 Scheduler 架构决定。

## State 与输入独立

axum 的 `State<S>` 是拥有 `S` 的包装类型。其提取器从框架传入的 `&OuterState` 调用 `InnerState::from_ref`，得到 `InnerState`；它不解析请求体。请求体可另外通过 `Json<I>` 反序列化，`I` 与状态类型独立。Handler 先执行 `FromRequestParts<S>` 提取器，再执行最后一个 `FromRequest<S>` 提取器，因此 `State<AppState>` 与 `Json<Input>` 可以同时作为参数，`Json` 放在最后。[State 源码](https://docs.rs/axum/0.8.9/src/axum/extract/state.rs.html#300-317)、[Json 源码](https://docs.rs/axum/0.8.9/src/axum/json.rs.html#99-114)、[Handler 源码](https://docs.rs/axum/0.8.9/src/axum/handler/mod.rs.html#221-260)

核心声明是：

```rust
pub struct State<S>(pub S);

pub trait FromRef<T> {
    fn from_ref(input: &T) -> Self;
}
```

`FromRef<T> for T where T: Clone` 的默认实现调用 `input.clone()`。自定义 `InnerState: FromRef<OuterState>` 可以只提取所需部分；返回的是 `Self` 值，不是自动借出父状态字段的引用。自定义转换不要求所有子状态都实现 `Clone`。[FromRef 源码](https://docs.rs/axum-core/0.5.6/src/axum_core/extract/from_ref.rs.html#13-25)、[官方子状态示例](https://docs.rs/axum/latest/axum/extract/struct.State.html#substates)

## 泛型不等于共享可变内存

`State<S>` 本身没有 `Arc` 或锁。克隆普通拥有型数据与克隆共享句柄有不同效果；是否共享底层数据由 `S` 决定。`DerefMut` 返回的是该包装值中 `S` 的可变引用，不是 Router 原始状态的可变引用。官方共享可变状态示例由应用自行选择 `Arc<Mutex<_>>`，框架不自动添加同步、更新合并或事务语义。[State 源码](https://docs.rs/axum/0.8.9/src/axum/extract/state.rs.html#256-331)、[官方共享可变状态说明](https://docs.rs/axum/latest/axum/extract/struct.State.html#shared-mutable-state)

## 注入发生在哪里

`Router<S>` 表示尚需提供 `S`；`with_state<S2>(self, state: S) -> Router<S2>` 绑定状态，通常得到可服务请求的 `Router<()>`。绑定和执行路径会克隆 `S`：`HandlerService::call` 将克隆值交给 Handler，提取阶段再从 `&S` 执行 `FromRef`。不要将 Router 内部的 `Arc<RouterInner<S>>` 误认为自动把业务状态变成了 `Arc<S>`。[Router 源码](https://docs.rs/axum/0.8.9/src/axum/routing/mod.rs.html#60-85)、[with_state 源码](https://docs.rs/axum/0.8.9/src/axum/routing/mod.rs.html#408-415)、[HandlerService 源码](https://docs.rs/axum/0.8.9/src/axum/handler/service.rs.html#148-177)

## 对最小 Scheduler 的借鉴建议

可以借鉴“框架泛型 `S` + 调用方提供具体状态”的方式，保持 `Input` 为独立的节点调用数据。泛型与类型安全并不要求引入 axum 依赖、HTTP 提取器、`Any`，也不要求立即复制 `FromRef` 子状态机制；后者适合确有节点只依赖部分状态的需求时再讨论。

需要单独决定 `S` 的作用域与更新规则。axum 的状态在 Router 的请求间使用；Scheduler 的业务状态是否每个 Run 独立、节点借用还是克隆、更新直接发生还是由 Scheduler 提交，都不能由 `State<S>` 这个泛型声明推出。上述建议尚未确定任何一种更新方案。

本地复核入口：[State](/Users/wanyaozhong/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/axum-0.8.9/src/extract/state.rs:300)、[FromRef](/Users/wanyaozhong/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/axum-core-0.5.6/src/extract/from_ref.rs:13)、[Handler](/Users/wanyaozhong/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/axum-0.8.9/src/handler/mod.rs:221)。
