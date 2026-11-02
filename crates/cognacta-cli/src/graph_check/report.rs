use std::{any::Any, fmt::Debug, io::Write};

use cognacta_core::{
    DirectiveError, Error, Input, MergeError, NodeError, NodeKey, NodeStatus, Run, RunError,
    RunStatus, SharedValue, State,
};

pub(super) struct Assertion {
    name: String,
    expected: String,
    actual: String,
    passed: bool,
}

struct NodeFact {
    key: NodeKey,
    status: String,
    attempts: String,
    output: String,
}

pub(super) struct CaseReport {
    case: String,
    run: String,
    waves: Option<usize>,
    nodes: Vec<NodeFact>,
    state: Vec<(String, String)>,
    final_output: String,
    errors: Vec<String>,
    assertions: Vec<Assertion>,
}

impl CaseReport {
    pub(super) fn capture<S: State, O: Send + Sync + 'static>(
        case: &str,
        run: &Run<S, O>,
        keys: Vec<NodeKey>,
        state: Vec<(String, String)>,
        format_node: impl Fn(&NodeKey, &SharedValue) -> Option<String>,
        format_output: impl FnOnce(&O) -> String,
    ) -> Self {
        let mut assertions = Vec::new();
        let nodes = keys
            .into_iter()
            .map(|key| {
                let node = run.node(&key);
                NodeFact {
                    status: node
                        .map_or("missing", |node| node_status(node.status()))
                        .into(),
                    attempts: node
                        .map_or_else(|| "missing".into(), |node| node.attempts().to_string()),
                    output: node.map_or_else(
                        || "missing".into(),
                        |node| {
                            node.output().map_or_else(
                                || "none".into(),
                                |value| {
                                    format_node(&key, value).unwrap_or_else(|| {
                                        assertions.push(Assertion {
                                            name: format!("{key}-output-type"),
                                            expected: "fixture output type".into(),
                                            actual: "type-mismatch".into(),
                                            passed: false,
                                        });
                                        "type-mismatch".into()
                                    })
                                },
                            )
                        },
                    ),
                    key,
                }
            })
            .collect();
        let final_output = run
            .final_output()
            .map_or_else(|| "none".into(), |output| format_output(output));
        Self {
            case: case.into(),
            run: run_status(run.status()).into(),
            waves: Some(run.waves()),
            nodes,
            state,
            final_output,
            errors: run.errors().iter().map(run_error).collect(),
            assertions,
        }
    }

    pub(super) fn failed_to_start(case: &str, error: &Error) -> Self {
        let mut report = Self {
            case: case.into(),
            run: "not-started".into(),
            waves: None,
            nodes: Vec::new(),
            state: Vec::new(),
            final_output: "none".into(),
            errors: vec![error_kind(error)],
            assertions: Vec::new(),
        };
        report.check("run-started", "started", "not-started");
        report
    }

    pub(super) fn check(
        &mut self,
        name: impl Into<String>,
        expected: impl Into<String>,
        actual: impl Into<String>,
    ) {
        let expected = expected.into();
        let actual = actual.into();
        self.assertions.push(Assertion {
            name: name.into(),
            passed: expected == actual,
            expected,
            actual,
        });
    }

    pub(super) fn node_status(&self, key: &NodeKey) -> String {
        self.nodes
            .iter()
            .find(|node| &node.key == key)
            .map_or_else(|| "missing".into(), |node| node.status.clone())
    }

    pub(super) fn node_attempts(&self, key: &NodeKey) -> String {
        self.nodes
            .iter()
            .find(|node| &node.key == key)
            .map_or_else(|| "missing".into(), |node| node.attempts.clone())
    }

    pub(super) fn node_output(&self, key: &NodeKey) -> String {
        self.nodes
            .iter()
            .find(|node| &node.key == key)
            .map_or_else(|| "missing".into(), |node| node.output.clone())
    }

    pub(super) fn final_value(&self) -> String {
        self.final_output.clone()
    }

    pub(super) fn errors(&self) -> &[String] {
        &self.errors
    }

    pub(super) fn error(&self, index: usize) -> String {
        self.errors
            .get(index)
            .cloned()
            .unwrap_or_else(|| "missing".into())
    }

    pub(super) fn passed(&self) -> bool {
        self.assertions.iter().all(|assertion| assertion.passed)
    }

    pub(super) fn write(&self, writer: &mut impl Write) -> std::io::Result<()> {
        writeln!(
            writer,
            "case={} run={} check={} waves={}",
            self.case,
            self.run,
            if self.passed() { "PASS" } else { "FAIL" },
            self.waves
                .map_or_else(|| "none".into(), |waves| waves.to_string())
        )?;
        for node in &self.nodes {
            writeln!(
                writer,
                "node={} status={} attempts={} output={}",
                node.key, node.status, node.attempts, node.output
            )?;
        }
        for (field, value) in &self.state {
            writeln!(writer, "state.{field}={value}")?;
        }
        writeln!(writer, "errors=[{}]", self.errors.join(","))?;
        writeln!(writer, "final_output={}", self.final_output)?;
        for assertion in &self.assertions {
            writeln!(
                writer,
                "assert={} expected={} actual={} {}",
                assertion.name,
                assertion.expected,
                assertion.actual,
                if assertion.passed { "PASS" } else { "FAIL" }
            )?;
        }
        Ok(())
    }
}

