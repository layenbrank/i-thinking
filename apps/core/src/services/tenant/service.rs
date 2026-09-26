//! 租户与成员的业务编排。
//!
//! 读写一律发生在**已进入租户作用域**的事务里（[`TenantCtx`]），查询条件里不再出现
//! `tenantID = ?`：作用域由守卫建立、行级安全兜底。这里只做三件事——把 wire 入参解析成
//! 领域入参、把领域结果映射成 wire 出参、把失败翻译成契约错误码；「能不能做」交给 `authz`。

use sea_orm::DbErr;
use uuid::Uuid;

use authz::{Action, Permission, Resource};
use identity::tenant::{
    self as tenants, Member, MemberChanges, Tenant as TenantRecord, TenantChanges, TenantDraft,
    TenantType,
};
use identity::{AccountStatus, PersistError, TenantId, TenantRole, UserId};

use crate::databases::database::Storage;
use crate::filters::exception::Exception;
use crate::guards::session::Session;
use crate::guards::tenant::TenantCtx;
use crate::services::tenant::schema::{
    MemberR, MemberUpdateP, MemberWriteP, TenantR, TenantRole as WireRole, TenantUpdateP,
    TenantWriteP,
};
use crate::utils::code::{auth as auth_codes, business, external, request, resource};
use crate::utils::db::is_unique_violation;

/// 读租户本身（成员均可）。
const READ_TENANT: Permission = Permission::new(Resource::Tenant, Action::Read);
/// 管理租户本身（改名、停用、删除）：仅 Owner。
const MANAGE_TENANT: Permission = Permission::new(Resource::Tenant, Action::Manage);
/// 读成员名单（成员均可）。
const READ_MEMBER: Permission = Permission::new(Resource::Member, Action::Read);
/// 增改成员：Owner / Admin。
const WRITE_MEMBER: Permission = Permission::new(Resource::Member, Action::Write);
/// 移除成员：Owner / Admin。
const DELETE_MEMBER: Permission = Permission::new(Resource::Member, Action::Delete);

#[derive(Debug, thiserror::Error)]
pub enum TenantError {
    #[error("Tenant not found")]
    NotFound,
    #[error("Slug already exists")]
    SlugTaken,
    #[error("User not found")]
    UserNotFound,
    #[error("Already a member")]
    AlreadyMember,
    #[error("Not a member")]
    NotMember,
    #[error("Insufficient permission")]
    Forbidden,
    #[error("Invalid parameter: {0}")]
    BadParam(String),
    #[error("Database error: {0}")]
    Db(String),
}

impl From<TenantError> for Exception {
    fn from(err: TenantError) -> Self {
        match err {
            TenantError::NotFound => Exception::custom(resource::NOT_FOUND, "租户不存在"),
            TenantError::SlugTaken => Exception::custom(resource::ALREADY_EXISTS, "租户标识已存在"),
            TenantError::UserNotFound => Exception::custom(business::user::NOT_FOUND, "用户不存在"),
            TenantError::AlreadyMember => {
                Exception::custom(resource::ALREADY_EXISTS, "该用户已是成员")
            }
            TenantError::NotMember => Exception::custom(auth_codes::ACCESS_DENIED, "非租户成员"),
            TenantError::Forbidden => {
                Exception::custom(auth_codes::INSUFFICIENT_PERMISSIONS, "权限不足")
            }
            TenantError::BadParam(msg) => Exception::custom(request::INVALID_PARAMETER_VALUE, msg),
            TenantError::Db(msg) => {
                tracing::error!(error = %msg, "tenant database error");
                Exception::custom(external::DATABASE_ERROR, "数据库错误")
            }
        }
    }
}

pub struct TenantService;

impl TenantService {
    /// 新建租户：调用者是它的 Owner。
    ///
    /// 标识由调用方生成并已写进作用域，这里直接用——租户行与首条成员关系都必须落在
    /// 当前作用域内，因此两者由 `identity` 一起写。
    pub async fn create(ctx: &TenantCtx, req: TenantWriteP) -> Result<TenantR, TenantError> {
        let name = normalized_name(&req.name)?;
        let slug = normalized_slug(&req.slug)?;
        let tenant_type = match req.r#type.as_deref() {
            Some(value) => parse_tenant_type(value)?,
            None => TenantType::Personal,
        };

        let draft = TenantDraft {
            id: ctx.tenant_id(),
            name,
            slug,
            tenant_type,
        };
        let tenant = tenants::create_owned(ctx.tx(), draft, ctx.principal().user_id())
            .await
            .map_err(|err| conflict(err, TenantError::SlugTaken))?;

