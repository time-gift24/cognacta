use serde::{Serialize, de::DeserializeOwned};

use crate::{Error, EventLogError, JsonValue};

pub(crate) fn encode<T: Serialize + ?Sized>(value: &T) -> Result<JsonValue, Error> {
    serde_json::to_value(value).map_err(|source| {
        EventLogError::Encode {
            source: Box::new(source),
        }
        .into()
    })
}

pub(crate) fn decode<T: DeserializeOwned>(value: JsonValue) -> Result<T, Error> {
    serde_json::from_value(value).map_err(|source| {
        EventLogError::Decode {
            source: Box::new(source),
        }
        .into()
    })
}
