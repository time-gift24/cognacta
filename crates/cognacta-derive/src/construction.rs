use std::collections::HashSet;

use proc_macro2::TokenStream;
use quote::{format_ident, quote};
use syn::{
    Expr, Ident, Token, Type, braced, bracketed,
    ext::IdentExt,
    parenthesized,
    parse::{Parse, ParseStream},
};

pub(crate) struct GraphDefinition {
    state: Type,
    output: Type,
    resources: Option<Type>,
    nodes: Vec<NodeDeclaration>,
    edges: Vec<EdgeDeclaration>,
    entries: Vec<Ident>,
    initializer: Option<Expr>,
    return_node: Ident,
}

struct NodeDeclaration {
    name: Ident,
    instance: Expr,
    methods: Vec<TokenStream>,
}

struct EdgeDeclaration {
    source: Ident,
    target: Ident,
    when: Option<Expr>,
}

impl Parse for GraphDefinition {
    fn parse(input: ParseStream<'_>) -> syn::Result<Self> {
        expect_named(input, "state")?;
        input.parse::<Token![:]>()?;
        let state = input.parse()?;
        input.parse::<Token![,]>()?;
        expect_named(input, "output")?;
        input.parse::<Token![:]>()?;
        let output = input.parse()?;
        input.parse::<Token![,]>()?;
        let resources = if peek_named(input, "resources") {
            expect_named(input, "resources")?;
            input.parse::<Token![:]>()?;
            let resources = input.parse()?;
            input.parse::<Token![,]>()?;
            Some(resources)
        } else {
            None
        };
        expect_named(input, "nodes")?;
        let content;
        braced!(content in input);
        let nodes = parse_nodes(&content)?;
        if input.peek(Token![,]) {
            input.parse::<Token![,]>()?;
        }
        let mut edges = Vec::new();
        let mut entries = Vec::new();
        let mut initializer = None;
        while !input.peek(Token![return]) {
            if input.is_empty() {
                return Err(input.error("expected `return`"));
            }
            if peek_named(input, "edges") {
                expect_named(input, "edges")?;
                let content;
                braced!(content in input);
                edges = parse_edges(&content)?;
            } else if peek_named(input, "entries") {
                expect_named(input, "entries")?;
                let content;
                bracketed!(content in input);
                entries = content
                    .parse_terminated(Ident::parse, Token![,])?
                    .into_iter()
                    .collect();
            } else if peek_named(input, "init") {
                expect_named(input, "init")?;
                input.parse::<Token![:]>()?;
                initializer = Some(input.parse()?);
            } else {
                return Err(input.error("expected `edges`, `entries`, `init`, or `return`"));
            }
            if input.peek(Token![,]) {
                input.parse::<Token![,]>()?;
            }
        }
        input.parse::<Token![return]>()?;
        let return_node = input.parse()?;
        input.parse::<Token![;]>()?;
        if !input.is_empty() {
            return Err(input.error("unexpected tokens after graph declaration"));
        }
        Ok(Self {
            state,
            output,
            resources,
            nodes,
            edges,
            entries,
            initializer,
            return_node,
        })
    }
}

