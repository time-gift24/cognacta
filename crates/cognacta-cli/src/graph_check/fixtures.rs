use std::{
    any::Any,
    fmt::Debug,
    sync::{Arc, Mutex},
};

use cognacta_core::{
    Add, Append, Directive, Edge, Error, Graph, Input, Join, Node, NodeContext, NodeId,
    NodeInstance, NodeKey, Outcome, Override, Run, Scheduler, SchedulerConfig, SharedValue, State,
};
use tokio::sync::Notify;

use super::{Job, report::CaseReport};

fn key(name: &str) -> NodeKey {
    NodeKey::Static(NodeId::new(name))
}

fn keys<S: State>(run: &Run<S>, static_names: &[&str], templates: &[&str]) -> Vec<NodeKey> {
    static_names
        .iter()
        .map(|name| key(name))
        .chain(
            templates
                .iter()
                .flat_map(|template| run.instances(&NodeId::new(*template)).to_vec()),
        )
        .collect()
}

fn output<T: Any + Debug>(run: &Run<impl State>, node: &NodeKey) -> String {
    run.node(node)
        .and_then(|node| node.output())
        .and_then(|value| value.downcast_ref::<T>())
        .map_or_else(|| "type-mismatch".into(), |value| format!("{value:?}"))
}

fn final_output<T: Any + Debug>(run: &Run<impl State>, node: &str) -> String {
    run.final_output()
        .and_then(|output| output.values.get(&NodeId::new(node)))
        .and_then(|value| value.downcast_ref::<T>())
        .map_or_else(|| "type-mismatch".into(), |value| format!("{value:?}"))
}

fn status(run: &Run<impl State>, name: &str) -> String {
    run.node(&key(name)).map_or_else(
        || "missing".into(),
        |node| format!("{:?}", node.status()).to_lowercase(),
    )
}

fn attempts(run: &Run<impl State>, name: &str) -> String {
    run.node(&key(name))
        .map_or_else(|| "missing".into(), |node| node.attempts().to_string())
}

async fn execute<S: State>(
    case: &str,
    graph: &Graph<S>,
    concurrency: usize,
    waves: usize,
    state: S,
    entries: Vec<SharedValue>,
) -> Result<Run<S>, Error> {
    let scheduler = Scheduler::new(SchedulerConfig::new(concurrency, waves)?);
    Ok(scheduler.run(graph, case.into(), state, entries).await)
}

#[derive(State)]
struct ChainState {
    #[reducer(Override)]
    length: u32,
}

struct ChainA;
impl NodeInstance<ChainState> for ChainA {
    type Output = String;
    async fn run(
        &self,
        input: &Input,
        _ctx: NodeContext<ChainState>,
    ) -> Result<Outcome<ChainState, String>, Error> {
        Ok(Outcome {
            value: Some(input.entry::<String>()?.clone()),
            state_delta: ChainStateDelta::default(),
            directive: None,
        })
    }
}

struct ChainB;
impl NodeInstance<ChainState> for ChainB {
    type Output = u32;
    async fn run(
        &self,
        input: &Input,
        _ctx: NodeContext<ChainState>,
    ) -> Result<Outcome<ChainState, u32>, Error> {
        let length = input.one::<String>(&NodeId::new("A"))?.len() as u32;
        Ok(Outcome {
            value: Some(length),
            state_delta: ChainStateDelta {
                length: Some(length),
            },
            directive: None,
        })
    }
}

struct ChainC;
impl NodeInstance<ChainState> for ChainC {
    type Output = String;
    async fn run(
        &self,
        input: &Input,
        ctx: NodeContext<ChainState>,
    ) -> Result<Outcome<ChainState, String>, Error> {
        let length = input.one::<u32>(&NodeId::new("B"))?;
        if ctx.state.length != *length {
            return Err(Error::execution(std::io::Error::other(
                "state was not settled before the next wave",
            )));
        }
        Ok(Outcome {
            value: Some(format!("len={length}")),
            state_delta: ChainStateDelta::default(),
            directive: None,
        })
    }
}

