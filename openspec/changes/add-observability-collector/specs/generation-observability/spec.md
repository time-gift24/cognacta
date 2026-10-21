# Spec Delta

## Purpose

统一观察一次 Generation 从开始执行到完成、失败或本地取消的全过程，提供可关联的诊断和可聚合的可靠性、延迟、用量数据，同时保持现有 Model、Protocol、事件流及错误契约，避免观测行为改变真实业务结果。

## ADDED Requirements

### Requirement: One logical generation is counted once

系统 SHALL 在模型调用开始实际执行时累计一次调用并增加进行中数量；创建但未执行的异步调用不计数。一次 Generation SHALL 恰有一个观测终态：成功、失败或取消；进入终态时进行中数量减少一次。HTTP 子阶段、单个流事件和重放的统计快照 SHALL 不增加 Generation 调用次数。

#### Scenario: One request emits many deltas

- **WHEN** 一次 Generation 发送一个 HTTP 请求并返回多个文本增量和一个 Completed
- **THEN** 调用次数增加一，成功终态增加一，进行中数量恢复原值，不按文本增量数量计数

#### Scenario: An unpolled future is discarded

- **WHEN** 调用方创建模型调用 future 后，在首次执行前将其丢弃
- **THEN** 不产生 Generation 调用、终态或耗时样本

### Requirement: Observation follows the whole streaming lifetime

流式调用 SHALL 在返回流对象后继续被观察，直到消费到 Completed、错误、异常结束或本地放弃。收到响应头或获得流对象 SHALL 不算成功。已观察到终态后丢弃流 SHALL 不再记录取消。观测 SHALL 不预先消费流、额外拉取内容、改变轮询节奏或等待物理连接关闭。

#### Scenario: A stream is obtained but not consumed

- **WHEN** 请求成功获得流，调用方尚未开始读取
- **THEN** Generation 仍为进行中，尚未增加成功次数

#### Scenario: Consumer drops a partially read stream

- **WHEN** 调用方读到部分文本后丢弃流，且尚未观察到成功或错误
- **THEN** 记录一个取消终态并结束计时，本地取消不被描述为上游已经停止生成或计费

#### Scenario: Consumer drops after completion

- **WHEN** 调用方收到 Completed 后立即丢弃流而未再次轮询
- **THEN** 仅保留一个成功终态，不增加取消次数

#### Scenario: Request future is cancelled before response headers

- **WHEN** 模型调用已经开始执行，但请求阶段 future 在返回流前被丢弃
- **THEN** 记录一个取消终态，进行中数量回到调用前状态

### Requirement: Failures preserve their classification

初始请求错误和流内错误 SHALL 均记录失败终态及 core 的错误分类，取消 SHALL 单独分类，不算失败。没有 Completed 或错误的提前流结束 SHALL 在观测上标为 truncated 失败；观测器 SHALL 不为此另造业务事件、吞掉原错误或修改其 source。正常 FinishReason SHALL 不被当作网络或协议失败。

#### Scenario: Failure before or during streaming

- **WHEN** 鉴权、限流、超时或协议错误出现在取得流之前或消费期间
- **THEN** 记录一次失败及对应分类，调用方仍收到原错误与已有部分结果，不因释放资源再计为取消

#### Scenario: Output limit is a normal finish

- **WHEN** 协议返回 FinishReason 为输出上限的合法 Completed
- **THEN** 记录成功终态，同时保留结束原因，不增加失败次数

### Requirement: Latency has explicit start and end points

系统 SHALL 使用单调时钟记录从首次执行到观测终态的总耗时，并在流式调用首次向消费者交付非空文本增量时记录首段文本耗时。空文本、开始事件和仅用量事件 SHALL 不产生首段文本样本；没有文本的调用 SHALL 不补零。时长包含调用方消费等待，不能标称为纯上游推理耗时。

#### Scenario: Control events precede the first text

- **WHEN** 流先交付开始、空文本和用量事件，稍后才交付非空文本
- **THEN** 首段文本耗时只在该非空文本交付时记录一次，总耗时继续累计到终态

#### Scenario: Generation ends without text

