use chrono::Utc;
use entity::{auth, tenant, tenant_member};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use uuid::Uuid;

use crate::databases::database::Storage;
use crate::filters::exception::Exception;
use crate::services::tenant::schema::{
    MemberR, MemberUpdateP, MemberWriteP, TenantR, TenantRole, TenantType, TenantUpdateP,
    TenantWriteP,
};
use crate::utils::code::{auth as auth_codes, business, external, request, resource};
use crate::utils::db::is_unique_violation;

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
    pub async fn create(
        db: &Storage,
        user_id: Uuid,
        req: TenantWriteP,
    ) -> Result<TenantR, TenantError> {
        let slug = req.slug.trim().to_ascii_lowercase();
        validate_slug(&slug)?;
        if req.name.trim().is_empty() {
            return Err(TenantError::BadParam("租户名称不能为空".to_string()));
        }

        let taken = tenant::Entity::find()
            .filter(tenant::Column::Slug.eq(&slug))
            .one(&db.db)
            .await
            .map_err(db_err)?
            .is_some();
        if taken {
            return Err(TenantError::SlugTaken);
        }

        let now = Utc::now().fixed_offset();
        let model = tenant::ActiveModel {
            id: Set(Uuid::new_v4()),
            name: Set(req.name.trim().to_string()),
            slug: Set(slug),
            status: Set("ACTIVE".to_string()),
            tenant_type: Set(parse_type(req.r#type.as_deref())?),
            archived_at: Set(None),
            created_at: Set(now),
            creator: Set(Some(user_id)),
            updated_at: Set(now),
            updater: Set(Some(user_id)),
            expires_at: Set(None),
        }
        .insert(&db.db)
        .await
        .map_err(db_err)?;

        insert_member(db, model.id, user_id, TenantRole::Owner, user_id).await?;
        Ok(tenant_to_r(model))
    }

    pub async fn list(db: &Storage, user_id: Uuid) -> Result<Vec<TenantR>, TenantError> {
        let memberships = tenant_member::Entity::find()
            .filter(tenant_member::Column::UserId.eq(user_id))
            .filter(tenant_member::Column::Status.eq("ACTIVE"))
            .all(&db.db)
            .await
            .map_err(db_err)?;

        if memberships.is_empty() {
            return Ok(vec![]);
        }

        let ids: Vec<Uuid> = memberships.iter().map(|m| m.tenant_id).collect();
        let tenants = tenant::Entity::find()
            .filter(tenant::Column::Id.is_in(ids))
            .all(&db.db)
            .await
            .map_err(db_err)?;

        Ok(tenants.into_iter().map(tenant_to_r).collect())
    }

    pub async fn get(
        db: &Storage,
        user_id: Uuid,
        tenant_id: Uuid,
        platform_admin: bool,
    ) -> Result<TenantR, TenantError> {
        Self::require_role(db, user_id, tenant_id, platform_admin).await?;
        let model = tenant::Entity::find_by_id(tenant_id)
            .one(&db.db)
            .await
            .map_err(db_err)?
            .ok_or(TenantError::NotFound)?;
        Ok(tenant_to_r(model))
    }

    pub async fn update(
        db: &Storage,
        user_id: Uuid,
        tenant_id: Uuid,
        platform_admin: bool,
        req: TenantUpdateP,
    ) -> Result<TenantR, TenantError> {
        let role = Self::require_role(db, user_id, tenant_id, platform_admin).await?;
        if !role.can_manage() {
            return Err(TenantError::Forbidden);
        }

        let model = tenant::Entity::find_by_id(tenant_id)
            .one(&db.db)
            .await
            .map_err(db_err)?
            .ok_or(TenantError::NotFound)?;

        let mut active: tenant::ActiveModel = model.into();
        if let Some(name) = req.name {
            if name.trim().is_empty() {
                return Err(TenantError::BadParam("租户名称不能为空".to_string()));
            }
            active.name = Set(name.trim().to_string());
        }
        if let Some(status) = req.status {
            active.status = Set(parse_status(&status)?);
        }
        if let Some(kind) = req.r#type {
            active.tenant_type = Set(parse_type(Some(&kind))?);
        }
        active.updated_at = Set(Utc::now().fixed_offset());
        active.updater = Set(Some(user_id));

        let updated = active.update(&db.db).await.map_err(db_err)?;
        Ok(tenant_to_r(updated))
    }

    pub async fn remove(
        db: &Storage,
        user_id: Uuid,
        tenant_id: Uuid,
        platform_admin: bool,
    ) -> Result<(), TenantError> {
        let role = Self::require_role(db, user_id, tenant_id, platform_admin).await?;
        if !role.can_manage() {
            return Err(TenantError::Forbidden);
        }
        tenant::Entity::delete_by_id(tenant_id)
            .exec(&db.db)
            .await
            .map_err(db_err)?;
        Ok(())
    }

    pub async fn list_members(
        db: &Storage,
        user_id: Uuid,
        tenant_id: Uuid,
        platform_admin: bool,
    ) -> Result<Vec<MemberR>, TenantError> {
        Self::require_role(db, user_id, tenant_id, platform_admin).await?;
        let members = tenant_member::Entity::find()
            .filter(tenant_member::Column::TenantId.eq(tenant_id))
            .all(&db.db)
            .await
            .map_err(db_err)?;
        Ok(members.into_iter().map(member_to_r).collect())
    }

    pub async fn add_member(
        db: &Storage,
        user_id: Uuid,
        tenant_id: Uuid,
        platform_admin: bool,
        req: MemberWriteP,
    ) -> Result<MemberR, TenantError> {
        let role = Self::require_role(db, user_id, tenant_id, platform_admin).await?;
        if !role.can_manage() {
            return Err(TenantError::Forbidden);
        }

        let member_user = parse_uuid(&req.user_id)
            .map_err(|_| TenantError::BadParam("用户 ID 无效".to_string()))?;
        let member_role = TenantRole::parse(&req.role)
            .ok_or_else(|| TenantError::BadParam("角色无效".to_string()))?;

        let exists = auth::Entity::find_by_id(member_user)
            .one(&db.db)
            .await
            .map_err(db_err)?
            .is_none();
        if exists {
            return Err(TenantError::UserNotFound);
        }

        let dup = tenant_member::Entity::find()
            .filter(tenant_member::Column::TenantId.eq(tenant_id))
            .filter(tenant_member::Column::UserId.eq(member_user))
            .one(&db.db)
            .await
            .map_err(db_err)?
            .is_some();
        if dup {
            return Err(TenantError::AlreadyMember);
        }

        let model = insert_member(db, tenant_id, member_user, member_role, user_id).await?;
        Ok(member_to_r(model))
    }

    pub async fn update_member(
        db: &Storage,
        user_id: Uuid,
        tenant_id: Uuid,
        member_user_id: Uuid,
        platform_admin: bool,
        req: MemberUpdateP,
    ) -> Result<MemberR, TenantError> {
        let role = Self::require_role(db, user_id, tenant_id, platform_admin).await?;
        if !role.can_manage() {
            return Err(TenantError::Forbidden);
        }

        let member = tenant_member::Entity::find()
            .filter(tenant_member::Column::TenantId.eq(tenant_id))
            .filter(tenant_member::Column::UserId.eq(member_user_id))
            .one(&db.db)
            .await
            .map_err(db_err)?
            .ok_or(TenantError::NotFound)?;

        let mut active: tenant_member::ActiveModel = member.into();
        if let Some(value) = req.role {
            let parsed = TenantRole::parse(&value)
                .ok_or_else(|| TenantError::BadParam("角色无效".to_string()))?;
            active.role = Set(parsed.as_str().to_string());
        }
        if let Some(value) = req.status {
            active.status = Set(parse_status(&value)?);
        }
        active.updated_at = Set(Utc::now().fixed_offset());
        active.updater = Set(Some(user_id));

        let updated = active.update(&db.db).await.map_err(db_err)?;
        Ok(member_to_r(updated))
    }

    pub async fn remove_member(
        db: &Storage,
        user_id: Uuid,
        tenant_id: Uuid,
        member_user_id: Uuid,
        platform_admin: bool,
    ) -> Result<(), TenantError> {
        let role = Self::require_role(db, user_id, tenant_id, platform_admin).await?;
        if !role.can_manage() {
            return Err(TenantError::Forbidden);
        }

        let member = tenant_member::Entity::find()
            .filter(tenant_member::Column::TenantId.eq(tenant_id))
            .filter(tenant_member::Column::UserId.eq(member_user_id))
            .one(&db.db)
            .await
            .map_err(db_err)?
            .ok_or(TenantError::NotFound)?;

        tenant_member::Entity::delete_by_id(member.id)
            .exec(&db.db)
            .await
            .map_err(db_err)?;
        Ok(())
    }

    /// 校验成员关系；平台 ADMIN 旁路。返回租户内角色。
    pub async fn require_role(
        db: &Storage,
        user_id: Uuid,
        tenant_id: Uuid,
        platform_admin: bool,
    ) -> Result<TenantRole, TenantError> {
        if platform_admin {
            return Ok(TenantRole::Admin);
        }
        Self::membership_role(db, user_id, tenant_id)
            .await?
            .ok_or(TenantError::NotMember)
    }

    /// 查询用户在租户内的角色（ACTIVE 成员才有）。
    pub async fn membership_role(
        db: &Storage,
        user_id: Uuid,
        tenant_id: Uuid,
    ) -> Result<Option<TenantRole>, TenantError> {
        let member = tenant_member::Entity::find()
            .filter(tenant_member::Column::TenantId.eq(tenant_id))
            .filter(tenant_member::Column::UserId.eq(user_id))
            .filter(tenant_member::Column::Status.eq("ACTIVE"))
            .one(&db.db)
            .await
            .map_err(db_err)?;
        Ok(member.and_then(|m| TenantRole::parse(&m.role)))
    }
}

