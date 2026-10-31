use std::io::Write;

use cognacta_core::{
    DirectiveError, Error, MergeError, NodeError, NodeKey, NodeStatus, Run, RunError, RunStatus,
    SharedValue, State,
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
    status: NodeStatus,
    attempts: u32,
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
                    status: node.map_or(NodeStatus::Pending, |node| node.status()),
                    attempts: node.map_or(0, |node| node.attempts()),
                    output: node
                        .and_then(|node| node.output())
                        .map_or_else(|| "none".into(), format_value),
                    key,
                }
            })
            .collect();
        let final_output = run.final_output().map_or_else(
            || "none".into(),
            |output| {
                let mut values = output
                    .values
                    .iter()
                    .map(|(node, value)| format!("{}={}", node.as_str(), format_value(value)))
                    .collect::<Vec<_>>();
                values.sort();
                format!("{{{}}}", values.join(","))
            },
        );
        Self {
            case: case.into(),
            run: run_status(run.status()).into(),
            waves: Some(run.waves()),
            nodes,
            state,
            final_output,
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
                node.key,
                node_status(node.status),
                node.attempts,
                node.output
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
            errors: vec!["Stalled".into()],
            assertions: vec![],
        };
        report.check("run-status", "completed", "failed");
        report.check("output", "len=5", "type-mismatch");
        assert!(!report.passed());
        assert_eq!(report.assertions[1].actual, "type-mismatch");
    }
}
