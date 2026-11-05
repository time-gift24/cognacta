# 设计依据

完整协议以 [EventLog 事实协议与递归恢复](../../../docs/design/event-log.md) 及 [公开接口、编码与错误契约](../../../docs/design/event-log-api.md) 为准。实现必须共享 apply；scheduler 只查询投影和安排执行，不维护第二套状态归并与控制语义。

与 prodagent 持续比较的关注点：append → apply 共用转换；节点结果提前保存与分阶段提交；子 Run 独立、Graph 可复用且递归无专用深度分支；节点 Outcome 与调度策略正交。每阶段用实际测试验证，不把同名事件视为相同语义。
