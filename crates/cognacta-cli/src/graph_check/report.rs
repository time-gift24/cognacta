use std::io::Write;

use cognacta_core::{
    DirectiveError, Error, Input, MergeError, NodeError, NodeId, NodeKey, NodeStatus, Run,
    RunError, RunStatus, SharedValue, State,
};

use super::Job;

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
    final_values: Vec<(NodeId, String)>,
    errors: Vec<String>,
    assertions: Vec<Assertion>,
}

impl CaseReport {
    pub(super) fn capture<S: State>(
        case: &str,
        run: &Run<S>,
        keys: Vec<NodeKey>,
        state: Vec<(String, String)>,
    ) -> Self {
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
                        |node| node.output().map_or_else(|| "none".into(), format_value),
                    ),
                    key,
                }
            })
            .collect();
        let mut final_values = run.final_output().map_or_else(Vec::new, |output| {
            output
                .values
                .iter()
                .map(|(node, value)| (node.clone(), format_value(value)))
                .collect::<Vec<_>>()
        });
        final_values.sort_by(|left, right| left.0.cmp(&right.0));
        let final_output = if run.final_output().is_some() {
            format!(
                "{{{}}}",
                final_values
                    .iter()
                    .map(|(node, value)| format!("{node}={value}"))
                    .collect::<Vec<_>>()
                    .join(",")
            )
        } else {
            "none".into()
        };
        Self {
            case: case.into(),
            run: run_status(run.status()).into(),
            waves: Some(run.waves()),
            nodes,
            state,
            final_output,
            final_values,
            errors: run.errors().iter().map(run_error).collect(),
            assertions: Vec::new(),
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
            final_values: vec![],
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

    pub(super) fn final_value(&self, key: &NodeId) -> String {
        self.final_values
            .iter()
            .find(|(node, _)| node == key)
            .map_or_else(|| "missing".into(), |(_, value)| value.clone())
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

pub(super) fn input_fact<S: State>(
    run: &Run<S>,
    key: &NodeKey,
    read: impl FnOnce(&Input) -> Result<String, Error>,
) -> String {
    match run.node(key).and_then(|node| node.input()) {
        Some(input) => read(input).unwrap_or_else(|error| error_kind(&error)),
        None => "missing".into(),
    }
}

fn format_value(value: &SharedValue) -> String {
    if let Some(value) = value.downcast_ref::<String>() {
        return format!("{value:?}");
    }
    if let Some(value) = value.downcast_ref::<u32>() {
        return value.to_string();
    }
    if let Some(value) = value.downcast_ref::<u8>() {
        return value.to_string();
    }
    if let Some(value) = value.downcast_ref::<Job>() {
        return value.0.to_string();
    }
    "type-mismatch".into()
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
        RunError::Merge(error) => format!("Merge({})", error_kind(error)),
        RunError::InvalidDirective { writer, source } => {
            let kind = match source {
                DirectiveError::UnknownTarget { .. } => "UnknownTarget",
                DirectiveError::WrongTargetKind { .. } => "WrongTargetKind",
                DirectiveError::DuplicateInstanceKey { .. } => "DuplicateInstanceKey",
            };
            format!("InvalidDirective({writer},{kind})")
        }
        RunError::Stalled => "Stalled".into(),
        RunError::MaxWaves => "MaxWaves".into(),
        RunError::Invariant(message) => format!("Invariant({message})"),
    }
}

fn error_kind(error: &Error) -> String {
    match error {
        Error::Graph(_) => "Graph".into(),
        Error::Config(_) => "Config".into(),
        Error::Input(error) => format!("Input({error:?})"),
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

    #[test]
    fn changed_expectation_and_wrong_actual_fail_without_replacement() {
        let mut report = CaseReport {
            case: "test".into(),
            run: "failed".into(),
            waves: Some(1),
            nodes: vec![],
            state: vec![],
            final_output: "none".into(),
            final_values: vec![],
            errors: vec!["Stalled".into()],
            assertions: vec![],
        };
        report.check("run-status", "completed", "failed");
        report.check("output", "len=5", "type-mismatch");
        assert!(!report.passed());
        assert_eq!(report.assertions[1].actual, "type-mismatch");
    }

    #[derive(cognacta_core::State)]
    struct EmptyState {}

    struct Echo;
    impl cognacta_core::NodeInstance<EmptyState> for Echo {
        type Output = u32;
        async fn run(
            &self,
            input: &Input,
            _: cognacta_core::NodeContext<EmptyState>,
        ) -> Result<cognacta_core::Outcome<EmptyState, u32>, Error> {
            Ok(cognacta_core::Outcome {
                value: Some(*input.entry::<u32>()?),
                state_delta: EmptyStateDelta::default(),
                directive: None,
            })
        }
    }

    #[tokio::test]
    async fn actual_missing_facts_are_reported_without_inventing_pending_nodes() {
        use cognacta_core::{Graph, Node, Scheduler, SchedulerConfig};
        let id = NodeId::new("echo");
        let key = NodeKey::Static(id.clone());
        let absent = NodeKey::Static(NodeId::new("absent"));
        let graph = Graph::build(
            vec![Node::new(id.clone(), Echo).terminal(true)],
            vec![],
            vec![id],
        )
        .unwrap();
        for waves in [0, 1] {
            let run = Scheduler::new(SchedulerConfig::new(1, waves).unwrap())
                .run(
                    &graph,
                    "facts".into(),
                    EmptyState {},
                    vec![std::sync::Arc::new(7_u32)],
                )
                .await;
            let mut report =
                CaseReport::capture("facts", &run, vec![key.clone(), absent.clone()], vec![]);
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
