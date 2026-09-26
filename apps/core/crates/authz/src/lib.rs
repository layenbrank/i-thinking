//! 授权能力内核：**全系统唯一的权限判定入口**（数据所有权见 README.md）。
//!
//! 调用方只做一件事：把请求上下文（[`identity::Principal`]）和它想做的操作
//! （[`Permission`]）交给 [`authorize`] / [`require`]，不做任何自己的角色比较。
//!
//! 判定顺序（全部 fail-closed）：
//! 1. 没有当前租户上下文 → 拒绝（租户内资源必须先选定租户，与 RLS 的 `app.tenant_id` 一致）；
//! 2. 平台管理员 → 放行（运维通道，调用方必须留审计记录）；
//! 3. 否则查租户角色策略表，命中即放行，未命中即拒绝。
//!
//! 迁移点：策略表的形状是「角色 → 权限集合」。将来出现资源共享、组织树、
//! 代理授权等关系型需求时，替换本 crate 内部的求值即可（ReBAC），调用方无感。

use std::fmt;

use identity::{Principal, TenantRole};

/// 受保护的资源类型。新增资源时必须同时补策略表与测试。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[non_exhaustive]
pub enum Resource {
    /// 租户本身（名称、状态、生命周期）。
    Tenant,
    /// 租户成员与成员角色。
    Member,
    /// SSO / OIDC 连接配置（含凭证）。
    SsoConnection,
    /// 订阅与配额。
    Subscription,
    /// 支付订单与账单。
    PaymentOrder,
    /// 模型供应商配置（含 API Key）。
    GatewayProvider,
    /// 模型目录与路由配置。
    GatewayModel,
    /// 用量与计费明细。
    GatewayUsage,
    /// 资产（上传文件）内容。
    Asset,
    /// 文档切片。
    Chunk,
    /// 审计事件与事件流。
    AuditEvent,
    /// 出站通知。
    Notification,
}

impl Resource {
    /// 资源名（用于日志与审计）。
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Tenant => "tenant",
            Self::Member => "member",
            Self::SsoConnection => "sso_connection",
            Self::Subscription => "subscription",
            Self::PaymentOrder => "payment_order",
            Self::GatewayProvider => "gateway_provider",
            Self::GatewayModel => "gateway_model",
            Self::GatewayUsage => "gateway_usage",
            Self::Asset => "asset",
            Self::Chunk => "chunk",
            Self::AuditEvent => "audit_event",
            Self::Notification => "notification",
        }
    }

    /// 全部资源，用于策略自检与测试。
    #[must_use]
    pub const fn all() -> &'static [Self] {
        &[
            Self::Tenant,
            Self::Member,
            Self::SsoConnection,
            Self::Subscription,
            Self::PaymentOrder,
            Self::GatewayProvider,
            Self::GatewayModel,
            Self::GatewayUsage,
            Self::Asset,
            Self::Chunk,
            Self::AuditEvent,
            Self::Notification,
        ]
    }
}

/// 操作类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[non_exhaustive]
pub enum Action {
    /// 读取。
    Read,
    /// 新增或修改内容。
    Write,
    /// 删除。
    Delete,
    /// 变更配置、凭证或所有权等管理动作。
    Manage,
}

impl Action {
    /// 操作名（用于日志与审计）。
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Read => "read",
            Self::Write => "write",
            Self::Delete => "delete",
            Self::Manage => "manage",
        }
    }

    /// 全部操作，用于策略自检与测试。
    #[must_use]
    pub const fn all() -> &'static [Self] {
        &[Self::Read, Self::Write, Self::Delete, Self::Manage]
    }
}

/// 「对某个资源做某个操作」的权限描述。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Permission {
    resource: Resource,
    action: Action,
}

impl Permission {
    /// 构造权限。
    #[must_use]
    pub const fn new(resource: Resource, action: Action) -> Self {
        Self { resource, action }
    }

    /// 资源。
    #[must_use]
    pub const fn resource(self) -> Resource {
        self.resource
    }

    /// 操作。
    #[must_use]
    pub const fn action(self) -> Action {
        self.action
    }
}

impl fmt::Display for Permission {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}:{}", self.resource.as_str(), self.action.as_str())
    }
}

/// 拒绝原因。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum DenyReason {
    /// 请求没有携带当前租户上下文。
    NoTenantContext,
    /// 当前租户角色不包含该权限。
    TenantRoleInsufficient,
}

impl DenyReason {
    /// 原因名（用于日志与审计）。
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::NoTenantContext => "no_tenant_context",
            Self::TenantRoleInsufficient => "tenant_role_insufficient",
        }
    }
}