pub(super) async fn chain(limited: bool) -> Result<CaseReport, Error> {
    let case = if limited {
        "chain/limit"
    } else {
        "chain/complete"
    };
    let graph = Graph::build(
        vec![
            Node::new(NodeId::new("A"), ChainA),
            Node::new(NodeId::new("B"), ChainB).writes(vec![ChainStateField::Length]),
            Node::new(NodeId::new("C"), ChainC).terminal(true),
        ],
        vec![
            Edge {
                source: NodeId::new("A"),
                target: NodeId::new("B"),
                when: None,
            },
            Edge {
                source: NodeId::new("B"),
                target: NodeId::new("C"),
                when: None,
            },
        ],
        vec![NodeId::new("A")],
    )?;
    let run = execute(
        case,
        &graph,
        1,
        if limited { 2 } else { 3 },
        ChainState { length: 0 },
        vec![Arc::new(String::from("hello")) as SharedValue],
    )
    .await?;
    let mut report = CaseReport::capture(
        case,
        &run,
        keys(&run, &["A", "B", "C"], &[]),
        vec![("length".into(), run.state().length.to_string())],
    );
    report.check(
        "run-status",
        if limited { "failed" } else { "completed" },
        format!("{:?}", run.status()).to_lowercase(),
    );
    report.check(
        "waves",
        if limited { "2" } else { "3" },
        run.waves().to_string(),
    );
    report.check("state-length", "5", run.state().length.to_string());
    for name in ["A", "B", "C"] {
        let expected = if limited && name == "C" {
            "pending"
        } else {
            "completed"
        };
        report.check(format!("{name}-status"), expected, status(&run, name));
        report.check(
            format!("{name}-attempts"),
            if limited && name == "C" { "0" } else { "1" },
            attempts(&run, name),
        );
    }
    report.check(
        "A-entry-origin",
        "Run",
        format!(
            "{:?}",
            run.node(&key("A"))
                .unwrap()
                .input()
                .unwrap()
                .entry_origins()[0]
                .origin
        ),
    );
    report.check("B-output", "5", output::<u32>(&run, &key("B")));
    report.check(
        "C-output",
        if limited { "none" } else { "\"len=5\"" },
        run.node(&key("C"))
            .and_then(|node| node.output())
            .map_or_else(|| "none".into(), |_| output::<String>(&run, &key("C"))),
    );
    report.check(
        "final-C",
        if limited { "none" } else { "\"len=5\"" },
        if run.final_output().is_none() {
            "none".into()
        } else {
            final_output::<String>(&run, "C")
        },
    );
    report.check(
        "errors",
        if limited { "[\"MaxWaves\"]" } else { "[]" },
        format!(
            "{:?}",
            run.errors()
                .iter()
                .map(|error| match error {
                    cognacta_core::RunError::MaxWaves => "MaxWaves",
                    _ => "other",
                })
                .collect::<Vec<_>>()
        ),
    );
    Ok(report)
}

#[derive(State)]
struct DiamondState {
    #[reducer(Add)]
    count: u32,
    #[reducer(Append)]
    labels: Vec<String>,
}

struct DiamondA;
impl NodeInstance<DiamondState> for DiamondA {
    type Output = String;
    async fn run(
        &self,
        _input: &Input,
        _ctx: NodeContext<DiamondState>,
    ) -> Result<Outcome<DiamondState, String>, Error> {
        Ok(Outcome {
            value: Some("A".into()),
            state_delta: DiamondStateDelta {
                count: Some(10),
                labels: Some(vec!["A".into()]),
            },
            directive: None,
        })
    }
}

struct DiamondBranch {
    name: &'static str,
    release: Option<Arc<Notify>>,
    completed: Arc<Mutex<Vec<&'static str>>>,
}
impl NodeInstance<DiamondState> for DiamondBranch {
    type Output = u32;
    async fn run(
        &self,
        _input: &Input,
        ctx: NodeContext<DiamondState>,
    ) -> Result<Outcome<DiamondState, u32>, Error> {
        if self.name == "B"
            && let Some(release) = &self.release
        {
            release.notified().await;
        }
        let seen = ctx.state.count;
        if self.name == "C"
            && let Some(release) = &self.release
        {
            release.notify_one();
        }
        self.completed.lock().unwrap().push(self.name);
        Ok(Outcome {
            value: Some(seen),
            state_delta: DiamondStateDelta {
                count: Some(1),
                labels: Some(vec![self.name.into()]),
            },
            directive: None,
        })
    }
}