pub(super) fn input_fact<S: State, O: Send + Sync + 'static>(
    run: &Run<S, O>,
    key: &NodeKey,
    read: impl FnOnce(&Input) -> Result<String, Error>,
) -> String {
    match run.node(key).and_then(|node| node.input()) {
        Some(input) => read(input).unwrap_or_else(|error| error_kind(&error)),
        None => "missing".into(),
    }
}

pub(super) fn format_value<T: Any + Debug>(value: &SharedValue) -> Option<String> {
    value.downcast_ref::<T>().map(|value| format!("{value:?}"))
}

fn run_status(status: RunStatus) -> &'static str {
    match status {
        RunStatus::Running => "running",
        RunStatus::Suspended => "suspended",
        RunStatus::Completed => "completed",
        RunStatus::Failed => "failed",
    }
}

fn node_status(status: NodeStatus) -> &'static str {
    match status {
        NodeStatus::Pending => "pending",
        NodeStatus::Running => "running",
        NodeStatus::Completed => "completed",
        NodeStatus::Skipped => "skipped",
        NodeStatus::Failed => "failed",
    }
}

pub(super) fn run_error(error: &RunError) -> String {
    match error {
        RunError::Node { key, source } => format!("Node({key},{})", error_kind(source)),
        RunError::Scheduling { .. } => "Scheduling".into(),
        RunError::Merge(error) => format!("Merge({})", error_kind(error)),
        RunError::InvalidDirective { writer, source } => {
            let kind = match source {
                DirectiveError::UnknownTarget { .. } => "UnknownTarget",
                DirectiveError::WrongTargetKind { .. } => "WrongTargetKind",
                DirectiveError::DuplicateInstanceKey { .. } => "DuplicateInstanceKey",
            };
            format!("InvalidDirective({writer},{kind})")
        }
        RunError::MissingOutput { .. } => "MissingOutput".into(),
        RunError::Stalled => "Stalled".into(),
        RunError::MaxWaves => "MaxWaves".into(),
        RunError::Invariant(message) => format!("Invariant({message})"),
    }
}

