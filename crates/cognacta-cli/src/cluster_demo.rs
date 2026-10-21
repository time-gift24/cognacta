use std::io::Write;

use async_trait::async_trait;
use cognacta_core::{
    Cluster, Control, Error as CoreError, ErrorKind, Node, NodeContext, NodeInstance, Outcome, Run,
    RunStatus, Scheduler, State,
};

use crate::Error;

#[derive(Debug, clap::Args)]
pub(crate) struct DemoArgs {
    #[arg(value_enum)]
    scenario: Scenario,
}

#[derive(Clone, Copy, Debug, clap::ValueEnum)]
enum Scenario {
    Chain,
    BranchEven,
    BranchOdd,
    ReactLoop,
    NodeError,
    DeltaError,
    InputError,
}

pub(crate) async fn run(args: DemoArgs) -> Result<(), Error> {
    run_scenario(args.scenario, &mut std::io::stdout().lock()).await
}

async fn run_scenario(scenario: Scenario, output: &mut impl Write) -> Result<(), Error> {
    match scenario {
        Scenario::Chain => chain(output).await,
        Scenario::BranchEven => branch(2, output).await,
        Scenario::BranchOdd => branch(3, output).await,
        Scenario::ReactLoop => react_loop(output).await,
        Scenario::NodeError | Scenario::DeltaError | Scenario::InputError => {
            failure(scenario, output).await
        }
    }
}

fn status<S: State>(run: &Run<'_, S>) -> &'static str {
    match run.status() {
        RunStatus::Ready => "ready",
        RunStatus::Running => "running",
        RunStatus::Completed => "completed",
        RunStatus::Failed => "failed",
    }
}

fn report(
    output: &mut impl Write,
    summary: String,
    result: Result<(), CoreError>,
) -> Result<(), Error> {
    writeln!(output, "{summary}")?;
    output.flush()?;
    result.map_err(Error::Core)
}

#[derive(Default)]
struct ChainState {
    length: usize,
    output: String,
}

enum ChainDelta {
    Length(usize),
    Output(String),
}

impl State for ChainState {
    type Delta = ChainDelta;

    fn apply_delta(&mut self, delta: ChainDelta) -> Result<(), CoreError> {
        match delta {
            ChainDelta::Length(length) => self.length = length,
            ChainDelta::Output(output) => self.output = output,
        }
        Ok(())
    }
}

struct Count;

#[async_trait]
impl NodeInstance<ChainState> for Count {
    type Input = String;
    type Payload = usize;

    async fn run(
        &self,
        input: String,
        _: NodeContext<'_, ChainState>,
    ) -> Result<Outcome<ChainDelta, usize>, CoreError> {
        let length = input.chars().count();
        Ok(Outcome {
            state_delta: Some(ChainDelta::Length(length)),
            control: Control::Goto {
                target: "render".into(),
                input: length,
            },
        })
    }
}

struct Render;

#[async_trait]
impl NodeInstance<ChainState> for Render {
    type Input = usize;
    type Payload = ();

    async fn run(
        &self,
        input: usize,
        ctx: NodeContext<'_, ChainState>,
    ) -> Result<Outcome<ChainDelta, ()>, CoreError> {
        if input != ctx.state.length {
            return Err(CoreError::new(
                ErrorKind::InvalidRequest,
                "length not committed",
            ));
        }
        Ok(Outcome {
            state_delta: Some(ChainDelta::Output(format!("len={input}"))),
            control: Control::Finish,
        })
    }
}

async fn chain(output: &mut impl Write) -> Result<(), Error> {
    let mut cluster = Cluster::new();
    cluster.add(Node::builder().id("count".into()).body(Count).build()?)?;
    cluster.add(Node::builder().id("render".into()).body(Render).build()?)?;
    let mut run = cluster
        .start()
        .state(ChainState::default())
        .entry("count".into())
        .input("hello".to_owned())
        .call()?;
    let result = Scheduler::new().drive(&mut run).await;
    report(
        output,
        format!(
            "status={} length={} output={}",
            status(&run),
            run.state().length,
            run.state().output
        ),
        result,
    )
}

#[derive(Default)]
struct BranchState {
    selected: &'static str,
}

impl State for BranchState {
    type Delta = &'static str;

    fn apply_delta(&mut self, delta: Self::Delta) -> Result<(), CoreError> {
        if !self.selected.is_empty() {
            return Err(CoreError::new(
                ErrorKind::InvalidRequest,
                "branch already selected",
            ));
        }
        self.selected = delta;
        Ok(())
    }
}

struct Route;

#[async_trait]
impl NodeInstance<BranchState> for Route {
    type Input = i64;
    type Payload = i64;

    async fn run(
        &self,
        input: i64,
        _: NodeContext<'_, BranchState>,
    ) -> Result<Outcome<&'static str, i64>, CoreError> {
        Ok(Outcome {
            state_delta: None,
            control: Control::Goto {
                target: if input % 2 == 0 { "even" } else { "odd" }.into(),
                input,
            },
        })
    }
}

