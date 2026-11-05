# 统一事件投影、递归恢复与 JSONL 持久化

当前内核先修改 Run 再选择性记录，重放无法得到同一状态转换；提前保存的节点结果也不足以恢复未完成波次和子调用。把实时执行统一为 append → apply，以事件作为唯一事实源，保留节点结果提前落盘。

本变更实现完整事件协议、StateDelta／Control 投影、公开 replay／resume、稳定子调用 key 和默认内存记录；新增 JsonlEventLog，每 Run 一个文件，生成身份采用 UUID v7。保留 Graph-as-Node、普通节点接口和可替换 Scheduler，迁移所有受影响的调用方、测试与示例。

涉及 core、derive、CLI 示例和新增文件接入 crate。旧事件格式不自动迁移；State／Delta 增加反序列化要求，RunContext::child 迁移到 NodeContext::call。具体合同见 design.md。
