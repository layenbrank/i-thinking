//! 租户守卫：进入租户作用域的**唯一**入口。
//!
//! 顺序是刻意的：先开事务、把租户写进作用域（`app.tenant_id`），再在作用域内读成员关系。
//! 于是「不是成员」查不到任何行，而不是先信任一个未授权租户里的角色字面量；
//! 之后业务代码只拿到带作用域的事务与已确定的身份（[`Principal`]），
//! 既不再自己拼 `tenantID = ?`，也不再自己比较角色。
//!
//! 权限判定一律交给 `authz`：守卫只负责「把身份准备好」和「把拒绝翻译成 HTTP」。

use authz::{Permission, require as require_permission};
use identity::{Principal, TenantContext, TenantId};
use sea_orm::DatabaseTransaction;

use crate::databases::database::Storage;
use crate::filters::exception::Exception;
use crate::guards::session::Session;
use crate::utils::code::{auth, external};

/// 已进入租户作用域的一次请求：事务 + 身份 + 当前租户。
///
/// 生命周期与请求绑定：写操作由调用方显式 [`commit`](Self::commit)，
/// 未提交（含出错返回）即随事务回滚，作用域变量也随之失效。
pub struct TenantCtx {
    tx: DatabaseTransaction,
    principal: Principal,
    tenant_id: TenantId,
}

impl TenantCtx {
    /// 进入既有租户：成员关系在作用域内读取，非成员一律拒绝。
    ///
    /// 平台管理员可以不持有成员身份（运维通道）：此时上下文里没有租户角色，
    /// `authz` 依平台角色放行，越过成员关系的那一步必须在业务侧留审计。
    ///
    /// # Errors
    /// 事务无法开启（500）、非成员且非平台管理员（403）。
    pub async fn enter(
        storage: &Storage,
        session: &Session,
        tenant_id: TenantId,
    ) -> Result<Self, Exception> {
        let tx = storage.tenant_tx(tenant_id).await.map_err(db_error)?;

        let membership = identity::persistence::membership(&tx, tenant_id, session.user_id())
            .await
            .map_err(persist_error)?;

        if membership.is_none() && !session.is_platform_admin() {
            return Err(Exception::custom(auth::ACCESS_DENIED, "非租户成员"));
        }

        let context = membership.unwrap_or_else(|| TenantContext::new(tenant_id));
        Ok(Self {
            tx,
            principal: session.principal().with_tenant(context),
            tenant_id,
        })
    }

    /// 创建新租户：作用域指向尚未落库的租户，调用者即为它的 Owner。
    ///
    /// 建租户是账号级能力（任何已认证账号都可以有租户），因此这里不做权限判定；
    /// 租户与首条成员关系都由 `tenant` 表的策略自约束在新建的作用域内。
    ///
    /// # Errors
    /// 事务无法开启（500）。
    pub async fn open_new(
        storage: &Storage,
        session: &Session,
        tenant_id: TenantId,
    ) -> Result<Self, Exception> {
        let tx = storage.tenant_tx(tenant_id).await.map_err(db_error)?;

        Ok(Self {
            tx,
            principal: session
                .principal()
                .with_tenant(TenantContext::owner(tenant_id)),
            tenant_id,
        })
    }

    /// 带作用域的事务；租户内的读写都从这里出发。
    #[must_use]
    pub const fn tx(&self) -> &DatabaseTransaction {
        &self.tx
    }

    /// 请求身份（含租户上下文）。
    #[must_use]
    pub const fn principal(&self) -> &Principal {
        &self.principal
    }

    /// 当前租户。
    #[must_use]
    pub const fn tenant_id(&self) -> TenantId {
        self.tenant_id
    }

    /// 校验权限；不通过即 403。
    ///
    /// # Errors
    /// `authz` 判定拒绝时返回 403（`auth::INSUFFICIENT_PERMISSIONS`）。
    pub fn require(&self, permission: Permission) -> Result<(), Exception> {
        require_permission(&self.principal, permission).map_err(|denied| {
            tracing::debug!(
                permission = %denied.permission,
                reason = %denied.reason,
                "租户权限不足"
            );
            Exception::custom(auth::INSUFFICIENT_PERMISSIONS, "权限不足")
        })
    }

    /// 提交事务；作用域随之结束。
    ///
    /// # Errors
    /// 提交失败返回 500（`external::DATABASE_ERROR`）。
    pub async fn commit(self) -> Result<(), Exception> {
        self.tx.commit().await.map_err(db_error)
    }
}

/// 数据库错误：日志留因，响应只给码。
fn db_error(err: sea_orm::DbErr) -> Exception {
    tracing::error!(error = %err, "tenant scope transaction failed");
    Exception::custom(external::DATABASE_ERROR, "数据库错误")
}

/// 身份数据不可读或不可识别：一律 500，不回退到「当成成员」。
fn persist_error(err: identity::PersistError) -> Exception {
    tracing::error!(error = %err, "tenant scope identity lookup failed");
    Exception::custom(external::DATABASE_ERROR, "数据库错误")
}