fn tenant_to_r(m: tenant::Model) -> TenantR {
    TenantR {
        id: m.id.to_string(),
        name: m.name,
        slug: m.slug,
        status: m.status,
        r#type: m.tenant_type,
        created_at: m.created_at.timestamp_millis(),
        updated_at: m.updated_at.timestamp_millis(),
    }
}

fn member_to_r(m: tenant_member::Model) -> MemberR {
    MemberR {
        id: m.id.to_string(),
        tenant_id: m.tenant_id.to_string(),
        user_id: m.user_id.to_string(),
        role: m.role,
        status: m.status,
    }
}

async fn insert_member(
    db: &Storage,
    tenant_id: Uuid,
    user_id: Uuid,
    role: TenantRole,
    actor: Uuid,
) -> Result<tenant_member::Model, TenantError> {
    let now = Utc::now().fixed_offset();
    tenant_member::ActiveModel {
        id: Set(Uuid::new_v4()),
        tenant_id: Set(tenant_id),
        user_id: Set(user_id),
        role: Set(role.as_str().to_string()),
        status: Set("ACTIVE".to_string()),
        archived_at: Set(None),
        created_at: Set(now),
        creator: Set(Some(actor)),
        updated_at: Set(now),
        updater: Set(Some(actor)),
        expires_at: Set(None),
    }
    .insert(&db.db)
    .await
    .map_err(|e| {
        if is_unique_violation(&e) {
            TenantError::AlreadyMember
        } else {
            db_err(e)
        }
    })
}

fn parse_uuid(value: &str) -> Result<Uuid, ()> {
    Uuid::parse_str(value).map_err(|_| ())
}

fn parse_status(value: &str) -> Result<String, TenantError> {
    match value {
        "ACTIVE" | "DISABLED" => Ok(value.to_string()),
        _ => Err(TenantError::BadParam("状态无效".to_string())),
    }
}

/// 租户类型；缺省 PERSONAL。
fn parse_type(value: Option<&str>) -> Result<String, TenantError> {
    match value {
        None => Ok(TenantType::Personal.as_str().to_string()),
        Some(value) => TenantType::parse(value)
            .map(|kind| kind.as_str().to_string())
            .ok_or_else(|| TenantError::BadParam("租户类型无效".to_string())),
    }
}

fn validate_slug(slug: &str) -> Result<(), TenantError> {
    let valid = !slug.is_empty()
        && slug
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-');
    if valid {
        Ok(())
    } else {
        Err(TenantError::BadParam(
            "租户标识须为小写字母/数字/中划线".to_string(),
        ))
    }
}

fn db_err(err: sea_orm::DbErr) -> TenantError {
    TenantError::Db(err.to_string())
}
