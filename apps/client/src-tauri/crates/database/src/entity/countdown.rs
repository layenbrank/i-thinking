use sea_orm::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "countdown")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: String,

    #[sea_orm(column_name = "workStart")]
    pub work_start: String,

    #[sea_orm(column_name = "workEnd")]
    pub work_end: String,

    #[sea_orm(column_name = "workDays")]
    pub work_days: String,

    #[sea_orm(column_name = "monthlySalary")]
    pub monthly_salary: f64,

    #[sea_orm(column_name = "payDay")]
    pub pay_day: i32,

    #[sea_orm(column_name = "archivedAt")]
    pub archived_at: Option<i64>,

    #[sea_orm(column_name = "createdAt")]
    pub created_at: i64,

    #[sea_orm(column_name = "updatedAt")]
    pub updated_at: i64,
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Update {
    pub work_start: Option<String>,
    pub work_end: Option<String>,
    pub work_days: Option<String>,
    pub monthly_salary: Option<f64>,
    pub pay_day: Option<i32>,
}