fn parse_nodes(input: ParseStream<'_>) -> syn::Result<Vec<NodeDeclaration>> {
    let mut nodes = Vec::new();
    while !input.is_empty() {
        let name = input.parse()?;
        input.parse::<Token![:]>()?;
        let instance = input.parse()?;
        let mut methods = Vec::new();
        if input.peek(Token![=>]) {
            input.parse::<Token![=>]>()?;
            while input.peek(Token![.]) {
                input.parse::<Token![.]>()?;
                let method: Ident = input.parse()?;
                let content;
                parenthesized!(content in input);
                let arguments = content.parse_terminated(Expr::parse, Token![,])?;
                methods.push(quote!(.#method(#arguments)));
            }
            if methods.is_empty() {
                return Err(input.error("expected at least one Node method after `=>`"));
            }
        }
        nodes.push(NodeDeclaration {
            name,
            instance,
            methods,
        });
        if input.is_empty() {
            break;
        }
        input.parse::<Token![,]>()?;
    }
    Ok(nodes)
}

fn parse_edges(input: ParseStream<'_>) -> syn::Result<Vec<EdgeDeclaration>> {
    let mut edges = Vec::new();
    while !input.is_empty() {
        let source = input.parse()?;
        input.parse::<Token![->]>()?;
        let target = input.parse()?;
        let when = if peek_named(input, "when") {
            expect_named(input, "when")?;
            Some(input.parse()?)
        } else {
            None
        };
        edges.push(EdgeDeclaration {
            source,
            target,
            when,
        });
        if input.is_empty() {
            break;
        }
        input.parse::<Token![,]>()?;
    }
    Ok(edges)
}

pub(crate) fn expand_graph(input: GraphDefinition) -> Result<TokenStream, crate::Error> {
    let mut names = HashSet::new();
    for node in &input.nodes {
        if !names.insert(node.name.unraw().to_string()) {
            return Err(crate::Error::new(
                node.name.span(),
                format!("duplicate graph node `{}`", node.name.unraw()),
            ));
        }
    }
    let declarations = input.nodes.iter().map(|node| {
        let variable = node_variable(&node.name);
        let id = node.name.unraw().to_string();
        quote!(let #variable = ::cognacta_core::NodeId::new(#id);)
    });
    let nodes = input.nodes.iter().map(|node| {
        let variable = node_variable(&node.name);
        let instance = &node.instance;
        let methods = &node.methods;
        quote!(::cognacta_core::Node::new(#variable.clone(), #instance) #(#methods)*)
    });
    let edges = input.edges.iter().map(|edge| {
        let source = node_variable(&edge.source);
        let target = node_variable(&edge.target);
        let when = edge.when.as_ref().map_or_else(
            || quote!(::core::option::Option::None),
            |when| quote!(::core::option::Option::Some(::std::sync::Arc::new(#when))),
        );
        quote!(::cognacta_core::Edge {
            source: #source.clone(),
            target: #target.clone(),
            when: #when,
        })
    });
    let entries = input.entries.iter().map(|entry| {
        let variable = node_variable(entry);
        quote!(#variable.clone())
    });
    let return_node = node_variable(&input.return_node);
    let state = &input.state;
    let output = &input.output;
    let graph_type = input.resources.as_ref().map_or_else(
        || quote!(::cognacta_core::Graph::<#state, #output>),
        |resources| quote!(::cognacta_core::Graph::<#state, #output, #resources>),
    );
    let builder = if input.initializer.is_some() {
        quote!(#graph_type::builder_with_initializer())
    } else {
        quote!(#graph_type::builder())
    };
    let initializer = input
        .initializer
        .map(|initializer| quote!(.state_initializer(#initializer)));
    Ok(quote!({
        #(#declarations)*
        #builder
            .nodes(::std::vec![#(#nodes),*])
            .edges(::std::vec![#(#edges),*])
            .entries(::std::vec![#(#entries),*])
            .return_node(#return_node)
            #initializer
            .build()
    }))
}

fn node_variable(name: &Ident) -> Ident {
    format_ident!("__cognacta_node_{}", name.unraw(), span = name.span())
}

pub(crate) struct GraphInputDefinition {
    entries: Vec<InputEntry>,
}

struct InputEntry {
    name: Ident,
    values: Vec<InputValue>,
}

enum InputValue {
    New(Expr),
    Shared(Expr),
}

impl Parse for GraphInputDefinition {
    fn parse(input: ParseStream<'_>) -> syn::Result<Self> {
        let mut entries = Vec::new();
        while !input.is_empty() {
            let name = input.parse()?;
            input.parse::<Token![:]>()?;
            let values = if input.peek(syn::token::Bracket) {
                let content;
                bracketed!(content in input);
                content
                    .parse_terminated(InputValue::parse, Token![,])?
                    .into_iter()
                    .collect()
            } else {
                vec![input.parse()?]
            };
            entries.push(InputEntry { name, values });
            if input.is_empty() {
                break;
            }
            input.parse::<Token![,]>()?;
        }
        Ok(Self { entries })
    }
}

impl Parse for InputValue {
    fn parse(input: ParseStream<'_>) -> syn::Result<Self> {
        if input.peek(Ident) {
            let fork = input.fork();
            let name: Ident = fork.parse()?;
            if name == "shared" && fork.peek(syn::token::Paren) {
                input.parse::<Ident>()?;
                let content;
                parenthesized!(content in input);
                let value = content.parse()?;
                if !content.is_empty() {
                    return Err(content.error("expected one shared value"));
                }
                return Ok(Self::Shared(value));
            }
        }
        Ok(Self::New(input.parse()?))
    }
}

pub(crate) fn expand_graph_input(input: GraphInputDefinition) -> Result<TokenStream, crate::Error> {
    let mut names = HashSet::new();
    for entry in &input.entries {
        if !names.insert(entry.name.unraw().to_string()) {
            return Err(crate::Error::new(
                entry.name.span(),
                format!("duplicate graph input `{}`", entry.name.unraw()),
            ));
        }
    }
    let entries = input.entries.iter().map(|entry| {
        let id = entry.name.unraw().to_string();
        let values = entry.values.iter().map(|value| match value {
            InputValue::New(value) => quote!({
                let value: ::cognacta_core::SharedValue = ::std::sync::Arc::new(#value);
                value
            }),
            InputValue::Shared(value) => quote!({
                let value: ::cognacta_core::SharedValue = #value;
                value
            }),
        });
        quote!((
            ::cognacta_core::NodeId::new(#id),
            ::cognacta_core::Input::new(::std::vec![#(#values),*]),
        ))
    });
    Ok(quote!(::cognacta_core::GraphInput::new(
        ::std::collections::HashMap::from([#(#entries),*])
    )))
}

fn expect_named(input: ParseStream<'_>, expected: &str) -> syn::Result<Ident> {
    let name: Ident = input.parse()?;
    if name == expected {
        Ok(name)
    } else {
        Err(syn::Error::new(
            name.span(),
            format!("expected `{expected}`"),
        ))
    }
}

fn peek_named(input: ParseStream<'_>, expected: &str) -> bool {
    input.peek(Ident)
        && input
            .fork()
            .parse::<Ident>()
            .is_ok_and(|name| name == expected)
}
