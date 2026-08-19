pub use sea_orm_migration::prelude::*;

mod m20260819_000001_init_schema;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migration_table_name() -> sea_orm::DynIden {
        "migration".into_iden()
    }

    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![Box::new(m20260819_000001_init_schema::Migration)]
    }
}
