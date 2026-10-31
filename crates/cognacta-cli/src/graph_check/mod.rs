mod fixtures;
mod report;

use std::io::Write;

use clap::ValueEnum;
use fixtures::SettlementKind;
use report::CaseReport;

use super::Error;

#[derive(Clone, Copy, Debug, ValueEnum)]
pub(crate) enum Scenario {
    Chain,
    Diamond,
    Branch,
    Fanout,
    Transition,
    Settlement,
    All,
}

#[derive(Clone, Copy, Debug)]
struct Job(u32);

pub(crate) async fn run(scenario: Scenario, writer: &mut impl Write) -> Result<(), Error> {
    let cases: &[&str] = match scenario {
        Scenario::Chain => &["chain/complete", "chain/limit"],
        Scenario::Diamond => &["diamond/serial", "diamond/parallel"],
        Scenario::Branch => &["branch/any", "branch/all"],
        Scenario::Fanout => &["fanout/empty", "fanout/one", "fanout/many"],
        Scenario::Transition => &["transition/immediate", "transition/wait"],
        Scenario::Settlement => &[
            "settlement/node-error",
            "settlement/merge-error",
            "settlement/directive-error",
            "settlement/single-writer",
            "settlement/multi-error",
        ],
        Scenario::All => &[
            "chain/complete",
            "chain/limit",
            "diamond/serial",
            "diamond/parallel",
            "branch/any",
            "branch/all",
            "fanout/empty",
            "fanout/one",
            "fanout/many",
            "transition/immediate",
            "transition/wait",
            "settlement/node-error",
            "settlement/merge-error",
            "settlement/directive-error",
            "settlement/single-writer",
            "settlement/multi-error",
        ],
    };
    let mut passed = 0;
    let mut failed = 0;
    for case in cases {
        let result = match *case {
            "chain/complete" => fixtures::chain(false).await,
            "chain/limit" => fixtures::chain(true).await,
            "diamond/serial" => fixtures::diamond(false).await,
            "diamond/parallel" => fixtures::diamond(true).await,
            "branch/any" => fixtures::branch(true).await,
            "branch/all" => fixtures::branch(false).await,
            "fanout/empty" => fixtures::fanout(0).await,
            "fanout/one" => fixtures::fanout(1).await,
            "fanout/many" => fixtures::fanout(3).await,
            "transition/immediate" => fixtures::transition(true).await,
            "transition/wait" => fixtures::transition(false).await,
            "settlement/node-error" => fixtures::settlement(SettlementKind::NodeError).await,
            "settlement/merge-error" => fixtures::settlement(SettlementKind::MergeError).await,
            "settlement/directive-error" => {
                fixtures::settlement(SettlementKind::DirectiveError).await
            }
            "settlement/single-writer" => fixtures::settlement(SettlementKind::SingleWriter).await,
            "settlement/multi-error" => fixtures::settlement(SettlementKind::MultiError).await,
            _ => unreachable!("scenario selections are fixed"),
        };
        let report = result.unwrap_or_else(|error| CaseReport::failed_to_start(case, &error));
        report.write(writer)?;
        if report.passed() {
            passed += 1;
        } else {
            failed += 1;
        }
    }
    if matches!(scenario, Scenario::All) {
        writeln!(
            writer,
            "summary cases={} passed={passed} failed={failed}",
            cases.len()
        )?;
    }
    if failed == 0 {
        Ok(())
    } else {
        Err(Error::CheckFailed)
    }
}
