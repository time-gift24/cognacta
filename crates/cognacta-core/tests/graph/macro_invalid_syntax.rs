use cognacta_core::graph_input;

fn main() {
    let _ = graph_input! {
        entry: shared(1_usize, 2_usize),
    };
}
