# 实施清单

以下为实施进度；正式规格和验证报告已按 format=2 实现同步。

- [x] 1. 将 SharedValue、Input、GraphInput 与 payload 改为 JSON；移除 Value／SourceRef／TypeId 数据查询，提供来源及顺序查询和 InputError::Decode。
- [x] 2. 将 EventData 的字节载荷改为 Serde 对象，公开 RecordedOutcome，协议升级 format=2；落实输出／payload 及 State derive 的缺省与 null 区别。
- [x] 3. 删除 ValueTypes、register、with_value_types、注册错误与 postcard／erased-serde 路径；迁移 History／replay，调整 workspace 依赖使用。
- [x] 4. 接入统一 JSON 事实准备 → append → apply；保留节点 Output 和 Graph／Run 泛型，最终 O 以已知 DeserializeOwned 在提交前恢复，不恢复中间业务类型。
- [x] 5. 迁移 Graph-as-Node 的 JSON GraphInput 入口及父子输入核对，验证原 call key／child ID／预算／失败和结果复用不变。
- [x] 6. 迁移节点、initializer、payload、graph_input!、CLI 示例和公开 API／编译契约；删除旧业务 Arc 指针身份断言，保留非 Clone 输出及仅 Send Delta 验证。
- [x] 7. 补齐 JSON 独立往返、缺省／null、同形 JSON／来源、schema 错误与静态最终 O 测试；复跑逐事件前缀、追加失败、跨 Run 前缀及 JSONL 重开恢复。
- [x] 8. 执行 fmt、workspace check／clippy、无数据库 UT、相关公开 API／compile／doc／CLI 测试及 cargo deny；更新正式规格和验证报告，确认实际实现后再标记完成。
