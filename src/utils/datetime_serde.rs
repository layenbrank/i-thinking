use serde::{Deserialize, Deserializer, Serializer};
use std::fmt::Display;
use std::str::FromStr;

/// 将字符串或数字反序列化为指定的数字类型
pub fn deserialize_string_or_number<'de, T, D>(deserializer: D) -> Result<T, D::Error>
where
    T: FromStr + Deserialize<'de>,
    T::Err: Display,
    D: Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StringOrNumber<T> {
        String(String),
        Number(T),
    }

    match StringOrNumber::<T>::deserialize(deserializer)? {
        StringOrNumber::String(s) => s.parse().map_err(serde::de::Error::custom),
        StringOrNumber::Number(n) => Ok(n),
    }
}

/// 将 MongoDB DateTime 序列化为毫秒时间戳
///
/// # 使用方式
/// ```rust
/// #[serde(serialize_with = "serialize_datetime")]
/// pub created_at: mongodb::bson::DateTime,
/// ```
pub fn serialize_datetime<S>(
    datetime: &mongodb::bson::DateTime,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    serializer.serialize_i64(datetime.timestamp_millis())
}

/// 从毫秒时间戳反序列化为 MongoDB DateTime
///
/// # 使用方式
/// ```rust
/// #[serde(deserialize_with = "deserialize_datetime")]
/// pub created_at: mongodb::bson::DateTime,
/// ```
pub fn deserialize_datetime<'de, D>(deserializer: D) -> Result<mongodb::bson::DateTime, D::Error>
where
    D: Deserializer<'de>,
{
    let timestamp = i64::deserialize(deserializer)?;
    Ok(mongodb::bson::DateTime::from_millis(timestamp))
}

/// 将可选的 MongoDB DateTime 序列化为可选的毫秒时间戳
///
/// # 使用方式
/// ```rust
/// #[serde(serialize_with = "serialize_optional_datetime")]
/// pub updated_at: Option<mongodb::bson::DateTime>,
/// ```
pub fn serialize_optional_datetime<S>(
    datetime: &Option<mongodb::bson::DateTime>,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match datetime {
        Some(dt) => serializer.serialize_some(&dt.timestamp_millis()),
        None => serializer.serialize_none(),
    }
}

/// 从可选的毫秒时间戳反序列化为可选的 MongoDB DateTime
///
/// # 使用方式
/// ```rust
/// #[serde(deserialize_with = "deserialize_optional_datetime")]
/// pub updated_at: Option<mongodb::bson::DateTime>,
/// ```
pub fn deserialize_optional_datetime<'de, D>(
    deserializer: D,
) -> Result<Option<mongodb::bson::DateTime>, D::Error>
where
    D: Deserializer<'de>,
{
    let timestamp: Option<i64> = Option::deserialize(deserializer)?;
    Ok(timestamp.map(mongodb::bson::DateTime::from_millis))
}