struct DiamondD;
impl NodeInstance<DiamondState> for DiamondD {
    type Output = String;
    async fn run(
        &self,
        input: &Input,
        ctx: NodeContext<DiamondState>,
    ) -> Result<Outcome<DiamondState, String>, Error> {
        let b = input.one::<u32>(&NodeId::new("B"))?;
        let c = input.one::<u32>(&NodeId::new("C"))?;
        Ok(Outcome {
            value: Some(format!("B={b},C={c},count={}", ctx.state.count)),
            state_delta: DiamondStateDelta::default(),
            directive: None,
        })
    }
}

pub(super) async fn diamond(parallel: bool) -> Result<CaseReport, Error> {
    let case = if parallel {
        "diamond/parallel"
    } else {
        "diamond/serial"
    };
    let release = Arc::new(Notify::new());
    let completed = Arc::new(Mutex::new(Vec::new()));
    let graph = Graph::build(
        vec![
            Node::new(NodeId::new("A"), DiamondA)
                .writes(vec![DiamondStateField::Count, DiamondStateField::Labels]),
            Node::new(
                NodeId::new("B"),
                DiamondBranch {
                    name: "B",
                    release: parallel.then(|| release.clone()),
                    completed: completed.clone(),
                },
            )
            .writes(vec![DiamondStateField::Count, DiamondStateField::Labels]),
            Node::new(
                NodeId::new("C"),
                DiamondBranch {
                    name: "C",
                    release: parallel.then(|| release.clone()),
                    completed: completed.clone(),
                },
            )
            .writes(vec![DiamondStateField::Count, DiamondStateField::Labels]),
            Node::new(NodeId::new("D"), DiamondD)
                .join(Join::All)
                .terminal(true),
        ],
        vec![
            Edge {
                source: NodeId::new("A"),
                target: NodeId::new("B"),
                when: None,
            },
            Edge {
                source: NodeId::new("A"),
                target: NodeId::new("C"),
                when: None,
            },
            Edge {
                source: NodeId::new("B"),
                target: NodeId::new("D"),
                when: None,
            },
            Edge {
                source: NodeId::new("C"),
                target: NodeId::new("D"),
                when: None,
            },
        ],
        vec![NodeId::new("A")],
    )?;
    let run = execute(
        case,
        &graph,
        if parallel { 2 } else { 1 },
        3,
        DiamondState {
            count: 0,
            labels: vec![],
        },
        vec![],
    )
    .await?;
    let mut report = CaseReport::capture(
        case,
        &run,
        keys(&run, &["A", "B", "C", "D"], &[]),
        vec![
            ("count".into(), run.state().count.to_string()),
            ("labels".into(), format!("{:?}", run.state().labels)),
        ],
    );
    report.check(
        "run-status",
        "completed",
        format!("{:?}", run.status()).to_lowercase(),
    );
    report.check("waves", "3", run.waves().to_string());
    report.check("count", "12", run.state().count.to_string());
    report.check(
        "labels",
        "[\"A\", \"B\", \"C\"]",
        format!("{:?}", run.state().labels),
    );
    report.check("B-seen", "10", output::<u32>(&run, &key("B")));
    report.check("C-seen", "10", output::<u32>(&run, &key("C")));
    report.check(
        "D-output",
        "\"B=10,C=10,count=12\"",
        output::<String>(&run, &key("D")),
    );
    let input = run.node(&key("D")).unwrap().input().unwrap();
    report.check(
        "D-B-origin",
        "Node(Static(NodeId(\"B\")))",
        format!("{:?}", input.origins(&NodeId::new("B"))[0].origin),
    );
    report.check(
        "D-C-origin",
        "Node(Static(NodeId(\"C\")))",
        format!("{:?}", input.origins(&NodeId::new("C"))[0].origin),
    );
    if parallel {
        report.check(
            "completion-order",
            "[\"C\", \"B\"]",
            format!("{:?}", completed.lock().unwrap()),
        );
    }
    Ok(report)
}

#[derive(State)]
struct EmptyState {}

