use std::collections::HashMap;

use proc_macro::TokenStream;
use proc_macro2::Span;
use quote::{format_ident, quote};
use syn::{
    Data, DeriveInput, Expr, Fields, Ident, Token, Type, ext::IdentExt, parse::Parse,
    parse::ParseStream, spanned::Spanned, visit_mut::VisitMut,
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
            let name = input.parse::<Ident>()?;
            if name != "init" {
                return Err(syn::Error::new(name.span(), "expected `init`"));
            }
            input.parse::<Token![=]>()?;
            Some(input.parse()?)
        } else {
            None
        };
        Ok(Self { reducer, init })
    }
}

struct StateSelf(syn::Path);

impl VisitMut for StateSelf {
    // Nested items have their own Self, independent of the surrounding State.
    fn visit_item_mut(&mut self, _item: &mut syn::Item) {}

    fn visit_path_mut(&mut self, path: &mut syn::Path) {
        syn::visit_mut::visit_path_mut(self, path);
        if path.leading_colon.is_none()
            && path
                .segments
                .first()
                .is_some_and(|segment| segment.ident == "Self")
        {
            let mut replacement = self.0.clone();
            replacement
                .segments
                .extend(path.segments.iter().skip(1).cloned());
            *path = replacement;
        }
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
    let delta_name = format_ident!("{}Delta", name.unraw(), span = Span::call_site());
    let field_name = format_ident!("{}Field", name.unraw(), span = Span::call_site());
    let generics = input.generics;
    let (impl_generics, type_generics, where_clause) = generics.split_for_impl();
    let mut state_path: syn::Path = syn::parse_quote!(#name #type_generics);
    if let syn::PathArguments::AngleBracketed(arguments) = &mut state_path
        .segments
        .last_mut()
        .expect("state type has a name")
        .arguments
    {
        arguments.colon2_token = Some(Default::default());
    }
    let mut state_self = StateSelf(state_path);
    let mut delta_generics = generics.clone();
    state_self.visit_generics_mut(&mut delta_generics);
    let (delta_impl_generics, _, delta_where_clause) = delta_generics.split_for_impl();

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
        let mut variant = syn::parse_str::<Ident>(&pascal)
            .or_else(|_| syn::parse_str::<Ident>(&format!("_{pascal}")))
            .map_err(|_| Error::new(ident.span(), "field has no valid State identity"))?;
        variant.set_span(ident.span());
        if let Some(previous) = identities.insert(variant.clone(), ident.clone()) {
            return Err(Error::new(
                ident.span(),
                format!("field identity {variant} is already generated for {previous}"),
            ));
        }
        metadata.push((ident, field.ty, variant, attr));
    }

    let delta_fields = metadata.iter().map(|(ident, ty, _, attr)| {
        let mut ty = ty.clone();
        let mut reducer = attr.reducer.clone();
        state_self.visit_type_mut(&mut ty);
        state_self.visit_type_mut(&mut reducer);
        quote!(#visibility #ident: ::core::option::Option<<#reducer as ::cognacta_core::Reducer<#ty>>::Delta>)
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
    let mut staging = Vec::new();
    let mut reductions = Vec::new();
    let mut finishes = Vec::new();
    let mut assignments = Vec::new();
    for (index, (ident, ty, _, attr)) in metadata.iter().enumerate() {
        let reducer = &attr.reducer;
        let name = ident.to_string();
        let staged = format_ident!("__cognacta_staged_{index}");
        let instance = format_ident!("__cognacta_reducer_{index}");
        let init = attr.init.as_ref().map_or_else(
            || quote!(<#reducer as ::core::default::Default>::default()),
            |init| quote!(#init),
        );
        staging.push(quote! {
            let mut #staged: ::core::option::Option<#ty> = ::core::option::Option::None;
            let mut #instance: ::core::option::Option<#reducer> =
                if deltas.iter().any(|delta| delta.#ident.is_some()) {
                    ::core::option::Option::Some(#init)
                } else {
                    ::core::option::Option::None
                };
        });
        reductions.push(quote! {
            if let ::core::option::Option::Some(update) = __cognacta_delta.#ident {
                let current = #staged.as_ref().unwrap_or(&self.#ident);
                let next = ::cognacta_core::Reducer::reduce(
                    #instance.as_mut().expect("updated field has a reducer"), current, update
                ).map_err(|error| match error {
                    ::cognacta_core::Error::Merge(
                        ::cognacta_core::MergeError::Overflow { field: ::core::option::Option::None }
                    ) => ::cognacta_core::Error::Merge(
                        ::cognacta_core::MergeError::Overflow { field: ::core::option::Option::Some(#name) }
                    ),
                    error => ::cognacta_core::Error::Merge(
                        ::cognacta_core::MergeError::Reduce {
                            field: ::core::option::Option::Some(#name),
                            source: ::std::boxed::Box::new(error),
                        }
                    ),
                })?;
                #staged = ::core::option::Option::Some(next);
            }
        });
        finishes.push(quote! {
            if let (::core::option::Option::Some(reducer), ::core::option::Option::Some(value)) =
                (#instance, #staged.take())
            {
                let next = ::cognacta_core::Reducer::finish(reducer, value)
                    .map_err(|error| match error {
                        ::cognacta_core::Error::Merge(
                            ::cognacta_core::MergeError::Overflow { field: ::core::option::Option::None }
                        ) => ::cognacta_core::Error::Merge(
                            ::cognacta_core::MergeError::Overflow { field: ::core::option::Option::Some(#name) }
                        ),
                        error => ::cognacta_core::Error::Merge(
                            ::cognacta_core::MergeError::Finish {
                                field: ::core::option::Option::Some(#name),
                                source: ::std::boxed::Box::new(error),
                            }
                        ),
                    })?;
                #staged = ::core::option::Option::Some(next);
            }
        });
        assignments.push(quote! {
            if let ::core::option::Option::Some(value) = #staged {
                self.#ident = value;
            }
        });
    }
    let field_idents = metadata
        .iter()
        .map(|(ident, _, _, _)| ident)
        .collect::<Vec<_>>();

    Ok(quote! {
        #[derive(
            ::core::fmt::Debug, ::core::marker::Copy, ::core::clone::Clone,
            ::core::cmp::Eq, ::core::cmp::PartialEq, ::core::hash::Hash,
        )]
        #visibility enum #field_name {
            #(#field_variants,)*
        }

        #visibility struct #delta_name #delta_generics #delta_where_clause {
            #(#delta_fields,)*
        }

        impl #delta_impl_generics ::core::default::Default for #delta_name #type_generics #delta_where_clause {
            fn default() -> Self {
                Self {
                    #(#field_idents: ::core::option::Option::None,)*
                }
            }
        }

        impl #impl_generics ::cognacta_core::State for #name #type_generics #where_clause {
            type Delta = #delta_name #type_generics;
            type Field = #field_name;

            fn fields() -> &'static [::cognacta_core::StateField<Self::Field>] {
                &[#(#field_metadata,)*]
            }

            fn merge_batch(&mut self, deltas: ::std::vec::Vec<Self::Delta>)
                -> ::core::result::Result<(), ::cognacta_core::Error>
            {
                let mut conflicts = ::std::vec::Vec::new();
                #(#prechecks)*
                if !conflicts.is_empty() {
                    return ::core::result::Result::Err(::cognacta_core::Error::Merge(
                        ::cognacta_core::MergeError::SingleWriterConflicts { fields: conflicts }
                    ));
                }
                #(#staging)*
                for __cognacta_delta in deltas {
                    #(#reductions)*
                }
                #(#finishes)*
                #(#assignments)*
                ::core::result::Result::Ok(())
            }
        }
    })
}
