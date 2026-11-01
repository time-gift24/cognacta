#[test]
fn state_derive_compile_contracts() {
    let tests = trybuild::TestCases::new();
    tests.pass("tests/derive/pass.rs");
    tests.pass("tests/derive/pass_hygiene.rs");
    tests.compile_fail("tests/derive/missing_reducer.rs");
    tests.compile_fail("tests/derive/unknown_initializer.rs");
    tests.compile_fail("tests/derive/duplicate_reducer.rs");
    tests.compile_fail("tests/derive/add_string.rs");
    tests.compile_fail("tests/derive/ambiguous_field.rs");
    tests.compile_fail("tests/derive/sort_comparator.rs");
    tests.compile_fail("tests/derive/not_send_sync.rs");
}

#[test]
fn graph_compile_contracts() {
    let tests = trybuild::TestCases::new();
    tests.pass("tests/graph/pass.rs");
    tests.compile_fail("tests/graph/missing_default.rs");
    tests.compile_fail("tests/graph/initializer_not_send.rs");
    tests.compile_fail("tests/graph/resource_not_sync.rs");
    tests.compile_fail("tests/graph/initializer_not_sync.rs");
}
