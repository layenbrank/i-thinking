//! 角色与账号状态（权限）

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// 角色：USER（默认）/ ADMIN（后台）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Role {
    User,
    Admin,
}

impl Role {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::User => "USER",
            Self::Admin => "ADMIN",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "USER" => Some(Self::User),
            "ADMIN" => Some(Self::Admin),
            _ => None,
        }
    }

    pub fn is_admin(self) -> bool {
        matches!(self, Self::Admin)
    }
}

impl Default for Role {
    fn default() -> Self {
        Self::User
    }
}

/// 账号状态：ACTIVE（默认）/ DISABLED
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Status {
    Active,
    Disabled,
}

impl Status {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Active => "ACTIVE",
            Self::Disabled => "DISABLED",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "ACTIVE" => Some(Self::Active),
            "DISABLED" => Some(Self::Disabled),
            _ => None,
        }
    }

    pub fn is_active(self) -> bool {
        matches!(self, Self::Active)
    }
}

impl Default for Status {
    fn default() -> Self {
        Self::Active
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn role_roundtrip() {
        assert_eq!(Role::parse("ADMIN"), Some(Role::Admin));
        assert!(Role::Admin.is_admin());
        assert!(!Role::User.is_admin());
    }

    #[test]
    fn status_roundtrip() {
        assert_eq!(Status::parse("DISABLED"), Some(Status::Disabled));
        assert!(Status::Active.is_active());
    }
}