struct SelectBranch(&'static str);

#[async_trait]
impl NodeInstance<BranchState> for SelectBranch {
    type Input = i64;
    type Payload = ();

    async fn run(
        &self,
        input: i64,
        ctx: NodeContext<'_, BranchState>,
    ) -> Result<Outcome<&'static str, ()>, CoreError> {
        let expected = if input % 2 == 0 { "even" } else { "odd" };
        if self.0 != expected || !ctx.state.selected.is_empty() {
            return Err(CoreError::new(
                ErrorKind::InvalidRequest,
                "incorrect branch",
            ));
        }
        Ok(Outcome {
            state_delta: Some(self.0),
            control: Control::Finish,
        })
    }
}

async fn branch(input: i64, output: &mut impl Write) -> Result<(), Error> {
    let mut cluster = Cluster::new();
    cluster.add(Node::builder().id("route".into()).body(Route).build()?)?;
    for name in ["even", "odd"] {
        cluster.add(
            Node::builder()
                .id(name.into())
                .body(SelectBranch(name))
                .build()?,
        )?;
    }
    let mut run = cluster
        .start()
        .state(BranchState::default())
        .entry("route".into())
        .input(input)
        .call()?;
    let result = Scheduler::new().drive(&mut run).await;
    report(
        output,
        format!("status={} branch={}", status(&run), run.state().selected),
        result,
    )
}

#[derive(Default)]
struct LoopState {
    model_calls: usize,
    tool_calls: usize,
    answer: Option<i64>,
}

enum LoopDelta {
    Model(Option<i64>),
    Tool,
}

impl State for LoopState {
    type Delta = LoopDelta;

    fn apply_delta(&mut self, delta: LoopDelta) -> Result<(), CoreError> {
        match delta {
            LoopDelta::Model(answer) => {
                self.model_calls += 1;
                self.answer = answer;
            }
            LoopDelta::Tool => self.tool_calls += 1,
        }
        Ok(())
    }
}

enum ModelInput {
    Start,
    ToolResult(i64),
}

struct DemoToolCall {
    left: i64,
    right: i64,
}

struct Model;

#[async_trait]
impl NodeInstance<LoopState> for Model {
    type Input = ModelInput;
    type Payload = DemoToolCall;

    async fn run(
        &self,
        input: ModelInput,
        ctx: NodeContext<'_, LoopState>,
    ) -> Result<Outcome<LoopDelta, DemoToolCall>, CoreError> {
        match input {
            ModelInput::Start => Ok(Outcome {
                state_delta: Some(LoopDelta::Model(None)),
                control: Control::Goto {
                    target: "tool".into(),
                    input: DemoToolCall { left: 2, right: 3 },
                },
            }),
            ModelInput::ToolResult(answer) => {
                if ctx.state.model_calls != 1 || ctx.state.tool_calls != 1 {
                    return Err(CoreError::new(
                        ErrorKind::InvalidRequest,
                        "tool update not committed",
                    ));
                }
                Ok(Outcome {
                    state_delta: Some(LoopDelta::Model(Some(answer))),
                    control: Control::Finish,
                })
            }
        }
    }
}

struct Tool;

#[async_trait]
impl NodeInstance<LoopState> for Tool {
    type Input = DemoToolCall;
    type Payload = ModelInput;

    async fn run(
        &self,
        input: DemoToolCall,
        _: NodeContext<'_, LoopState>,
    ) -> Result<Outcome<LoopDelta, ModelInput>, CoreError> {
        let answer = input
            .left
            .checked_add(input.right)
            .ok_or_else(|| CoreError::new(ErrorKind::InvalidRequest, "addition overflow"))?;
        Ok(Outcome {
            state_delta: Some(LoopDelta::Tool),
            control: Control::Goto {
                target: "model".into(),
                input: ModelInput::ToolResult(answer),
            },
        })
    }
}

async fn react_loop(output: &mut impl Write) -> Result<(), Error> {
    let mut cluster = Cluster::new();
    cluster.add(Node::builder().id("model".into()).body(Model).build()?)?;
    cluster.add(Node::builder().id("tool".into()).body(Tool).build()?)?;
    let mut run = cluster
        .start()
        .state(LoopState::default())
        .entry("model".into())
        .input(ModelInput::Start)
        .call()?;
    let result = Scheduler::new().drive(&mut run).await;
    report(
        output,
        format!(
            "status={} model_calls={} tool_calls={} answer={}",
            status(&run),
            run.state().model_calls,
            run.state().tool_calls,
            run.state()
                .answer
                .map_or_else(|| "none".into(), |answer| answer.to_string())
        ),
        result,
    )
}

