## MODIFIED Requirements

### Requirement: 子调用身份可恢复

可复用 Graph SHALL 使用相同的 NodeInstance、投影与 Scheduler 协议，不按递归深度增加调度分支。子调用 SHALL 先由父 CallLinked 固定 `(NodeAttempt, key)`、child_run_id 和 JSON GraphInput，再启动独立子 Run。父子 State、实例和波次预算独立，CallLinked 不等于子调用已开始。

#### Scenario: 子完成而父结果未记录

- **WHEN** 父逻辑 attempt 恢复并再次调用相同 key
- **THEN** SHALL 返回已记录子结果，不新建子 Run；未完成子调用 SHALL 递归继续原 Run，空子历史 SHALL 使用原 child_run_id 启动。

#### Scenario: 可复用包装器显式重试

- **WHEN** 通用 Retry<N> 通过 with_call_key 分别以 try/1、try/2 调用 N
- **THEN** N 为 Graph 时 SHALL 形成不同的同深度子 Run，N 为叶节点时 SHALL 仍为普通节点调用；包装器不依赖具体 N 类型。相同 key 的已失败子调用 SHALL 返回稳定失败，不自动创建新 Run。

#### Scenario: Nested GraphInput uses ordinary Serde

- **WHEN** 相同 Graph 定义用于静态节点、Deliver 模板实例及递归调用，输入通过 JSON Output 或 payload 到达
- **THEN** SHALL 通过 Graph-as-Node 输入边界 Deserialize 为 GraphInput，沿用同一 CallLinked 协议，无递归类型注册器；父子输入按记录结构核对。

### Requirement: 每 Run 的持久事实文件

JsonlEventLog SHALL 每 run_id 使用一个 JSONL 文件，保持原事件与连续 seq；文件追加完成并 sync_data 后才确认成功。框架生成的运行身份 SHALL 使用 UUID v7。目录 SHALL 由单一活跃后端拥有，不自动修复损坏记录。

#### Scenario: 重新打开并继续

- **WHEN** 进程用相同 Graph／业务 schema／reducer 版本及无类型表的 History 重新打开日志目录并 resume 根 ID
- **THEN** SHALL 重放完整事件前缀，父子 Run 使用原身份和连续 seq 继续追加，不改写旧记录。

#### Scenario: 不完整尾行

- **WHEN** 文件末尾不是完整换行终止的事件
- **THEN** 读取及追加 SHALL 明确失败，不静默截断、覆盖或忽略旧字节。