        Ok(tenant_to_r(&tenant))
    }

    /// 我参与的有效成员关系覆盖到的租户（账号作用域，跨租户只读）。
    ///
    /// 还没有选定租户，因此走 `user_tx`：成员表只放行自己的行，租户表只放行
    /// 「我是其有效成员」的行。
    pub async fn list(storage: &Storage, session: &Session) -> Result<Vec<TenantR>, TenantError> {
        let tx = storage.user_tx(session.user_id()).await.map_err(db_err)?;
        let tenants = tenants::list_for_user(&tx, session.user_id())
            .await
            .map_err(persist_err)?;

        Ok(tenants.iter().map(tenant_to_r).collect())
    }

    /// 读租户本身。
    pub async fn get(ctx: &TenantCtx) -> Result<TenantR, TenantError> {
        authorize(ctx, READ_TENANT)?;
        let tenant = tenants::find(ctx.tx(), ctx.tenant_id())
            .await
            .map_err(persist_err)?
            .ok_or(TenantError::NotFound)?;

        Ok(tenant_to_r(&tenant))
    }

    /// 改租户本身：仅 Owner。
    pub async fn update(ctx: &TenantCtx, req: TenantUpdateP) -> Result<TenantR, TenantError> {
        authorize(ctx, MANAGE_TENANT)?;
        let changes = TenantChanges {
            name: req.name.as_deref().map(normalized_name).transpose()?,
            status: req.status.as_deref().map(parse_status).transpose()?,
            tenant_type: req.r#type.as_deref().map(parse_tenant_type).transpose()?,
        };

        let tenant = tenants::update(
            ctx.tx(),
            ctx.tenant_id(),
            changes,
            ctx.principal().user_id(),
        )
        .await
        .map_err(persist_err)?
        .ok_or(TenantError::NotFound)?;

        Ok(tenant_to_r(&tenant))
    }

    /// 删除租户：仅 Owner。成员关系随外键级联删除。
    pub async fn remove(ctx: &TenantCtx) -> Result<(), TenantError> {
        authorize(ctx, MANAGE_TENANT)?;
        let removed = tenants::delete(ctx.tx(), ctx.tenant_id())
            .await
            .map_err(persist_err)?;

        if removed {
            Ok(())
        } else {
            Err(TenantError::NotFound)
        }
    }

    /// 成员名单（含已停用成员）。
    pub async fn list_members(ctx: &TenantCtx) -> Result<Vec<MemberR>, TenantError> {
        authorize(ctx, READ_MEMBER)?;
        let members = tenants::members(ctx.tx(), ctx.tenant_id())
            .await
            .map_err(persist_err)?;

        Ok(members.iter().map(member_to_r).collect())
    }

    /// 新增成员：账号必须存在，重复成员由唯一索引拒绝。
    pub async fn add_member(ctx: &TenantCtx, req: MemberWriteP) -> Result<MemberR, TenantError> {
        authorize(ctx, WRITE_MEMBER)?;
        let user = parse_user_id(&req.user_id)?;
        let role = parse_role(&req.role)?;

        let account = identity::persistence::find_account(ctx.tx(), user)
            .await
            .map_err(persist_err)?;
        if account.is_none() {
            return Err(TenantError::UserNotFound);
        }

        let member = tenants::add_member(
            ctx.tx(),
            ctx.tenant_id(),
            user,
            role,
            ctx.principal().user_id(),
        )
        .await
        .map_err(|err| conflict(err, TenantError::AlreadyMember))?;

        Ok(member_to_r(&member))
    }

    /// 改成员的角色或状态。
    pub async fn update_member(
        ctx: &TenantCtx,
        user: UserId,
        req: MemberUpdateP,
    ) -> Result<MemberR, TenantError> {
        authorize(ctx, WRITE_MEMBER)?;
        let changes = MemberChanges {
            role: req.role.as_deref().map(parse_role).transpose()?,
            status: req.status.as_deref().map(parse_status).transpose()?,
        };

        let member = tenants::update_member(
            ctx.tx(),
            ctx.tenant_id(),
            user,
            changes,
            ctx.principal().user_id(),
        )
        .await
        .map_err(persist_err)?
        .ok_or(TenantError::NotFound)?;

        Ok(member_to_r(&member))
    }

    /// 移除成员。
    pub async fn remove_member(ctx: &TenantCtx, user: UserId) -> Result<(), TenantError> {
        authorize(ctx, DELETE_MEMBER)?;
        let removed = tenants::remove_member(ctx.tx(), ctx.tenant_id(), user)
            .await
            .map_err(persist_err)?;

        if removed {
            Ok(())
        } else {
            Err(TenantError::NotFound)
        }
    }

    /// 校验成员关系并返回租户内角色；平台管理员旁路。
    ///
    /// 迁移遗留：订阅 / 支付 / 网关仍是「先取角色、再自己比大小」的老写法，
    /// 本方法保持原签名只为让它们继续编译。新代码用 [`TenantCtx::require`] 判定权限。
    pub async fn require_role(
        storage: &Storage,
        user_id: Uuid,
        tenant_id: Uuid,
        platform_admin: bool,
    ) -> Result<WireRole, TenantError> {
        if platform_admin {
            return Ok(WireRole::from_domain(identity::platform_operator_role()));
        }

        Self::membership_role(storage, user_id, tenant_id)
            .await?
            .ok_or(TenantError::NotMember)
    }

    /// 账号在租户内的有效成员角色；不是成员（或没有角色）返回 `None`。
    pub async fn membership_role(
        storage: &Storage,
        user_id: Uuid,
        tenant_id: Uuid,
    ) -> Result<Option<WireRole>, TenantError> {
        let tenant_id = TenantId::from_uuid(tenant_id);
        let user_id = UserId::from_uuid(user_id);

        let tx = storage.tenant_tx(tenant_id).await.map_err(db_err)?;
        let membership = identity::persistence::membership(&tx, tenant_id, user_id)
            .await
            .map_err(persist_err)?;

        Ok(membership
            .and_then(|context| context.role())
            .map(WireRole::from_domain))
    }
}