fn error_kind(error: &Error) -> String {
    match error {
        Error::Call(error) => format!(
            "Call({})",
            match error {
                cognacta_core::CallError::Input { .. } => "Input",
                cognacta_core::CallError::Initialization { .. } => "Initialization",
                cognacta_core::CallError::Execution { .. } => "Execution",
                cognacta_core::CallError::DepthExceeded { .. } => "DepthExceeded",
                cognacta_core::CallError::MissingOutput => "MissingOutput",
            }
        ),
        Error::Scheduling { .. } => "Scheduling".into(),
        Error::Graph(_) => "Graph".into(),
        Error::Config(_) => "Config".into(),
        Error::Input(error) => format!("Input({error:?})"),
        Error::Node(NodeError::UnboundInstance) => "Node(UnboundInstance)".into(),
        Error::Node(NodeError::DroppedInstance) => "Node(DroppedInstance)".into(),
        Error::Node(NodeError::Execution(_)) => "Node(Execution)".into(),
        Error::Node(NodeError::Task(_)) => "Node(Task)".into(),
        Error::Merge(MergeError::SingleWriterConflicts { fields }) => {
            format!("Merge(SingleWriterConflicts:{fields:?})")
        }
        Error::Merge(MergeError::Overflow { field }) => format!("Merge(Overflow:{field:?})"),
        Error::Merge(MergeError::Reduce { field, .. }) => format!("Merge(Reduce:{field:?})"),
        Error::Merge(MergeError::Finish { field, .. }) => format!("Merge(Finish:{field:?})"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cognacta_core::Scheduler;
    use std::sync::Arc;

    #[test]
    fn changed_expectation_and_wrong_actual_fail_without_replacement() {
        let mut report = CaseReport {
            case: "test".into(),
            run: "failed".into(),
            waves: Some(1),
            nodes: vec![],
            state: vec![],
            final_output: "none".into(),
            errors: vec!["Stalled".into()],
            assertions: vec![],
        };
        report.check("run-status", "completed", "failed");
        report.check("output", "len=5", "type-mismatch");
        assert!(!report.passed());
        assert_eq!(report.assertions[1].actual, "type-mismatch");
    }

    #[derive(Default, cognacta_core::State)]
    struct EmptyState {}

    struct Echo;
    impl cognacta_core::NodeInstance<EmptyState> for Echo {
        type Output = u32;
        async fn run(
            &self,
            input: &Input,
            _: cognacta_core::NodeContext<EmptyState>,
            _scheduler: Arc<dyn Scheduler>,
        ) -> Result<cognacta_core::Outcome<EmptyState, u32>, Error> {
            Ok(cognacta_core::Outcome {
                value: Some(Arc::new(*input.entry::<u32>()?)),
                state_delta: EmptyStateDelta::default(),
                directive: None,
            })
        }
    }

    #[tokio::test]
    async fn actual_missing_facts_are_reported_without_inventing_pending_nodes() {
        use cognacta_core::{
            Graph, GraphInput, Input, LocalScheduler, Node, NodeId, RunContext, SchedulerConfig,
        };
        let id = NodeId::new("echo");
        let key = NodeKey::Static(id.clone());
        let absent = NodeKey::Static(NodeId::new("absent"));
        let graph = Graph::<_, u32>::build(
            vec![Node::new(id.clone(), Echo)],
            vec![],
            vec![id.clone()],
            id.clone(),
        )
        .unwrap();
        for waves in [0, 1] {
            let run = (Arc::new(LocalScheduler::new(SchedulerConfig::new(1, waves).unwrap()))
                as Arc<dyn Scheduler>)
                .run(
                    &graph,
                    GraphInput::new(std::collections::HashMap::from([(
                        id.clone(),
                        Input::new(vec![Arc::new(7_u32)]),
                    )])),
                    RunContext::root("facts".into(), 1, Arc::new(())),
                )
                .await
                .unwrap();
            let mut report = CaseReport::capture(
                "facts",
                &run,
                vec![key.clone(), absent.clone()],
                vec![],
                |_, value| format_value::<u32>(value),
                |value| value.to_string(),
            );
            report.check("absent-node", "completed", report.node_status(&absent));
            report.check("absent-attempts", "1", report.node_attempts(&absent));
            report.check("absent-output", "7", report.node_output(&absent));
            assert_eq!(input_fact(&run, &absent, |_| unreachable!()), "missing");
            let input = input_fact(&run, &key, |input| Ok(input.entry::<u32>()?.to_string()));
            assert_eq!(input, if waves == 0 { "missing" } else { "7" });
            if waves == 1 {
                // An expected failure can become a success during a regression.
                report.check("expected-error", "Stalled", report.error(0));
                assert_eq!(report.error(0), "missing");
                assert!(
                    input_fact(&run, &key, |input| Ok(input.entry::<String>()?.clone()))
                        .starts_with("Input(")
                );
            }
            assert!(!report.passed());
            let mut output = Vec::new();
            report.write(&mut output).unwrap();
            let output = String::from_utf8(output).unwrap();
            assert!(output.contains("check=FAIL"));
            assert!(output.contains("node=absent status=missing attempts=missing output=missing"));
        }
    }
}