#[derive(Default)]
struct FailureState {
    value: i32,
}

impl State for FailureState {
    type Delta = i32;

    fn apply_delta(&mut self, delta: i32) -> Result<(), CoreError> {
        if delta < 0 {
            return Err(CoreError::new(
                ErrorKind::InvalidRequest,
                "SECRET_DELTA_REJECTED",
            ));
        }
        self.value = delta;
        Ok(())
    }
}

struct Seed(&'static str);

#[async_trait]
impl NodeInstance<FailureState> for Seed {
    type Input = ();
    type Payload = String;

    async fn run(
        &self,
        _: (),
        _: NodeContext<'_, FailureState>,
    ) -> Result<Outcome<i32, String>, CoreError> {
        Ok(Outcome {
            state_delta: Some(1),
            control: Control::Goto {
                target: self.0.into(),
                input: "seeded".into(),
            },
        })
    }
}

struct Fail;

#[async_trait]
impl NodeInstance<FailureState> for Fail {
    type Input = String;
    type Payload = ();

    async fn run(
        &self,
        _: String,
        _: NodeContext<'_, FailureState>,
    ) -> Result<Outcome<i32, ()>, CoreError> {
        Err(
            CoreError::new(ErrorKind::Unavailable, "SECRET_NODE_FAILURE")
                .with_source(Box::new(std::io::Error::other("SECRET_NODE_SOURCE"))),
        )
    }
}

struct Reject;

#[async_trait]
impl NodeInstance<FailureState> for Reject {
    type Input = String;
    type Payload = usize;

    async fn run(
        &self,
        _: String,
        _: NodeContext<'_, FailureState>,
    ) -> Result<Outcome<i32, usize>, CoreError> {
        Ok(Outcome {
            state_delta: Some(-1),
            control: Control::Goto {
                target: "sentinel".into(),
                input: 99,
            },
        })
    }
}

struct Unexpected;

#[async_trait]
impl NodeInstance<FailureState> for Unexpected {
    type Input = usize;
    type Payload = ();

    async fn run(
        &self,
        _: usize,
        _: NodeContext<'_, FailureState>,
    ) -> Result<Outcome<i32, ()>, CoreError> {
        // Executing this body would visibly violate the failed-run summary.
        Ok(Outcome {
            state_delta: Some(99),
            control: Control::Finish,
        })
    }
}

async fn failure(scenario: Scenario, output: &mut impl Write) -> Result<(), Error> {
    let mut cluster = Cluster::new();
    let target = match scenario {
        Scenario::NodeError => {
            cluster.add(Node::builder().id("fail".into()).body(Fail).build()?)?;
            "fail"
        }
        Scenario::DeltaError => {
            cluster.add(Node::builder().id("reject".into()).body(Reject).build()?)?;
            cluster.add(
                Node::builder()
                    .id("sentinel".into())
                    .body(Unexpected)
                    .build()?,
            )?;
            "reject"
        }
        Scenario::InputError => {
            cluster.add(
                Node::builder()
                    .id("typed_target".into())
                    .body(Unexpected)
                    .build()?,
            )?;
            "typed_target"
        }
        _ => {
            return Err(CoreError::new(ErrorKind::InvalidRequest, "not a failure scenario").into());
        }
    };
    cluster.add(
        Node::builder()
            .id("seed".into())
            .body(Seed(target))
            .build()?,
    )?;
    let mut run = cluster
        .start()
        .state(FailureState::default())
        .entry("seed".into())
        .input(())
        .call()?;
    let result = Scheduler::new().drive(&mut run).await;
    report(
        output,
        format!(
            "status={} node={} value={}",
            status(&run),
            run.node_id().map_or("none", String::as_str),
            run.state().value
        ),
        result,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejected_delta_leaves_state_unchanged() {
        let mut state = FailureState { value: 1 };
        assert!(state.apply_delta(-1).is_err());
        assert_eq!(state.value, 1);
        let mut branch = BranchState { selected: "even" };
        assert!(branch.apply_delta("odd").is_err());
        assert_eq!(branch.selected, "even");
    }

    #[tokio::test]
    async fn summary_write_failure_is_returned_without_retry() {
        struct BrokenOutput(usize);
        impl Write for BrokenOutput {
            fn write(&mut self, _: &[u8]) -> std::io::Result<usize> {
                self.0 += 1;
                Err(std::io::ErrorKind::BrokenPipe.into())
            }
            fn flush(&mut self) -> std::io::Result<()> {
                Ok(())
            }
        }
        let mut output = BrokenOutput(0);
        let error = run_scenario(Scenario::ReactLoop, &mut output)
            .await
            .unwrap_err();
        assert!(
            matches!(error, Error::Io(error) if error.kind() == std::io::ErrorKind::BrokenPipe)
        );
        assert_eq!(output.0, 1);
    }
}
