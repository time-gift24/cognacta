use cognacta_core::*;
fn main() { let _ = RunContext::root("root".into(), 1, std::sync::Arc::new(std::cell::Cell::new(1))); }
