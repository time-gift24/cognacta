## 1. Core 公共类型与错误边界

- [x] 1.1 在现有 workspace 增加实际使用的 cognacta-core；统一依赖到根 Cargo.toml，保留现有 CLI/Collector 行为，不恢复旧架构。
- [x] 1.2 实现 NodeId、NodeKey、Origin、SourceRef、Outcome、Directive 和公开状态类型，按 design 导出必要类型；验证结构化实例身份及无 CallId。
- [x] 1.3 用 thiserror 定义根 Error 与模块分类、RunError、真实 source 链及安全 Display；所有自有公开可失败 API 返回 core::Error，验证 Input→Node、业务错误→Run 的单向边界转换。
- [x] 1.4 实现统一 Input 及内部组装器，UT 覆盖 entry/one/many/all/origins、同类型不同来源、template 来源、重复边、false 边和 payload 替换；真实 Output 只存一份。
- [x] 1.5 实现 NodeInstance 与私有异构 adapter，验证不同 typed Output、不可 Clone Output 及 Send但非Sync Delta 可实际调用；只在内部擦除类型。

## 2. State 与 reducer

- [x] 2.1 定义 State/Reducer/StateField/WritePolicy，先用最小手写 State 验证签名、Error 与所有权要求。
- [x] 2.2 实现 Override、Append、Merge、Add、Sort，UT 覆盖顺序、同key覆盖、中间溢出、init/finish一次和无更新字段不执行reducer。
- [x] 2.3 增加必要 cognacta-derive crate，实现具名字段 State derive、Delta Default、Field元数据、属性/泛型与公开可达性；宏内部Error转换为定位诊断。
- [x] 2.4 实现 SingleWriter 全字段预检与 reduce/finish 暂存后统一回写，UT 覆盖 Some(None)、空增量、后字段失败、最后finish失败、失败兄弟伴随冲突、跨wave重复写入。
- [x] 2.5 增加独立编译通过/失败样例：缺失/重复reducer、Add类型错误、Sort比较器、生成字段歧义、Send/Sync约束；成功样例包含非Clone Override与非Sync Delta，并检查诊断对应字段。

## 3. Graph 构图与就绪规则

- [x] 3.1 实现 Node 配置、Graph::build 和 bon 构造入口；验证引用、entry、template角色、已声明目标与无合法入口，成功后不重复静态校验。
- [x] 3.2 实现写入元数据分析，验证纯同时entry/diamond冲突提前失败、顺序链允许、动态template冲突交给真实批次处理。
- [x] 3.3 实现只读全量ready、All/Any/Custom及open-predecessor闸门，表驱动UT覆盖Completed/Skipped、false边仍开放、done=0与孤立非entry。
- [x] 3.4 实现延迟Sweep及提交后重算，UT验证有ready不Sweep、D/E跨轮清理、Sweep不计wave。
- [x] 3.5 实现template前驱集合、按边计票与最后空扇出兜底，验证0/1/多实例及只收Completed且live的Output。

## 4. Run 与固定 wave 调度

- [x] 4.1 实现Run/NodeRun私有状态和只读接口、SchedulerConfig及bon入口；验证K=0拒绝、max_waves=0接受且不启动任务。
- [x] 4.2 用JoinSet实现固定ready Vec、最大K并发与补位；验证等待成员Pending、实际spawn递增attempts、失败后仍执行排队成员及补位只算一个wave。
- [x] 4.3 实现task id归属与State Arc生命周期；受控UT验证多个失败/一次panic全收集、正确NodeKey、正常可独占State及泄露时Invariant。
- [x] 4.4 实现barrier固定顺序：保存全部Output→成功Delta归并→全部Directive校验→有错零路由；验证节点失败不取消成功提交、归并失败不回滚Output、跨阶段五条错误稳定排序。
- [x] 4.5 实现Transition/Deliver整批校验及路由，验证目标角色、既有/本批重复key、合法项夹非法项、payload来源、rearm清理、一次性许可和同目标最后覆盖。
- [x] 4.6 实现Completed/Stalled/MaxWaves与RunOutput，验证恰好配额、未启动Pending保留、显式terminal/隐式sink、零/单/多Output映射与template排除。
- [x] 4.7 增加只依赖根公开API的tests/public_api.rs及调用文档样例，验证Graph复用隔离、构造/读取类型可达、无Collector即可执行；不要求CLI dev才能使用core。