impl fmt::Display for DenyReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

/// 授权结论。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Decision {
    /// 放行。
    Allow,
    /// 拒绝，附原因。
    Deny(DenyReason),
}

impl Decision {
    /// 是否放行。
    #[must_use]
    pub const fn is_allowed(self) -> bool {
        matches!(self, Self::Allow)
    }
}

/// 拒绝的权限请求，可直接作为错误向上传播。
#[derive(Debug, Clone, Copy, PartialEq, Eq, thiserror::Error)]
#[error("permission denied: {permission} ({reason})")]
pub struct Denied {
    /// 被拒绝的权限。
    pub permission: Permission,
    /// 拒绝原因。
    pub reason: DenyReason,
}

impl Denied {
    /// 拒绝原因。
    #[must_use]
    pub const fn reason(self) -> DenyReason {
        self.reason
    }
}

/// 判定 `principal` 是否有权执行 `permission`。
#[must_use]
pub fn authorize(principal: &Principal, permission: Permission) -> Decision {
    let Some(membership) = principal.tenant() else {
        return Decision::Deny(DenyReason::NoTenantContext);
    };

    if principal.is_platform_admin() || tenant_role_allows(membership.role(), permission) {
        Decision::Allow
    } else {
        Decision::Deny(DenyReason::TenantRoleInsufficient)
    }
}

/// 与 [`authorize`] 同源，但以 `Result` 返回，便于 `?` 传播。
///
/// # Errors
/// 权限不足时返回 [`Denied`]，其中带被拒权限与原因。
pub fn require(principal: &Principal, permission: Permission) -> Result<(), Denied> {
    match authorize(principal, permission) {
        Decision::Allow => Ok(()),
        Decision::Deny(reason) => Err(Denied { permission, reason }),
    }
}

/// 租户角色策略表：角色 → 权限集合。
///
/// 约束（由测试保证）：成员 ⊆ 管理员 ⊆ 所有者，即高角色必然包含低角色的全部权限。
const fn tenant_role_allows(role: TenantRole, permission: Permission) -> bool {
    let table: &[(Resource, Action)] = match role {
        TenantRole::Owner => &[
            (Resource::Tenant, Action::Read),
            (Resource::Tenant, Action::Manage),
            (Resource::Member, Action::Read),
            (Resource::Member, Action::Write),
            (Resource::Member, Action::Delete),
            (Resource::SsoConnection, Action::Read),
            (Resource::SsoConnection, Action::Manage),
            (Resource::Subscription, Action::Read),
            (Resource::Subscription, Action::Manage),
            (Resource::PaymentOrder, Action::Read),
            (Resource::PaymentOrder, Action::Manage),
            (Resource::GatewayProvider, Action::Read),
            (Resource::GatewayProvider, Action::Manage),
            (Resource::GatewayModel, Action::Read),
            (Resource::GatewayModel, Action::Manage),
            (Resource::GatewayUsage, Action::Read),
            (Resource::Asset, Action::Read),
            (Resource::Asset, Action::Write),
            (Resource::Asset, Action::Delete),
            (Resource::Chunk, Action::Read),
            (Resource::Chunk, Action::Write),
            (Resource::Chunk, Action::Delete),
            (Resource::AuditEvent, Action::Read),
            (Resource::Notification, Action::Read),
            (Resource::Notification, Action::Write),
        ],
        TenantRole::Admin => &[
            (Resource::Tenant, Action::Read),
            (Resource::Member, Action::Read),
            (Resource::Member, Action::Write),
            (Resource::Member, Action::Delete),
            (Resource::SsoConnection, Action::Read),
            (Resource::SsoConnection, Action::Manage),
            (Resource::Subscription, Action::Read),
            (Resource::PaymentOrder, Action::Read),
            (Resource::GatewayProvider, Action::Read),
            (Resource::GatewayProvider, Action::Manage),
            (Resource::GatewayModel, Action::Read),
            (Resource::GatewayModel, Action::Manage),
            (Resource::GatewayUsage, Action::Read),
            (Resource::Asset, Action::Read),
            (Resource::Asset, Action::Write),
            (Resource::Asset, Action::Delete),
            (Resource::Chunk, Action::Read),
            (Resource::Chunk, Action::Write),
            (Resource::Chunk, Action::Delete),
            (Resource::AuditEvent, Action::Read),
            (Resource::Notification, Action::Read),
            (Resource::Notification, Action::Write),
        ],
        TenantRole::Member => &[
            (Resource::Tenant, Action::Read),
            (Resource::Member, Action::Read),
            (Resource::Subscription, Action::Read),
            (Resource::GatewayProvider, Action::Read),
            (Resource::GatewayModel, Action::Read),
            (Resource::GatewayUsage, Action::Read),
            (Resource::Asset, Action::Read),
            (Resource::Asset, Action::Write),
            (Resource::Chunk, Action::Read),
            (Resource::Chunk, Action::Write),
            (Resource::Notification, Action::Read),
            (Resource::Notification, Action::Write),
        ],
        // 新增角色时先在这里给出策略；缺失即拒绝。
        _ => &[],
    };

    let mut index = 0;
    while index < table.len() {
        let (resource, action) = table[index];
        if resource as u8 == permission.resource() as u8
            && action as u8 == permission.action() as u8
        {
            return true;
        }
        index += 1;
    }
    false
}

