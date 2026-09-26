//! 请求作用域：把「我在哪个租户 / 我是谁」写进当前事务，RLS 据此过滤行。
//!
//! 作用域是**事务局部**的（`set_config(..., true)`），提交或回滚后自动失效，
//! 因此不会残留在池化连接上串到下一个请求。作用域由守卫在进入业务逻辑前建立，
//! 业务代码只拿到已经带作用域的事务，不再自己拼 `tenantID = ?` 条件。

use identity::{TenantId, UserId};
use sea_orm::{
    ConnectionTrait, DatabaseBackend, DatabaseTransaction, DbErr, Statement, TransactionTrait,
};

use super::database::Storage;

/// 会话级租户作用域变量：RLS 策略经 `app_current_tenant_id()` 读取它。
pub const TENANT_SETTING: &str = "app.tenant_id";

/// 会话级账号作用域变量：RLS 策略经 `app_current_user_id()` 读取它，
/// 用于「跨租户、只读自己」的场景（例如列出我加入的租户、读我自己的成员行）。
pub const USER_SETTING: &str = "app.user_id";

/// 在当前连接/事务上设定作用域变量。
///
/// 值以参数传入而非拼接 SQL；值非法时对应的 `app_current_*()` 返回 NULL，
/// 受保护的表全部读不到行、写入被拒（fail-closed）。
async fn set_scope<C>(conn: &C, key: &str, value: &str) -> Result<(), DbErr>
where
    C: ConnectionTrait,
{
    conn.execute_raw(Statement::from_sql_and_values(
        DatabaseBackend::Postgres,
        "SELECT set_config($1, $2, true)",
        [key.into(), value.into()],
    ))
    .await?;
    Ok(())
}

/// 在当前连接/事务上设定租户作用域。
pub async fn apply_tenant_scope<C>(conn: &C, tenant_id: TenantId) -> Result<(), DbErr>
where
    C: ConnectionTrait,
{
    set_scope(conn, TENANT_SETTING, &tenant_id.to_string()).await
}

/// 在当前连接/事务上设定账号作用域。
pub async fn apply_user_scope<C>(conn: &C, user_id: UserId) -> Result<(), DbErr>
where
    C: ConnectionTrait,
{
    set_scope(conn, USER_SETTING, &user_id.to_string()).await
}

impl Storage {
    /// 开启受租户作用域约束的事务。租户内的读写走这个入口。
    pub async fn tenant_tx(&self, tenant_id: TenantId) -> Result<DatabaseTransaction, DbErr> {
        let tx = self.db.begin().await?;
        apply_tenant_scope(&tx, tenant_id).await?;
        Ok(tx)
    }

    /// 开启只受账号作用域约束的事务：可读自己所属的租户与自己的成员行，
    /// 但没有租户作用域，写不进任何租户数据。
    pub async fn user_tx(&self, user_id: UserId) -> Result<DatabaseTransaction, DbErr> {
        let tx = self.db.begin().await?;
        apply_user_scope(&tx, user_id).await?;
        Ok(tx)
    }
}
