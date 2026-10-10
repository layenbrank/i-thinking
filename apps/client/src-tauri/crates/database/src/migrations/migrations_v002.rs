//! 磁贴组件改名：`intelligence` → `agent`。
//!
//! `MagneticTile.Component` 的成员在 shared 里重命名（见
//! `packages/shared/src/types/magnetic-tile.d.ts`），历史行仍写着旧名，
//! 不转换就会落到「未登记组件」分支、在镜像里静默消失。
//!
//! 只改组件名，不动 updatedAt：避免扰动镜像/同步的排序与增量判定。
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            "UPDATE \"magneticTile\" SET \"component\" = 'agent' WHERE \"component\" = 'intelligence'",
        )
        .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            "UPDATE \"magneticTile\" SET \"component\" = 'intelligence' WHERE \"component\" = 'agent'",
        )
        .await?;
        Ok(())
    }
}
