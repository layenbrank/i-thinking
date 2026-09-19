use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// 租户内角色：OWNER / ADMIN / MEMBER
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TenantRole {
    Owner,
    Admin,
    Member,
}

impl TenantRole {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Owner => "OWNER",
            Self::Admin => "ADMIN",
            Self::Member => "MEMBER",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "OWNER" => Some(Self::Owner),
            "ADMIN" => Some(Self::Admin),
            "MEMBER" => Some(Self::Member),
            _ => None,
        }
    }

    /// 能否管理租户（改租户/成员）
    pub fn can_manage(self) -> bool {
        matches!(self, Self::Owner | Self::Admin)
    }
}

/// 租户类型：PERSONAL（个人，走免费/订阅档位）/ TEAM（团队，走全局兜底）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TenantType {
    Personal,
    Team,
}

impl TenantType {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Personal => "PERSONAL",
            Self::Team => "TEAM",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "PERSONAL" => Some(Self::Personal),
            "TEAM" => Some(Self::Team),
            _ => None,
        }
    }

    /// 仅当明确解析为 `PERSONAL` 才算个人租户（走免费/订阅档位）；
    /// 未知 / 脏值一律按团队处理，与 gateway 侧保持一致。
    pub fn is_personal(value: &str) -> bool {
        matches!(Self::parse(value), Some(Self::Personal))
    }
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TenantWriteP {
    pub name: String,
    /// 唯一标识（小写字母/数字/中划线）
    pub slug: String,
    /// PERSONAL / TEAM；缺省 PERSONAL
    pub r#type: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TenantUpdateP {
    pub name: Option<String>,
    pub status: Option<String>,
    /// PERSONAL / TEAM
    pub r#type: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TenantR {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub status: String,
    /// PERSONAL / TEAM
    pub r#type: String,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MemberWriteP {
    #[serde(rename = "userID")]
    pub user_id: String,
    /// OWNER / ADMIN / MEMBER
    pub role: String,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MemberUpdateP {
    pub role: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MemberR {
    pub id: String,
    #[serde(rename = "tenantID")]
    pub tenant_id: String,
    #[serde(rename = "userID")]
    pub user_id: String,
    pub role: String,
    pub status: String,
}