#[cfg(test)]
mod tests {
    use identity::{PlatformRole, TenantId, TenantMembership, UserId};

    use super::*;

    fn principal(role: TenantRole, platform_role: PlatformRole) -> Principal {
        Principal::new(UserId::generate(), platform_role)
            .with_tenant(TenantMembership::new(TenantId::generate(), role))
    }

    fn permission(resource: Resource, action: Action) -> Permission {
        Permission::new(resource, action)
    }

    fn allows(role: TenantRole, resource: Resource, action: Action) -> bool {
        authorize(
            &principal(role, PlatformRole::User),
            permission(resource, action),
        )
        .is_allowed()
    }

    #[test]
    fn every_role_and_permission_combination_is_decided() {
        for role in TenantRole::all() {
            for resource in Resource::all() {
                for action in Action::all() {
                    let decision = authorize(
                        &principal(*role, PlatformRole::User),
                        permission(*resource, *action),
                    );
                    assert!(
                        matches!(
                            decision,
                            Decision::Allow | Decision::Deny(DenyReason::TenantRoleInsufficient)
                        ),
                        "{role:?} {resource:?} {action:?} => {decision:?}"
                    );
                }
            }
        }
    }

    #[test]
    fn role_permissions_are_monotonic() {
        for resource in Resource::all() {
            for action in Action::all() {
                let member = allows(TenantRole::Member, *resource, *action);
                let admin = allows(TenantRole::Admin, *resource, *action);
                let owner = allows(TenantRole::Owner, *resource, *action);

                assert!(
                    !member || admin,
                    "admin 缺少 member 的权限 {resource:?}:{action:?}"
                );
                assert!(
                    !admin || owner,
                    "owner 缺少 admin 的权限 {resource:?}:{action:?}"
                );
            }
        }
    }

    #[test]
    fn owner_only_permissions_stay_owner_only() {
        for (resource, action) in [
            (Resource::Tenant, Action::Manage),
            (Resource::Subscription, Action::Manage),
            (Resource::PaymentOrder, Action::Manage),
        ] {
            assert!(allows(TenantRole::Owner, resource, action));
            assert!(!allows(TenantRole::Admin, resource, action));
        }
    }

    #[test]
    fn member_cannot_read_audit_or_manage_members() {
        assert!(!allows(
            TenantRole::Member,
            Resource::AuditEvent,
            Action::Read
        ));
        assert!(!allows(TenantRole::Member, Resource::Member, Action::Write));
        assert!(allows(TenantRole::Member, Resource::Asset, Action::Write));
    }

    #[test]
    fn missing_tenant_context_is_denied_even_for_platform_admin() {
        let principal = Principal::new(UserId::generate(), PlatformRole::Admin);
        let decision = authorize(&principal, permission(Resource::Asset, Action::Read));

        assert_eq!(decision, Decision::Deny(DenyReason::NoTenantContext));
        assert_eq!(
            require(&principal, permission(Resource::Asset, Action::Read)),
            Err(Denied {
                permission: permission(Resource::Asset, Action::Read),
                reason: DenyReason::NoTenantContext,
            })
        );
    }

    #[test]
    fn platform_admin_bypasses_tenant_role_within_a_tenant() {
        let principal = principal(TenantRole::Member, PlatformRole::Admin);
        assert!(authorize(&principal, permission(Resource::Tenant, Action::Manage)).is_allowed());
    }

    #[test]
    fn require_returns_the_denied_permission() {
        let principal = principal(TenantRole::Member, PlatformRole::User);
        let denied =
            require(&principal, permission(Resource::AuditEvent, Action::Read)).unwrap_err();

        assert_eq!(denied.reason(), DenyReason::TenantRoleInsufficient);
        assert_eq!(
            denied.to_string(),
            "permission denied: audit_event:read (tenant_role_insufficient)"
        );
    }
}
