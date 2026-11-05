# 实施与验证

- [x] 明确事件载荷、波次边界、递归恢复、公开接口与错误契约。
- [x] 实现新事件协议、默认记录、类型绑定与 Input／Outcome 解码。
- [x] 为 State／Delta 增加反序列化能力并迁移 derive 与业务类型。
- [x] 实现共享投影：节点结果、StateDelta、Control、故障及终态。
- [x] 将实时执行接入唯一 append → apply 入口，保持替代 Scheduler 与现有波次语义。
- [x] 实现公开 replay／resume 与任意合法前缀继续执行。
- [x] 实现 CallLinked、稳定 call key、Graph-as-Node 与递归恢复；迁移旧 child 调用。
- [x] 新增 JsonlEventLog、每 Run 单文件与 UUID v7 身份。
- [x] 验证每个事件前缀、失败追加、递归中断、仅 Send Delta／非 Clone 输出及持久化恢复。
- [x] 完成全部调用方、规格、示例迁移及 workspace fmt／check／clippy／UT／deny 检查。
