# Spec Delta

## Purpose

为应用提供随进程生命周期管理的可观测运行能力，以标准协议输出日志、链路和指标，并将监控后端、网络故障及输出背压与业务执行隔离，使调用方可以独立选择是否初始化和接入哪种监控平台。

## ADDED Requirements

### Requirement: Explicit process lifecycle

系统 SHALL 仅在程序入口显式初始化时启用自己的可观测运行资源，并在业务结束后统一关闭。一次初始化 SHALL 服务多次业务调用，不要求每次记录创建或关闭采集器。公共初始化和关闭入口 SHALL 返回可分类且保留实际错误来源的本库错误；重复初始化 SHALL 明确失败，不替换已有全局配置。

#### Scenario: Many generations share one initialization

- **WHEN** 程序初始化一次后执行多次 Generation
- **THEN** 每次调用均使用同一套运行资源，业务函数无需接收采集器对象或执行初始化、关闭

#### Scenario: Initialization is attempted twice

- **WHEN** 已有全局订阅配置或本库已初始化，调用方再次初始化
- **THEN** 返回明确的初始化冲突错误，已有输出和业务继续工作，不启动第二套导出资源

### Requirement: No initialization has no collection side effects

在宿主没有另外安装订阅者或指标提供器的前提下，系统 SHALL 在未初始化时将埋点作为空操作，不输出日志、不保存待补发数据、不启动后台导出资源、不联网。引入库或调用业务 API SHALL 不隐式初始化可观测系统。系统 SHALL 不覆盖宿主自行安装的观测配置。

#### Scenario: Run the library without initialization

- **WHEN** 一个未安装任何观测实现的进程直接运行正常或失败的模型调用
- **THEN** 调用结果、错误和流事件仍按原契约返回，且没有遥测输出、外发请求或历史补发缓存

### Requirement: Local-only mode without remote configuration

初始化后，未明确配置任何遥测端点时，系统 SHALL 只保留后台 stderr 日志，不自动连接默认本机端点。至少一个有效端点被配置时，系统 SHALL 按通用配置和各信号覆盖配置启用对应远程输出。仅设置认证头或服务名 SHALL 不开启网络导出。

#### Scenario: No telemetry endpoint is supplied

- **WHEN** 初始化成功，但没有通用端点或任何信号专用端点
- **THEN** 日志输出到 stderr，不发生远程遥测请求，业务 stdout 保持原内容

### Requirement: Portable export of three signals

系统 SHALL 支持通过 OTLP/HTTP Protobuf 导出日志、链路和指标，同时保留本地日志。兼容平台 SHALL 能通过端点和认证配置接入；业务埋点 SHALL 不依赖具体存储或平台。使用独立采集服务 SHALL 是可选部署方式，本能力不要求额外部署进程。

#### Scenario: Export to a compatible receiver

- **WHEN** 配置有效的通用接收端点并完成一次有文本和用量的 Generation
- **THEN** 接收端分别收到日志、链路和指标，且本地 stderr 也能收到已启用级别的日志

#### Scenario: Switch a compatible backend

- **WHEN** 将接收端点和认证配置替换为另一兼容平台
- **THEN** 新平台收到同一语义的数据，无需修改业务埋点或领域接口

### Requirement: Recording does not wait for output I/O

业务侧记录接口 SHALL 为无需等待网络的同步调用，只执行字段处理、内存聚合或有界入队；网络发送和 stderr 写入 SHALL 在后台执行。输出队列满时 SHALL 允许丢弃而不等待容量；资源消耗 SHALL 有界，不通过无限内存缓存或无限重试维持投递。少量本地计算和同步开销不等同于零成本。

#### Scenario: Remote receiver stalls

- **WHEN** 监控接收端持续不返回响应，而模型服务正常生成文本
- **THEN** 模型文本仍可增量消费，业务调用不等待监控响应或队列空位

#### Scenario: Standard error is blocked

- **WHEN** stderr 管道不被读取，本地日志队列已经填满
- **THEN** 后续本地遥测日志允许丢弃，业务仍推进，不进行同步写 stderr 的兜底

### Requirement: Telemetry failure preserves business behavior

监控连接失败、超时、拒绝写入和队列丢弃 SHALL 不转化为模型错误、不触发模型请求重试、不改变业务结果或退出码。导出失败诊断 SHALL 安全、限频并只走本地后台输出，避免把导出器自身故障再次发送到同一远程日志管线形成循环。

#### Scenario: Receiver is unavailable

- **WHEN** 遥测端点无法连接，而模型服务正常返回完成结果
- **THEN** 业务仍成功，stderr 尽力给出安全诊断；允许丢失遥测数据，没有额外模型调用

### Requirement: Invalid telemetry configuration degrades explicitly

系统 SHALL 校验服务名、端点、协议、认证头和过滤配置。非法服务名或无法建立基本运行资源 SHALL 返回本库错误；无效远程配置 SHALL 禁用本次远程导出并保留本地模式和安全诊断，不悄悄切换协议或端点。非法日志过滤值 SHALL 明确诊断并使用约定默认级别。CLI SHALL 不将观测初始化失败变成业务失败。

#### Scenario: A remote protocol is unsupported

- **WHEN** 配置本版不支持的远程传输协议
- **THEN** 不向任何推断端点发送数据，保留本地日志并提示配置项无效，正常业务仍可执行

#### Scenario: Service name violates the construction contract

- **WHEN** 显式初始化传入空白或包含控制字符的服务名
- **THEN** 返回带配置项分类的错误，不把该名称注册为有效服务

### Requirement: Shutdown has one shared deadline

正常退出时系统 SHALL 在停止业务、结束活跃 span 后尝试发送剩余日志、链路和指标，并让所有导出器及本地 writer 共用调用方指定的总时间预算。提前完成 SHALL 提前返回；预算耗尽 SHALL 返回超时并允许丢弃，后续析构或线程等待不得重新延长预算。关闭 SHALL 不改变已得到的业务退出结果。

#### Scenario: Short process exits before periodic export

- **WHEN** 程序产生一次有效调用后，在周期导出前正常退出，接收端可用
- **THEN** 关闭阶段尝试导出剩余三类信号，已完成的数据不会只因未到定时周期而被忽略

#### Scenario: All outputs are stalled at shutdown

- **WHEN** 网络和本地 writer 都阻塞，调用方给出三秒总关闭预算
- **THEN** 关闭在该总预算附近的合理调度误差内返回，而非每路各等待三秒，不因随后析构再次阻塞

### Requirement: Metrics remain independent of log filtering and trace sampling

已启用的指标记录 SHALL 不因日志级别或链路采样而减少。系统 SHALL 在创建复用指标句柄前完成初始化；初始化前已取得的空句柄不承诺自动启用，也不补发过去的数据。运行中热切换提供器不属于本版契约。

#### Scenario: Suppress informational logs and sampled traces

- **WHEN** 日志级别设为 warn，链路采样关闭，并执行一次成功调用
- **THEN** 指标仍完整统计该调用，且不要求通过日志解析重建指标

### Requirement: Diagnostics do not expose credentials

观测配置与运行错误 SHALL 提供安全摘要，不输出认证头值、带凭据的地址、原始环境变量值或任意错误来源链。敏感输入 SHALL 在本地和远程输出中受到同样保护；可读取错误来源不代表默认可将其写入日志。

#### Scenario: Malformed credentials cause configuration failure

- **WHEN** 远程认证配置含用于测试的秘密标记且校验失败
- **THEN** 本地诊断和任何远程数据均不包含该标记，错误仍能指出失败的配置项类别