## 5. 六类 CLI 图与真实断言

- [x] 5.1 在CLI私有graph_check模块实现chain/complete、chain/limit，核对输入来源、状态提交、terminal输出及3/2波边界。
- [x] 5.2 实现diamond/serial、diamond/parallel，用受控通知验证共同State快照、C先完成而B先归并，禁止sleep排序和逐wave观察器。
- [x] 5.3 实现branch/any、branch/all，核对D/E Skipped、零执行次数、3/2波及Completed/Stalled差异。
- [x] 5.4 实现fanout/empty、fanout/one、fanout/many，核对0/1/3实例、真实Origin、输入数量、顺序、总和、2/3波及聚合输出。
- [x] 5.5 实现transition/immediate、transition/wait，核对向前跳转、payload替换、T所见State及3/4波；不添加agent loop。
- [x] 5.6 实现settlement的node-error、merge-error、directive-error、single-writer、multi-error五变体，逐项核对State、成功Output、零路由、全部错误及aggregate未启动。
- [x] 5.7 为每变体使用独立Run/同步对象，收集实际结果和全部断言差异；验证故意改变期望会FAIL、错误种类不匹配不会误PASS、缺失/错误类型Output不会被期望值替代。

## 6. dev 入口、最终报告和进程契约

- [x] 6.1 增加默认关闭的CLI dev feature及可选core/Tokio依赖，clap提供graph-check六家族与all；验证default帮助无命令，dev帮助列全，缺失/非法场景退出2，原help/version/无参数行为不变。
- [x] 6.2 使用dev分支的current-thread Tokio runtime执行图，最终报告按固定顺序格式化已知合成类型、节点状态/次数、State、Output、waves、全部分类及断言；不引入通用序列化或轨迹接口。
- [x] 6.3 实现验收退出语义和all汇总：预期Run Failed也可PASS；16变体全过退出0，任何差异退出1；继续独立case，报告I/O失败退出1且不重跑。
- [x] 6.4 增加CLI进程级tests/graph_check.rs，验证单家族/all、参数、stdout/退出码、报告I/O错误及有界测试宿主等待；未开启dev时此测试目标可跳过其dev专属内容而不产生伪PASS报告。
- [x] 6.5 复用现有遥测测试设施，验证不可用端点、stderr背压与关闭预算下graph-check报告/退出码不变；不新增运行日志、span或指标。
- [x] 6.6 更新CLI README的dev命令、场景选择、报告含义和验证方式；保留当前Collector说明，不改关键项目规范或Prodagent资料。

## 7. 实施后的验证与交付

- [x] 7.1 运行cargo fmt、SQLX_OFFLINE=true的workspace check/clippy/无数据库UT（all-features、locked，clippy为-D warnings），修复问题而不放宽警告。
- [x] 7.2 单独运行core公开API目标、derive编译诊断目标及文档测试；记录实际命令和结果，不将CLI执行成功当成编译期契约验证。
- [x] 7.3 分别验证default与dev CLI；运行graph-check all及独立CLI进程测试、现有Collector/telemetry相关测试，核对16个实际case。
- [x] 7.4 依赖变更运行cargo deny check --disable-fetch；复核新增依赖用途、许可证及root lockfile，不增加数据库或网络业务测试依赖。
- [x] 7.5 检查OpenSpec规格、公开API、样例断言和实现一致；仅完成实际已验证任务后勾选，不复用旧change的勾选或测试记录。