struct Text(&'static str);
impl NodeInstance<EmptyState> for Text {
    type Output = String;
    async fn run(
        &self,
        _input: &Input,
        _ctx: NodeContext<EmptyState>,
    ) -> Result<Outcome<EmptyState, String>, Error> {
        Ok(Outcome {
            value: Some(self.0.into()),
            state_delta: EmptyStateDelta::default(),
            directive: None,
        })
    }
}

pub(super) async fn branch(any: bool) -> Result<CaseReport, Error> {
    let case = if any { "branch/any" } else { "branch/all" };
    let graph = Graph::build(
        vec![
            Node::new(NodeId::new("A"), Text("A")),
            Node::new(NodeId::new("B"), Text("B")),
            Node::new(NodeId::new("C"), Text("C"))
                .join(if any { Join::Any } else { Join::All })
                .terminal(true),
            Node::new(NodeId::new("D"), Text("D")),
            Node::new(NodeId::new("E"), Text("E")),
        ],
        vec![
            Edge {
                source: NodeId::new("A"),
                target: NodeId::new("B"),
                when: None,
            },
            Edge {
                source: NodeId::new("B"),
                target: NodeId::new("C"),
                when: None,
            },
            Edge {
                source: NodeId::new("A"),
                target: NodeId::new("D"),
                when: Some(Arc::new(|_: &EmptyState| false)),
            },
            Edge {
                source: NodeId::new("D"),
                target: NodeId::new("E"),
                when: None,
            },
            Edge {
                source: NodeId::new("E"),
                target: NodeId::new("C"),
                when: None,
            },
        ],
        vec![NodeId::new("A")],
    )?;
    let run = execute(case, &graph, 1, 3, EmptyState {}, vec![]).await?;
    let mut report = CaseReport::capture(
        case,
        &run,
        keys(&run, &["A", "B", "C", "D", "E"], &[]),
        vec![],
    );
    report.check(
        "run-status",
        if any { "completed" } else { "failed" },
        format!("{:?}", run.status()).to_lowercase(),
    );
    report.check(
        "waves",
        if any { "3" } else { "2" },
        run.waves().to_string(),
    );
    for name in ["D", "E"] {
        report.check(format!("{name}-status"), "skipped", status(&run, name));
        report.check(format!("{name}-attempts"), "0", attempts(&run, name));
    }
    report.check(
        "C-status",
        if any { "completed" } else { "pending" },
        status(&run, "C"),
    );
    report.check(
        "C-attempts",
        if any { "1" } else { "0" },
        attempts(&run, "C"),
    );
    report.check(
        "error-count",
        if any { "0" } else { "1" },
        run.errors().len().to_string(),
    );
    if !any {
        report.check(
            "error-kind",
            "Stalled",
            super::report::run_error(&run.errors()[0]),
        );
        report.check(
            "final-output",
            "none",
            if run.final_output().is_none() {
                "none"
            } else {
                "some"
            },
        );
    }
    Ok(report)
}

#[derive(State)]
struct FanoutState {
    #[reducer(Add)]
    total: u32,
    #[reducer(Append)]
    items: Vec<Job>,
}

struct Planner(usize);
impl NodeInstance<FanoutState> for Planner {
    type Output = String;
    async fn run(
        &self,
        _input: &Input,
        _ctx: NodeContext<FanoutState>,
    ) -> Result<Outcome<FanoutState, String>, Error> {
        let targets = (1..=self.0)
            .map(|job| cognacta_core::DeliverTarget {
                template: NodeId::new("worker"),
                payload: Arc::new(Job(job as u32)) as SharedValue,
                key: format!("w{job}"),
            })
            .collect();
        Ok(Outcome {
            value: Some("plan".into()),
            state_delta: FanoutStateDelta::default(),
            directive: Some(Directive::Deliver(targets)),
        })
    }
}

struct FanoutWorker;
impl NodeInstance<FanoutState> for FanoutWorker {
    type Output = Job;
    async fn run(
        &self,
        input: &Input,
        _ctx: NodeContext<FanoutState>,
    ) -> Result<Outcome<FanoutState, Job>, Error> {
        let job = *input.one::<Job>(&NodeId::new("planner"))?;
        Ok(Outcome {
            value: Some(job),
            state_delta: FanoutStateDelta {
                total: Some(job.0),
                items: Some(vec![job]),
            },
            directive: None,
        })
    }
}

struct Aggregate;
impl NodeInstance<FanoutState> for Aggregate {
    type Output = String;
    async fn run(
        &self,
        input: &Input,
        _ctx: NodeContext<FanoutState>,
    ) -> Result<Outcome<FanoutState, String>, Error> {
        let jobs = input.many::<Job>(&NodeId::new("worker"))?;
        Ok(Outcome {
            value: Some(format!("jobs={jobs:?}")),
            state_delta: FanoutStateDelta::default(),
            directive: None,
        })
    }
}

pub(super) async fn fanout(count: usize) -> Result<CaseReport, Error> {
    let variant = match count {
        0 => "empty",
        1 => "one",
        _ => "many",
    };
    let case = format!("fanout/{variant}");
    let graph = Graph::build(
        vec![
            Node::new(NodeId::new("planner"), Planner(count)).declared_targets(vec![
                cognacta_core::DirectiveTarget::Deliver(NodeId::new("worker")),
            ]),
            Node::new(NodeId::new("worker"), FanoutWorker)
                .template(true)
                .writes(vec![FanoutStateField::Total, FanoutStateField::Items]),
            Node::new(NodeId::new("aggregate"), Aggregate)
                .join(Join::All)
                .terminal(true),
        ],
        vec![Edge {
            source: NodeId::new("worker"),
            target: NodeId::new("aggregate"),
            when: None,
        }],
        vec![NodeId::new("planner")],
    )?;
    let run = execute(
        &case,
        &graph,
        2,
        3,
        FanoutState {
            total: 0,
            items: vec![],
        },
        vec![],
    )
    .await?;
    let instances = run.instances(&NodeId::new("worker"));
    let aggregate_input = run.node(&key("aggregate")).unwrap().input().unwrap();
    let jobs = aggregate_input
        .many::<Job>(&NodeId::new("worker"))
        .unwrap()
        .into_iter()
        .map(|job| job.0)
        .collect::<Vec<_>>();
    let expected_jobs = (1..=count as u32).collect::<Vec<_>>();
    let expected_waves = if count == 0 { 2 } else { 3 };
    let expected_total = count as u32 * (count as u32 + 1) / 2;
    let mut report = CaseReport::capture(
        &case,
        &run,
        keys(&run, &["planner", "aggregate"], &["worker"]),
        vec![
            ("total".into(), run.state().total.to_string()),
            ("items".into(), format!("{:?}", run.state().items)),
        ],
    );
    report.check(
        "run-status",
        "completed",
        format!("{:?}", run.status()).to_lowercase(),
    );
    report.check("waves", expected_waves.to_string(), run.waves().to_string());
    report.check("instances", count.to_string(), instances.len().to_string());
    report.check(
        "aggregate-jobs",
        format!("{expected_jobs:?}"),
        format!("{jobs:?}"),
    );
    report.check(
        "total",
        expected_total.to_string(),
        run.state().total.to_string(),
    );
    report.check(
        "items",
        format!("{expected_jobs:?}"),
        format!(
            "{:?}",
            run.state()
                .items
                .iter()
                .map(|job| job.0)
                .collect::<Vec<_>>()
        ),
    );
    report.check(
        "instance-origins",
        count.to_string(),
        aggregate_input
            .origins(&NodeId::new("worker"))
            .len()
            .to_string(),
    );
    if count > 1 {
        let error = aggregate_input
            .one::<Job>(&NodeId::new("worker"))
            .unwrap_err();
        let actual = match error {
            Error::Input(cognacta_core::InputError::Cardinality { actual, .. }) => {
                actual.to_string()
            }
            _ => "wrong-error".into(),
        };
        report.check("one-cardinality", count.to_string(), actual);
    }
    report.check(
        "final-nodes",
        "1",
        run.final_output()
            .map_or(0, |output| output.values.len())
            .to_string(),
    );
    report.check(
        "final-aggregate",
        format!(
            "\"jobs={:?}\"",
            expected_jobs
                .iter()
                .map(|job| Job(*job))
                .collect::<Vec<_>>()
        ),
        final_output::<String>(&run, "aggregate"),
    );
    Ok(report)
}

#[derive(State)]
struct TransitionState {
    #[reducer(Add)]
    count: u32,
}

struct TransitionA(bool);
impl NodeInstance<TransitionState> for TransitionA {
    type Output = String;
    async fn run(
        &self,
        _input: &Input,
        _ctx: NodeContext<TransitionState>,
    ) -> Result<Outcome<TransitionState, String>, Error> {
        Ok(Outcome {
            value: Some("A".into()),
            state_delta: TransitionStateDelta::default(),
            directive: Some(Directive::Transition {
                target: NodeId::new("T"),
                payload: Some(Arc::new(7_u32) as SharedValue),
                immediate: self.0,
            }),
        })
    }
}

struct CountNode;
impl NodeInstance<TransitionState> for CountNode {
    type Output = u32;
    async fn run(
        &self,
        _input: &Input,
        ctx: NodeContext<TransitionState>,
    ) -> Result<Outcome<TransitionState, u32>, Error> {
        let next = ctx.state.count + 1;
        Ok(Outcome {
            value: Some(next),
            state_delta: TransitionStateDelta { count: Some(1) },
            directive: None,
        })
    }
}

struct TransitionT;
impl NodeInstance<TransitionState> for TransitionT {
    type Output = String;
    async fn run(
        &self,
        input: &Input,
        ctx: NodeContext<TransitionState>,
    ) -> Result<Outcome<TransitionState, String>, Error> {
        let payload = input.one::<u32>(&NodeId::new("A"))?;
        Ok(Outcome {
            value: Some(format!("{payload}@{}", ctx.state.count)),
            state_delta: TransitionStateDelta::default(),
            directive: None,
        })
    }
}

pub(super) async fn transition(immediate: bool) -> Result<CaseReport, Error> {
    let case = if immediate {
        "transition/immediate"
    } else {
        "transition/wait"
    };
    let graph = Graph::build(
        vec![
            Node::new(NodeId::new("A"), TransitionA(immediate)).declared_targets(vec![
                cognacta_core::DirectiveTarget::Transition(NodeId::new("T")),
            ]),
            Node::new(NodeId::new("P"), CountNode).writes(vec![TransitionStateField::Count]),
            Node::new(NodeId::new("Q"), CountNode).writes(vec![TransitionStateField::Count]),
            Node::new(NodeId::new("T"), TransitionT).terminal(true),
        ],
        vec![
            Edge {
                source: NodeId::new("A"),
                target: NodeId::new("P"),
                when: None,
            },
            Edge {
                source: NodeId::new("P"),
                target: NodeId::new("Q"),
                when: None,
            },
            Edge {
                source: NodeId::new("Q"),
                target: NodeId::new("T"),
                when: None,
            },
        ],
        vec![NodeId::new("A")],
    )?;
    let run = execute(case, &graph, 2, 4, TransitionState { count: 0 }, vec![]).await?;
    let mut report = CaseReport::capture(
        case,
        &run,
        keys(&run, &["A", "P", "Q", "T"], &[]),
        vec![("count".into(), run.state().count.to_string())],
    );
    report.check(
        "run-status",
        "completed",
        format!("{:?}", run.status()).to_lowercase(),
    );
    report.check(
        "waves",
        if immediate { "3" } else { "4" },
        run.waves().to_string(),
    );
    report.check("count", "2", run.state().count.to_string());
    report.check(
        "T-output",
        if immediate { "\"7@0\"" } else { "\"7@2\"" },
        output::<String>(&run, &key("T")),
    );
    let input = run.node(&key("T")).unwrap().input().unwrap();
    report.check(
        "T-payload-sources",
        "1",
        input.origins(&NodeId::new("A")).len().to_string(),
    );
    report.check(
        "T-u32-values",
        "1",
        input.all::<u32>().unwrap().len().to_string(),
    );
    report.check(
        "T-Q-values",
        "0",
        input
            .many::<u32>(&NodeId::new("Q"))
            .unwrap()
            .len()
            .to_string(),
    );
    for name in ["A", "P", "Q", "T"] {
        report.check(format!("{name}-attempts"), "1", attempts(&run, name));
    }
    Ok(report)
}

#[derive(State)]
struct SettlementState {
    #[reducer(Override)]
    title: Option<String>,
    #[reducer(Append)]
    items: Vec<String>,
    #[reducer(Add)]
    count: u8,
}

#[derive(Clone, Copy, Eq, PartialEq)]
pub(super) enum SettlementKind {
    NodeError,
    MergeError,
    DirectiveError,
    SingleWriter,
    MultiError,
}

struct Seed {
    workers: usize,
    count: u8,
}
impl NodeInstance<SettlementState> for Seed {
    type Output = String;
    async fn run(
        &self,
        _input: &Input,
        _ctx: NodeContext<SettlementState>,
    ) -> Result<Outcome<SettlementState, String>, Error> {
        let targets = (1..=self.workers)
            .map(|index| cognacta_core::DeliverTarget {
                template: NodeId::new("worker"),
                payload: Arc::new(format!("w{index}")) as SharedValue,
                key: format!("w{index}"),
            })
            .collect();
        Ok(Outcome {
            value: Some("seed".into()),
            state_delta: SettlementStateDelta {
                title: Some(Some("seed".into())),
                items: Some(vec!["seed".into()]),
                count: Some(self.count),
            },
            directive: Some(Directive::Deliver(targets)),
        })
    }
}

struct SettlementWorker {
    kind: SettlementKind,
}
impl NodeInstance<SettlementState> for SettlementWorker {
    type Output = String;
    async fn run(
        &self,
        input: &Input,
        _ctx: NodeContext<SettlementState>,
    ) -> Result<Outcome<SettlementState, String>, Error> {
        let name = input.one::<String>(&NodeId::new("seed"))?.clone();
        let failed = (self.kind == SettlementKind::NodeError && name == "w1")
            || (self.kind == SettlementKind::MultiError && (name == "w1" || name == "w2"));
        if failed {
            return Err(Error::execution(std::io::Error::other("controlled")));
        }
        let title = (self.kind == SettlementKind::SingleWriter
            || self.kind == SettlementKind::MultiError)
            .then(|| Some(name.clone()));
        let directive = match self.kind {
            SettlementKind::DirectiveError => Some(Directive::Deliver(vec![
                cognacta_core::DeliverTarget {
                    template: NodeId::new("aux"),
                    payload: Arc::new(String::from("aux")) as SharedValue,
                    key: "a1".into(),
                },
                cognacta_core::DeliverTarget {
                    template: NodeId::new("missing"),
                    payload: Arc::new(String::from("bad")) as SharedValue,
                    key: "bad".into(),
                },
            ])),
            SettlementKind::MultiError => {
                Some(Directive::Deliver(vec![cognacta_core::DeliverTarget {
                    template: NodeId::new("missing"),
                    payload: Arc::new(String::from("bad")) as SharedValue,
                    key: format!("bad{name}"),
                }]))
            }
            _ => None,
        };
        Ok(Outcome {
            value: Some(name.clone()),
            state_delta: SettlementStateDelta {
                title,
                items: Some(vec![name]),
                count: Some(1),
            },
            directive,
        })
    }
}

struct SettlementAggregate;
impl NodeInstance<SettlementState> for SettlementAggregate {
    type Output = String;
    async fn run(
        &self,
        input: &Input,
        _ctx: NodeContext<SettlementState>,
    ) -> Result<Outcome<SettlementState, String>, Error> {
        let values = input.many::<String>(&NodeId::new("worker"))?;
        Ok(Outcome {
            value: Some(format!("{values:?}")),
            state_delta: SettlementStateDelta::default(),
            directive: None,
        })
    }
}

pub(super) async fn settlement(kind: SettlementKind) -> Result<CaseReport, Error> {
    let (variant, workers, concurrency) = match kind {
        SettlementKind::NodeError => ("node-error", 3, 1),
        SettlementKind::MergeError => ("merge-error", 2, 2),
        SettlementKind::DirectiveError => ("directive-error", 1, 2),
        SettlementKind::SingleWriter => ("single-writer", 2, 2),
        SettlementKind::MultiError => ("multi-error", 4, 2),
    };
    let case = format!("settlement/{variant}");
    let nodes = vec![
        Node::new(
            NodeId::new("seed"),
            Seed {
                workers,
                count: if kind == SettlementKind::MergeError {
                    255
                } else {
                    1
                },
            },
        )
        .writes(vec![
            SettlementStateField::Title,
            SettlementStateField::Items,
            SettlementStateField::Count,
        ])
        .declared_targets(vec![cognacta_core::DirectiveTarget::Deliver(NodeId::new(
            "worker",
        ))]),
        Node::new(NodeId::new("worker"), SettlementWorker { kind })
            .template(true)
            .writes(vec![
                SettlementStateField::Title,
                SettlementStateField::Items,
                SettlementStateField::Count,
            ])
            .declared_targets(vec![cognacta_core::DirectiveTarget::Deliver(NodeId::new(
                "aux",
            ))]),
        Node::new(
            NodeId::new("aux"),
            SettlementWorker {
                kind: SettlementKind::MergeError,
            },
        )
        .template(true),
        Node::new(NodeId::new("aggregate"), SettlementAggregate).terminal(true),
    ];
    let graph = Graph::build(
        nodes,
        vec![Edge {
            source: NodeId::new("worker"),
            target: NodeId::new("aggregate"),
            when: None,
        }],
        vec![NodeId::new("seed")],
    )?;
    let run = execute(
        &case,
        &graph,
        concurrency,
        3,
        SettlementState {
            title: None,
            items: vec![],
            count: 0,
        },
        vec![],
    )
    .await?;
    let instances = run.instances(&NodeId::new("worker"));
    let mut report = CaseReport::capture(
        &case,
        &run,
        keys(&run, &["seed", "aggregate"], &["worker", "aux"]),
        vec![
            ("title".into(), format!("{:?}", run.state().title)),
            ("items".into(), format!("{:?}", run.state().items)),
            ("count".into(), run.state().count.to_string()),
        ],
    );
    let errors = run
        .errors()
        .iter()
        .map(super::report::run_error)
        .collect::<Vec<_>>()
        .join(";");
    let (expected_errors, expected_items, expected_count): (String, String, &str) = match kind {
        SettlementKind::NodeError => (
            "Node(worker[w1],Node(Execution))".into(),
            "[\"seed\", \"w2\", \"w3\"]".into(),
            "3",
        ),
        SettlementKind::MergeError => (
            "Merge(Merge(Overflow:Some(\"count\")))".into(),
            "[\"seed\"]".into(),
            "255",
        ),
        SettlementKind::DirectiveError => (
            "InvalidDirective(worker[w1],UnknownTarget)".into(),
            "[\"seed\", \"w1\"]".into(),
            "2",
        ),
        SettlementKind::SingleWriter => (
            "Merge(Merge(SingleWriterConflicts:[\"title\"]))".into(),
            "[\"seed\"]".into(),
            "1",
        ),
        SettlementKind::MultiError => (
            "Node(worker[w1],Node(Execution));Node(worker[w2],Node(Execution));Merge(Merge(SingleWriterConflicts:[\"title\"]));InvalidDirective(worker[w3],UnknownTarget);InvalidDirective(worker[w4],UnknownTarget)".into(),
            "[\"seed\"]".into(),
            "1",
        ),
    };
    report.check(
        "run-status",
        "failed",
        format!("{:?}", run.status()).to_lowercase(),
    );
    report.check("waves", "2", run.waves().to_string());
    report.check("errors", expected_errors, errors);
    report.check(
        "title",
        "Some(\"seed\")",
        format!("{:?}", run.state().title),
    );
    report.check("items", expected_items, format!("{:?}", run.state().items));
    report.check("count", expected_count, run.state().count.to_string());
    report.check("aggregate-status", "pending", status(&run, "aggregate"));
    report.check("aggregate-attempts", "0", attempts(&run, "aggregate"));
    report.check(
        "aux-instances",
        "0",
        run.instances(&NodeId::new("aux")).len().to_string(),
    );
    report.check(
        "final-output",
        "none",
        if run.final_output().is_none() {
            "none"
        } else {
            "some"
        },
    );
    for instance in instances {
        let NodeKey::Instance { key: name, .. } = instance else {
            continue;
        };
        let failed = (kind == SettlementKind::NodeError && name == "w1")
            || (kind == SettlementKind::MultiError && (name == "w1" || name == "w2"));
        let node = run.node(instance).unwrap();
        report.check(
            format!("{name}-output"),
            if failed { "none" } else { "present" },
            if failed {
                if node.output().is_none() {
                    "none"
                } else {
                    "present"
                }
            } else if node.output().is_some() {
                "present"
            } else {
                "missing"
            },
        );
    }
    Ok(report)
}
