# Tasks

## 1. 宏解析与展开

- [x] 1.1 在 cognacta-derive 实现 graph! 的 state/output/resources、Node/Edge/entry/init/return 解析和 quote 展开，重复节点及语法错误使用 syn::Error。
- [x] 1.2 实现 graph_input! 的普通值、shared、多值和空 Input 展开，拒绝重复入口，不引入 Arc 二次包装。
- [x] 1.3 从 cognacta-core 根导出两个宏，补充 rustdoc；不新增依赖或 call_graph 入口。

## 2. 行为与编译验收

- [x] 2.1 增加公开宏执行示例，覆盖父子异构 State、资源投影、静态边调度及普通 Node 链式配置。
- [x] 2.2 增加 GraphInput 行为测试，验证普通值、shared Arc 身份、多值、空输入和 Origin::Run。
- [x] 2.3 增加 trybuild 成功/失败夹具，覆盖根导出、完整展开和重复名称/非法语法诊断。

## 3. 回归验证

- [x] 3.1 运行 cargo fmt --check、workspace check、clippy -D warnings 和无数据库 UT。
- [x] 3.2 运行 core public_api/compile/doc 与 CLI 默认/all-features 验收；检查无新增非预期文件。
- [x] 3.3 对照设计确认宏只生成现有公开构造调用，没有改变 Graph/Scheduler/Run 语义。