- **WHEN** 调用无文本完成、失败或被取消
- **THEN** 记录对应总耗时，不生成首段文本耗时样本

### Requirement: Usage records reported cumulative values without duplication

token 指标 SHALL 只记录上游报告的输入和输出 token 数，并在终态按每字段最新已知累计快照结算一次。成功时优先采用最终响应；失败时合并错误携带的已知部分用量；取消时仅使用此前已观察的用量。缺失 SHALL 保持未知，不补零、不根据文本估算；真实报告的零 SHALL 与未知可区分。

#### Scenario: Repeated usage snapshots

- **WHEN** 同一调用先后报告输出 token 为 5、10，并在 Completed 再次报告 10
- **THEN** 该调用只贡献 10 个输出 token，不贡献 25 个

#### Scenario: Missing usage and explicitly reported zero

- **WHEN** 一个调用没有输入 token 数据，另一个调用明确报告输入 token 为零
- **THEN** 前者不贡献 token 样本或用量报告次数，后者增加一次用量报告次数并保留零值

#### Scenario: A partial failure has usage

- **WHEN** 调用在输出部分文本后失败，错误的部分结果携带已报告用量
- **THEN** 该用量在失败终态结算一次，未报告字段仍未知，业务错误与部分文本保持原样

### Requirement: Logs and traces explain the same generation

系统 SHALL 为 Generation 提供关联的开始及终态日志、贯穿请求与流消费的链路，并记录实际存在的 HTTP 请求到响应头子阶段。日志和链路 SHALL 提供安全的 Provider 名称、Model 名称、Protocol、终态、错误分类和已获得的上游请求 ID。配置加载失败 SHALL 有安全诊断。系统 SHALL 不声称观测到上游内部推理过程。

#### Scenario: Correlate a failed generation

- **WHEN** 同一 Generation 在收到上游请求 ID 后遇到流错误
- **THEN** 远程日志与链路可以通过 trace/span 标识关联，终态记录带可用请求 ID 和错误分类

#### Scenario: Invalid provider configuration

- **WHEN** Provider 配置读取或解析失败
- **THEN** 记录安全的配置失败分类，不输出原始配置文本或凭据，也不制造未开始的 Generation 调用统计

### Requirement: Metrics use bounded dimensions

指标 SHALL 使用受控的 Provider、Model、Protocol、调用方式、终态、错误分类和 token 方向等有限维度。请求 ID、trace ID、响应 ID、提示词、回复、完整 URL 或任意错误文本 SHALL 不作为指标标签。实现 SHALL 对动态属性组合设置有限容量，超过容量时按约定溢出聚合或丢弃，不无限增长。

#### Scenario: Many unique request identifiers

- **WHEN** 同一模型连续返回不同的上游请求 ID
- **THEN** 指标序列不随请求 ID 数量增长，请求 ID 仅用于日志或链路关联

### Requirement: Sensitive generation content is excluded

本地日志、远程日志、链路和指标 SHALL 排除凭据、原始请求头、提示词、回复正文、原始协议报文和完整错误来源链。埋点 SHALL 显式选择安全字段，不通过默认参数 Debug 记录请求、配置、响应或包含部分文本的错误。

#### Scenario: Secret markers appear in inputs and output

- **WHEN** 测试凭据、提示词、回复和上游错误正文分别带有可识别的秘密标记
- **THEN** 四种遥测输出均不含这些标记，正常业务 stdout 仍按原契约显示回复文本

### Requirement: Telemetry does not change the generation contract

启用、禁用或丢失遥测 SHALL 不改变公开业务签名、模型选取、请求内容、事件顺序、错误分类、历史提交条件、stdout 或退出码。不支持的生成方式 SHALL 保持原来的 Unsupported 行为；本 change SHALL 不顺带增加协议、自动重试或额外请求。

#### Scenario: Compare enabled and disabled observation

- **WHEN** 同一手写模型响应分别在未初始化、本地模式、正常远程导出及导出失败状态下运行
- **THEN** 调用结果、流事件、业务 stdout 和退出码一致，只有遥测副作用不同
