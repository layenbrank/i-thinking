use serde::{Deserialize, Deserializer, Serializer};
use std::str::FromStr;
use mongodb::bson::DateTime;

/// 将 DateTime 序列化为毫秒时间戳
pub fn to_ts<S>(dt: &DateTime, s: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    s.serialize_i64(dt.timestamp_millis())
}

/// 从时间戳或 BSON DateTime 反序列化为 DateTime
pub fn from_ts<'de, D>(d: D) -> Result<DateTime, D::Error>
where
    D: Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum DateTimeOrTs {
        DateTime(DateTime),
        Timestamp(i64),
    }

    match DateTimeOrTs::deserialize(d)? {
        DateTimeOrTs::DateTime(dt) => Ok(dt),
        DateTimeOrTs::Timestamp(ts) => Ok(DateTime::from_millis(ts)),
    }
}

/// 将 Option<DateTime> 序列化为可选的毫秒时间戳
pub fn to_ts_opt<S>(dt: &Option<DateTime>, s: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match dt {
        Some(d) => s.serialize_some(&d.timestamp_millis()),
        None => s.serialize_none(),
    }
}

/// 从可选的时间戳反序列化为 Option<DateTime>
pub fn from_ts_opt<'de, D>(d: D) -> Result<Option<DateTime>, D::Error>
where
    D: Deserializer<'de>,
{
    Option::<i64>::deserialize(d).map(|ts| ts.map(DateTime::from_millis))
}

/// 将字符串或数字反序列化为数字类型
pub fn from_str_or_num<'de, T, D>(d: D) -> Result<T, D::Error>
where
    T: FromStr + Deserialize<'de>,
    T::Err: std::fmt::Display,
    D: Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StrOrNum<T> {
        Str(String),
        Num(T),
    }

    match StrOrNum::<T>::deserialize(d)? {
        StrOrNum::Str(s) => s.parse().map_err(serde::de::Error::custom),
        StrOrNum::Num(n) => Ok(n),
    }
}
