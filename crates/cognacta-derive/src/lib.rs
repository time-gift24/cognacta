use std::collections::HashMap;

use proc_macro::TokenStream;
use proc_macro2::Span;
use quote::{format_ident, quote};
use syn::{
    Data, DeriveInput, Expr, Fields, Ident, Token, Type, parse::Parse, parse::ParseStream,
    spanned::Spanned,
};

#[derive(Debug, thiserror::Error)]
enum Error {
    #[error(transparent)]
    Syn(#[from] syn::Error),
    #[error("{message}")]
    Diagnostic { message: String, span: Span },
}

impl Error {
    fn new(span: Span, message: impl Into<String>) -> Self {
        Self::Diagnostic {
            message: message.into(),
            span,
        }
    }

    fn into_compile_error(self) -> proc_macro2::TokenStream {
        match self {
            Self::Syn(error) => error.into_compile_error(),
            Self::Diagnostic { message, span } => {
                syn::Error::new(span, message).into_compile_error()
            }
        }
    }
}

struct ReducerAttribute {
    reducer: Type,
    init: Option<Expr>,
}

impl Parse for ReducerAttribute {
    fn parse(input: ParseStream<'_>) -> syn::Result<Self> {
        let reducer = input.parse()?;
        let init = if input.peek(Token![,]) {
            input.parse::<Token![,]>()?;
            input.parse::<Ident>()?;
            input.parse::<Token![=]>()?;
            Some(input.parse()?)
        } else {
            None
        };
        Ok(Self { reducer, init })
    }
}

#[proc_macro_derive(State, attributes(reducer))]
pub fn state(input: TokenStream) -> TokenStream {
    syn::parse(input)
        .map_err(Error::from)
        .and_then(expand)
        .unwrap_or_else(Error::into_compile_error)
        .into()
}

fn expand(input: DeriveInput) -> Result<proc_macro2::TokenStream, Error> {
    let name = input.ident;
    let visibility = input.vis;
    let fields = match input.data {
        Data::Struct(data) => match data.fields {
            Fields::Named(fields) => fields.named,
            fields => {
                return Err(Error::new(
                    fields.span(),
                    "State derive requires a struct with named fields",
                ));
            }
        },
        _ => {
            return Err(Error::new(
                name.span(),
                "State derive supports only structs with named fields",
            ));
        }
    };
    let delta_name = format_ident!("{name}Delta");
    let field_name = format_ident!("{name}Field");
    let generics = input.generics;
    let (impl_generics, type_generics, where_clause) = generics.split_for_impl();

    let mut metadata = Vec::with_capacity(fields.len());
    let mut identities = HashMap::new();
    for field in fields {
        let ident = field.ident.expect("named fields have identifiers");
        let attrs = field
            .attrs
            .iter()
            .filter(|attr| attr.path().is_ident("reducer"))
            .collect::<Vec<_>>();
        if attrs.len() != 1 {
            return Err(Error::new(
                field.ty.span(),
                "each State field requires exactly one #[reducer(...)] attribute",
            ));
        }
        let attr = attrs[0].parse_args::<ReducerAttribute>()?;
        let pascal = ident
            .to_string()
            .trim_start_matches("r#")
            .split('_')
            .filter(|part| !part.is_empty())
            .map(|part| {
                let mut chars = part.chars();
                chars
                    .next()
                    .map(|first| first.to_uppercase().collect::<String>() + chars.as_str())
                    .unwrap_or_default()
            })
            .collect::<String>();
        if pascal.is_empty() {
            return Err(Error::new(
                ident.span(),
                "field has no valid State identity",
            ));
        }
        let variant = format_ident!("{pascal}");
        if let Some(previous) = identities.insert(variant.clone(), ident.clone()) {
            return Err(Error::new(
                ident.span(),
                format!("field identity {variant} is already generated for {previous}"),
            ));
        }
        metadata.push((ident, field.ty, variant, attr));
    }

    let delta_fields = metadata.iter().map(|(ident, ty, _, attr)| {
        let reducer = &attr.reducer;
        quote!(#visibility #ident: Option<<#reducer as ::cognacta_core::Reducer<#ty>>::Delta>)
    });
    let field_variants = metadata.iter().map(|(_, _, variant, _)| variant);
    let field_metadata = metadata.iter().map(|(ident, ty, variant, attr)| {
        let reducer = &attr.reducer;
        let name = ident.to_string();
        quote! {
            ::cognacta_core::StateField {
                id: #field_name::#variant,
                name: #name,
                policy: <#reducer as ::cognacta_core::Reducer<#ty>>::POLICY,
            }
        }
    });

    let prechecks = metadata.iter().map(|(ident, ty, _, attr)| {
        let reducer = &attr.reducer;
        let name = ident.to_string();
        quote! {
            if <#reducer as ::cognacta_core::Reducer<#ty>>::POLICY
                == ::cognacta_core::WritePolicy::SingleWriter
                && deltas.iter().filter(|delta| delta.#ident.is_some()).count() > 1
            {
                conflicts.push(#name);
            }
        }
    });
    let staging = metadata.iter().map(|(ident, ty, _, attr)| {
        let reducer = &attr.reducer;
        let name = ident.to_string();
        let staged = format_ident!("__cognacta_staged_{ident}");
        let init = attr.init.as_ref().map_or_else(
            || quote!(<#reducer as ::core::default::Default>::default()),
            |init| quote!(#init),
        );
        quote! {
            let mut #staged: Option<#ty> = None;
            if deltas.iter().any(|delta| delta.#ident.is_some()) {
                let mut reducer: #reducer = #init;
                for delta in &mut deltas {
                    if let Some(update) = delta.#ident.take() {
                        let current = #staged.as_ref().unwrap_or(&self.#ident);
                        let next = ::cognacta_core::Reducer::reduce(&mut reducer, current, update)
                            .map_err(|error| match error {
                                ::cognacta_core::Error::Merge(
                                    ::cognacta_core::MergeError::Overflow { field: None }
                                ) => ::cognacta_core::Error::Merge(
                                    ::cognacta_core::MergeError::Overflow { field: Some(#name) }
                                ),
                                error => ::cognacta_core::Error::Merge(
                                    ::cognacta_core::MergeError::Reduce {
                                        field: Some(#name),
                                        source: Box::new(error),
                                    }
                                ),
                            })?;
                        #staged = Some(next);
                    }
                }
                if let Some(value) = #staged.take() {
                    let next = ::cognacta_core::Reducer::finish(reducer, value)
                        .map_err(|error| match error {
                            ::cognacta_core::Error::Merge(
                                ::cognacta_core::MergeError::Overflow { field: None }
                            ) => ::cognacta_core::Error::Merge(
                                ::cognacta_core::MergeError::Overflow { field: Some(#name) }
                            ),
                            error => ::cognacta_core::Error::Merge(
                                ::cognacta_core::MergeError::Finish {
                                    field: Some(#name),
                                    source: Box::new(error),
                                }
                            ),
                        })?;
                    #staged = Some(next);
                }
            }
        }
    });
    let assignments = metadata.iter().map(|(ident, _, _, _)| {
        let staged = format_ident!("__cognacta_staged_{ident}");
        quote! {
            if let Some(value) = #staged {
                self.#ident = value;
            }
        }
    });
    let field_idents = metadata
        .iter()
        .map(|(ident, _, _, _)| ident)
        .collect::<Vec<_>>();

    Ok(quote! {
        #[derive(Debug, Copy, Clone, Eq, PartialEq, Hash)]
        #visibility enum #field_name {
            #(#field_variants,)*
        }

        #visibility struct #delta_name #generics #where_clause {
            #(#delta_fields,)*
        }

        impl #impl_generics ::core::default::Default for #delta_name #type_generics #where_clause {
            fn default() -> Self {
                Self {
                    #(#field_idents: None,)*
                }
            }
        }

        impl #impl_generics ::cognacta_core::State for #name #type_generics #where_clause {
            type Delta = #delta_name #type_generics;
            type Field = #field_name;

            fn fields() -> &'static [::cognacta_core::StateField<Self::Field>] {
                &[#(#field_metadata,)*]
            }

            fn merge_batch(&mut self, mut deltas: Vec<Self::Delta>)
                -> ::core::result::Result<(), ::cognacta_core::Error>
            {
                let mut conflicts = Vec::new();
                #(#prechecks)*
                if !conflicts.is_empty() {
                    return Err(::cognacta_core::Error::Merge(
                        ::cognacta_core::MergeError::SingleWriterConflicts { fields: conflicts }
                    ));
                }
                #(#staging)*
                #(#assignments)*
                Ok(())
            }
        }
    })
}
