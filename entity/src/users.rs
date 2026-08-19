use sea_orm::entity::prelude::*;

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "users")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    #[sea_orm(unique, column_type = "Text")]
    pub username: String,
    #[sea_orm(column_type = "Text")]
    pub password: String,
    #[sea_orm(column_type = "Text", nullable)]
    pub email: Option<String>,
    pub age: Option<i32>,
    #[sea_orm(column_name = "createdAt")]
    pub created_at: DateTimeWithTimeZone,
    #[sea_orm(column_name = "updatedAt")]
    pub updated_at: DateTimeWithTimeZone,
    #[sea_orm(has_many)]
    pub uploads: HasMany<super::uploads::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}
