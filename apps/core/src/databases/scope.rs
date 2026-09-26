use sea_orm::{
    ConnectionTrait, DatabaseBackend, DatabaseTransaction, DbErr, Statement, TransactionTrait,
};
use uuid::Uuid;

use super::database::Storage;

/// 会话级租户作用域变量：RLS 策略经 `app_current_tenant_id()` 读取它。
pub const TENANT_SETTING: &str = "app.tenant_id";

/// 在当前连接/事务上设定租户作用域。
///
/// 值以参数传入而非拼接 SQL；作用域是事务局部的，提交或回滚后自动失效，
/// 因此不会残留在池化连接上串到下一个请求。值非法时 `app_current_tenant_id()`
/// 返回 NULL，所有受保护的表都读不到行（fail-closed）。
pub async fn apply_tenant_scope<C>(conn: &C, tenant_id: Uuid) -> Result<(), DbErr>
where
    C: ConnectionTrait,
{
    conn.execute_raw(Statement::from_sql_and_values(
        DatabaseBackend::Postgres,
        "SELECT set_config($1, $2, true)",
        [TENANT_SETTING.into(), tenant_id.to_string().into()],
    ))
    .await?;
    Ok(())
}

impl Storage {
    /// 开启受租户作用域约束的事务。业务读写走这个入口，
    /// 无需再逐条手写 `tenantID = ?` 条件。
    pub async fn tenant_tx(&self, tenant_id: Uuid) -> Result<DatabaseTransaction, DbErr> {
        let tx = self.db.begin().await?;
        apply_tenant_scope(&tx, tenant_id).await?;
        Ok(tx)
    }
}