/// 权限判定：`authz` 拒绝一律 403（判定原因已由守卫记入日志）。
fn authorize(ctx: &TenantCtx, permission: Permission) -> Result<(), TenantError> {
    ctx.require(permission).map_err(|_| TenantError::Forbidden)
}

fn tenant_to_r(tenant: &TenantRecord) -> TenantR {
    TenantR {
        id: tenant.id().to_string(),
        name: tenant.name().to_owned(),
        slug: tenant.slug().to_owned(),
        status: tenant.status().as_str().to_owned(),
        r#type: tenant.tenant_type().as_str().to_owned(),
        created_at: tenant.created_at_ms(),
        updated_at: tenant.updated_at_ms(),
    }
}

fn member_to_r(member: &Member) -> MemberR {
    MemberR {
        id: member.row_id().to_string(),
        tenant_id: member.tenant_id().to_string(),
        user_id: member.user_id().to_string(),
        role: member.role().as_str().to_owned(),
        status: member.status().as_str().to_owned(),
    }
}

/// 租户名称：去空白，空即拒绝。
fn normalized_name(value: &str) -> Result<String, TenantError> {
    let name = value.trim();
    if name.is_empty() {
        return Err(TenantError::BadParam("租户名称不能为空".to_string()));
    }

    Ok(name.to_owned())
}

/// 租户标识：去空白 + 转小写，只允许小写字母 / 数字 / 中划线。
fn normalized_slug(value: &str) -> Result<String, TenantError> {
    let slug = value.trim().to_ascii_lowercase();
    let valid = !slug.is_empty()
        && slug
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-');
    if valid {
        Ok(slug)
    } else {
        Err(TenantError::BadParam(
            "租户标识须为小写字母/数字/中划线".to_string(),
        ))
    }
}

fn parse_role(value: &str) -> Result<TenantRole, TenantError> {
    value
        .parse::<TenantRole>()
        .map_err(|_| TenantError::BadParam("角色无效".to_string()))
}

fn parse_status(value: &str) -> Result<AccountStatus, TenantError> {
    value
        .parse::<AccountStatus>()
        .map_err(|_| TenantError::BadParam("状态无效".to_string()))
}

fn parse_tenant_type(value: &str) -> Result<TenantType, TenantError> {
    value
        .parse::<TenantType>()
        .map_err(|_| TenantError::BadParam("租户类型无效".to_string()))
}

fn parse_user_id(value: &str) -> Result<UserId, TenantError> {
    value
        .parse::<UserId>()
        .map_err(|_| TenantError::BadParam("用户 ID 无效".to_string()))
}

/// 作用域事务开启失败（500）。
fn db_err(err: DbErr) -> TenantError {
    TenantError::Db(err.to_string())
}

/// 身份数据不可读（500）；字面量识别不了也走这里，不降级成「不是成员」。
fn persist_err(err: PersistError) -> TenantError {
    TenantError::Db(err.to_string())
}

/// 唯一索引冲突归为 `taken`，其余仍是 500。
fn conflict(err: PersistError, taken: TenantError) -> TenantError {
    match err {
        PersistError::Db(db) if is_unique_violation(&db) => taken,
        other => persist_err(other),
    }
}
