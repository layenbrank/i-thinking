//! 单一世代迁移：一次性建出当前全部业务表。
//!
//! 项目处于开发期，迁移只保留这一代；`up` 会先整体清掉业务表再重建，
//! 因此改 schema 时直接改本文件即可（无需追加新版本）。

use sea_orm_migration::{prelude::*, schema::*};

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "000001_20260819"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 整体重建：按依赖倒序清掉全部业务表（含外键级联）
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table(SsoConnection::Table)
                    .table(PaymentOrder::Table)
                    .table(Subscription::Table)
                    .table(GatewayAudit::Table)
                    .table(GatewayUsage::Table)
                    .table(GatewayModel::Table)
                    .table(GatewayProvider::Table)
                    .table(TenantMember::Table)
                    .table(Tenant::Table)
                    .table(Chunk::Table)
                    .table(Asset::Table)
                    .table(Auth::Table)
                    .cascade()
                    .to_owned(),
            )
            .await?;

        // ---------- auth ----------
        manager
            .create_table(
                Table::create()
                    .table(Auth::Table)
                    .if_not_exists()
                    .col(pk_uuid(Auth::Id))
                    .col(text_uniq(Auth::Username))
                    .col(text(Auth::Password))
                    .col(text_null(Auth::Email))
                    .col(text_null(Auth::Phone))
                    .col(integer_null(Auth::Age))
                    .col(text_null(Auth::Gender))
                    .col(date_null(Auth::Birthday))
                    .col(uuid_null(Auth::Avatar))
                    .col(text(Auth::Role).default("USER"))
                    .col(text(Auth::Status).default("ACTIVE"))
                    .col(timestamp_with_time_zone_null(Auth::ArchivedAt))
                    .col(timestamp_with_time_zone(Auth::CreatedAt))
                    .col(uuid_null(Auth::Creator))
                    .col(timestamp_with_time_zone(Auth::UpdatedAt))
                    .col(uuid_null(Auth::Updater))
                    .col(timestamp_with_time_zone_null(Auth::ExpiresAt))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_auth_creator")
                            .from(Auth::Table, Auth::Creator)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_auth_updater")
                            .from(Auth::Table, Auth::Updater)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // ---------- asset ----------
        manager
            .create_table(
                Table::create()
                    .table(Asset::Table)
                    .if_not_exists()
                    .col(pk_uuid(Asset::Id))
                    .col(text_null(Asset::TenantId))
                    .col(text_null(Asset::Kind))
                    .col(text(Asset::Hash))
                    .col(text_null(Asset::Sha))
                    .col(big_integer(Asset::Size))
                    .col(big_integer(Asset::Index).default(0))
                    .col(text(Asset::Mime))
                    .col(text_null(Asset::Extension))
                    .col(text(Asset::Name))
                    .col(text(Asset::Status))
                    .col(text(Asset::Visibility).default("PRIVATE"))
                    .col(json_binary_null(Asset::Viewers))
                    .col(integer(Asset::Chunk))
                    .col(integer(Asset::Total))
                    .col(timestamp_with_time_zone_null(Asset::ArchivedAt))
                    .col(timestamp_with_time_zone(Asset::CreatedAt))
                    .col(uuid_null(Asset::Creator))
                    .col(timestamp_with_time_zone(Asset::UpdatedAt))
                    .col(uuid_null(Asset::Updater))
                    .col(timestamp_with_time_zone_null(Asset::ExpiresAt))
                    .col(uuid_null(Asset::Superseded))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_asset_creator")
                            .from(Asset::Table, Asset::Creator)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_asset_updater")
                            .from(Asset::Table, Asset::Updater)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // ---------- chunk ----------
        manager
            .create_table(
                Table::create()
                    .table(Chunk::Table)
                    .if_not_exists()
                    .col(pk_uuid(Chunk::Id))
                    .col(uuid(Chunk::AssetId))
                    .col(integer(Chunk::Index))
                    .col(text(Chunk::Hash))
                    .col(big_integer(Chunk::Size))
                    .col(timestamp_with_time_zone(Chunk::CreatedAt))
                    .col(uuid_null(Chunk::Creator))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_chunk_asset")
                            .from(Chunk::Table, Chunk::AssetId)
                            .to(Asset::Table, Asset::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_chunk_creator")
                            .from(Chunk::Table, Chunk::Creator)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_asset_hash")
                    .table(Asset::Table)
                    .col(Asset::Hash)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_asset_tenant_id")
                    .table(Asset::Table)
                    .col(Asset::TenantId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_asset_creator")
                    .table(Asset::Table)
                    .col(Asset::Creator)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("uidx_chunk_asset_index")
                    .table(Chunk::Table)
                    .col(Chunk::AssetId)
                    .col(Chunk::Index)
                    .unique()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_chunk_hash")
                    .table(Chunk::Table)
                    .col(Chunk::Hash)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_auth_phone")
                    .table(Auth::Table)
                    .col(Auth::Phone)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // auth ↔ asset 互相引用，故外键在两张表建好后再补
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_auth_avatar")
                    .from(Auth::Table, Auth::Avatar)
                    .to(Asset::Table, Asset::Id)
                    .on_delete(ForeignKeyAction::SetNull)
                    .on_update(ForeignKeyAction::Cascade)
                    .to_owned(),
            )
            .await?;

        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_asset_superseded")
                    .from(Asset::Table, Asset::Superseded)
                    .to(Asset::Table, Asset::Id)
                    .on_delete(ForeignKeyAction::SetNull)
                    .on_update(ForeignKeyAction::Cascade)
                    .to_owned(),
            )
            .await?;

        // ---------- tenant ----------
        // 配额不落库：由「订阅档位 / 免费档 / 全局兜底」表达，见 gateway 模块。
        manager
            .create_table(
                Table::create()
                    .table(Tenant::Table)
                    .if_not_exists()
                    .col(pk_uuid(Tenant::Id))
                    .col(text(Tenant::Name))
                    .col(text_uniq(Tenant::Slug))
                    .col(text(Tenant::Status).default("ACTIVE"))
                    // PERSONAL（个人，走免费/订阅档位）/ TEAM（团队，走全局兜底）
                    .col(text(Tenant::Type).default("PERSONAL"))
                    .col(timestamp_with_time_zone_null(Tenant::ArchivedAt))
                    .col(timestamp_with_time_zone(Tenant::CreatedAt))
                    .col(uuid_null(Tenant::Creator))
                    .col(timestamp_with_time_zone(Tenant::UpdatedAt))
                    .col(uuid_null(Tenant::Updater))
                    .col(timestamp_with_time_zone_null(Tenant::ExpiresAt))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tenant_creator")
                            .from(Tenant::Table, Tenant::Creator)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tenant_updater")
                            .from(Tenant::Table, Tenant::Updater)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // ---------- tenant_member ----------
        manager
            .create_table(
                Table::create()
                    .table(TenantMember::Table)
                    .if_not_exists()
                    .col(pk_uuid(TenantMember::Id))
                    .col(uuid(TenantMember::TenantId))
                    .col(uuid(TenantMember::UserId))
                    .col(text(TenantMember::Role))
                    .col(text(TenantMember::Status).default("ACTIVE"))
                    .col(timestamp_with_time_zone_null(TenantMember::ArchivedAt))
                    .col(timestamp_with_time_zone(TenantMember::CreatedAt))
                    .col(uuid_null(TenantMember::Creator))
                    .col(timestamp_with_time_zone(TenantMember::UpdatedAt))
                    .col(uuid_null(TenantMember::Updater))
                    .col(timestamp_with_time_zone_null(TenantMember::ExpiresAt))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tenant_member_tenant")
                            .from(TenantMember::Table, TenantMember::TenantId)
                            .to(Tenant::Table, Tenant::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tenant_member_user")
                            .from(TenantMember::Table, TenantMember::UserId)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tenant_member_creator")
                            .from(TenantMember::Table, TenantMember::Creator)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tenant_member_updater")
                            .from(TenantMember::Table, TenantMember::Updater)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("uidx_tenant_member")
                    .table(TenantMember::Table)
                    .col(TenantMember::TenantId)
                    .col(TenantMember::UserId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // ---------- subscription ----------
        manager
            .create_table(
                Table::create()
                    .table(Subscription::Table)
                    .if_not_exists()
                    .col(pk_uuid(Subscription::Id))
                    .col(uuid(Subscription::TenantId))
                    .col(text(Subscription::Plan))
                    .col(text(Subscription::Status).default("ACTIVE"))
                    // 到期时间；NULL = 永久有效（生效时间 = createdAt）
                    .col(timestamp_with_time_zone_null(Subscription::ExpiresAt))
                    .col(timestamp_with_time_zone_null(Subscription::ArchivedAt))
                    .col(timestamp_with_time_zone(Subscription::CreatedAt))
                    .col(uuid_null(Subscription::Creator))
                    .col(timestamp_with_time_zone(Subscription::UpdatedAt))
                    .col(uuid_null(Subscription::Updater))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_subscription_tenant")
                            .from(Subscription::Table, Subscription::TenantId)
                            .to(Tenant::Table, Tenant::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_subscription_tenant")
                    .table(Subscription::Table)
                    .col(Subscription::TenantId)
                    .to_owned(),
            )
            .await?;

        // 每个租户同一时刻最多一条 ACTIVE 订阅：业务不变量在 DB 层兜底。
        // SeaORM 的 Index builder 不支持部分索引（WHERE），只能用原始 SQL。
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE UNIQUE INDEX IF NOT EXISTS uidx_subscription_active \
                 ON subscription (\"tenantID\") WHERE status = 'ACTIVE'",
            )
            .await?;

        // ---------- payment_order ----------
        manager
            .create_table(
                Table::create()
                    .table(PaymentOrder::Table)
                    .if_not_exists()
                    .col(pk_uuid(PaymentOrder::Id))
                    .col(text(PaymentOrder::OrderNo))
                    .col(uuid(PaymentOrder::TenantId))
                    .col(uuid(PaymentOrder::UserId))
                    .col(text(PaymentOrder::Plan))
                    .col(text(PaymentOrder::Channel))
                    // 金额（分）：下单时快照，回调核对以此为准
                    .col(big_integer(PaymentOrder::Amount))
                    .col(text(PaymentOrder::Currency).default("CNY"))
                    .col(text(PaymentOrder::Status).default("PENDING"))
                    // 开通时长（天）；NULL = 永久
                    .col(integer_null(PaymentOrder::DurationDays))
                    .col(text_null(PaymentOrder::TransactionId))
                    .col(text_null(PaymentOrder::CodeUrl))
                    .col(uuid_null(PaymentOrder::SubscriptionId))
                    .col(timestamp_with_time_zone_null(PaymentOrder::PaidAt))
                    .col(timestamp_with_time_zone(PaymentOrder::ExpiresAt))
                    .col(text_null(PaymentOrder::Remark))
                    .col(timestamp_with_time_zone_null(PaymentOrder::ArchivedAt))
                    .col(timestamp_with_time_zone(PaymentOrder::CreatedAt))
                    .col(uuid_null(PaymentOrder::Creator))
                    .col(timestamp_with_time_zone(PaymentOrder::UpdatedAt))
                    .col(uuid_null(PaymentOrder::Updater))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_payment_order_tenant")
                            .from(PaymentOrder::Table, PaymentOrder::TenantId)
                            .to(Tenant::Table, Tenant::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_payment_order_user")
                            .from(PaymentOrder::Table, PaymentOrder::UserId)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("uidx_payment_order_no")
                    .table(PaymentOrder::Table)
                    .col(PaymentOrder::OrderNo)
                    .unique()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_payment_order_tenant")
                    .table(PaymentOrder::Table)
                    .col(PaymentOrder::TenantId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_payment_order_status")
                    .table(PaymentOrder::Table)
                    .col(PaymentOrder::Status)
                    .col(PaymentOrder::ExpiresAt)
                    .to_owned(),
            )
            .await?;

        // ---------- gateway ----------
        manager
            .create_table(
                Table::create()
                    .table(GatewayProvider::Table)
                    .if_not_exists()
                    .col(pk_uuid(GatewayProvider::Id))
                    .col(uuid_null(GatewayProvider::TenantId))
                    .col(text(GatewayProvider::Kind))
                    .col(text(GatewayProvider::Name))
                    .col(text(GatewayProvider::BaseUrl))
                    .col(text(GatewayProvider::ApiKeyEnc).default(""))
                    .col(text(GatewayProvider::Status).default("ACTIVE"))
                    .col(timestamp_with_time_zone_null(GatewayProvider::ArchivedAt))
                    .col(timestamp_with_time_zone(GatewayProvider::CreatedAt))
                    .col(uuid_null(GatewayProvider::Creator))
                    .col(timestamp_with_time_zone(GatewayProvider::UpdatedAt))
                    .col(uuid_null(GatewayProvider::Updater))
                    .col(timestamp_with_time_zone_null(GatewayProvider::ExpiresAt))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_gateway_provider_creator")
                            .from(GatewayProvider::Table, GatewayProvider::Creator)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_gateway_provider_updater")
                            .from(GatewayProvider::Table, GatewayProvider::Updater)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_gateway_provider_tenant")
                    .table(GatewayProvider::Table)
                    .col(GatewayProvider::TenantId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(GatewayModel::Table)
                    .if_not_exists()
                    .col(pk_uuid(GatewayModel::Id))
                    .col(uuid(GatewayModel::ProviderId))
                    .col(uuid_null(GatewayModel::TenantId))
                    .col(text(GatewayModel::Name))
                    .col(text(GatewayModel::Label))
                    .col(json_binary_null(GatewayModel::AllowRoles))
                    .col(boolean(GatewayModel::Enabled).default(true))
                    .col(big_integer(GatewayModel::DailyTokenQuota).default(0))
                    .col(json_binary_null(GatewayModel::Capabilities))
                    .col(big_integer_null(GatewayModel::ContextWindow))
                    .col(timestamp_with_time_zone_null(GatewayModel::ArchivedAt))
                    .col(timestamp_with_time_zone(GatewayModel::CreatedAt))
                    .col(uuid_null(GatewayModel::Creator))
                    .col(timestamp_with_time_zone(GatewayModel::UpdatedAt))
                    .col(uuid_null(GatewayModel::Updater))
                    .col(timestamp_with_time_zone_null(GatewayModel::ExpiresAt))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_gateway_model_provider")
                            .from(GatewayModel::Table, GatewayModel::ProviderId)
                            .to(GatewayProvider::Table, GatewayProvider::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_gateway_model_creator")
                            .from(GatewayModel::Table, GatewayModel::Creator)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_gateway_model_updater")
                            .from(GatewayModel::Table, GatewayModel::Updater)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_gateway_model_tenant")
                    .table(GatewayModel::Table)
                    .col(GatewayModel::TenantId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(GatewayUsage::Table)
                    .if_not_exists()
                    .col(pk_uuid(GatewayUsage::Id))
                    .col(uuid_null(GatewayUsage::TenantId))
                    .col(uuid(GatewayUsage::UserId))
                    .col(uuid(GatewayUsage::ProviderId))
                    .col(uuid(GatewayUsage::ModelId))
                    .col(big_integer(GatewayUsage::PromptTokens).default(0))
                    .col(big_integer(GatewayUsage::CompletionTokens).default(0))
                    .col(big_integer(GatewayUsage::TotalTokens).default(0))
                    .col(text(GatewayUsage::Status))
                    .col(big_integer(GatewayUsage::LatencyMs).default(0))
                    .col(timestamp_with_time_zone(GatewayUsage::CreatedAt))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_gateway_usage_user")
                    .table(GatewayUsage::Table)
                    .col(GatewayUsage::UserId)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_gateway_usage_model")
                    .table(GatewayUsage::Table)
                    .col(GatewayUsage::ModelId)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_gateway_usage_created")
                    .table(GatewayUsage::Table)
                    .col(GatewayUsage::CreatedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(GatewayAudit::Table)
                    .if_not_exists()
                    .col(pk_uuid(GatewayAudit::Id))
                    .col(uuid_null(GatewayAudit::TenantId))
                    .col(uuid(GatewayAudit::Actor))
                    .col(text(GatewayAudit::Action))
                    .col(text(GatewayAudit::Resource))
                    .col(json_binary_null(GatewayAudit::Detail))
                    .col(text_null(GatewayAudit::Ip))
                    .col(timestamp_with_time_zone(GatewayAudit::CreatedAt))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_gateway_audit_actor")
                    .table(GatewayAudit::Table)
                    .col(GatewayAudit::Actor)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_gateway_audit_created")
                    .table(GatewayAudit::Table)
                    .col(GatewayAudit::CreatedAt)
                    .to_owned(),
            )
            .await?;

        // ---------- sso_connection ----------
        manager
            .create_table(
                Table::create()
                    .table(SsoConnection::Table)
                    .if_not_exists()
                    .col(pk_uuid(SsoConnection::Id))
                    .col(uuid(SsoConnection::TenantId))
                    .col(text(SsoConnection::Provider))
                    .col(text(SsoConnection::Issuer))
                    .col(text(SsoConnection::ClientId))
                    .col(text(SsoConnection::ClientSecretEnc).default(""))
                    .col(text(SsoConnection::RedirectUri))
                    .col(text(SsoConnection::Status).default("ACTIVE"))
                    .col(timestamp_with_time_zone_null(SsoConnection::ArchivedAt))
                    .col(timestamp_with_time_zone(SsoConnection::CreatedAt))
                    .col(uuid_null(SsoConnection::Creator))
                    .col(timestamp_with_time_zone(SsoConnection::UpdatedAt))
                    .col(uuid_null(SsoConnection::Updater))
                    .col(timestamp_with_time_zone_null(SsoConnection::ExpiresAt))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_sso_connection_tenant")
                            .from(SsoConnection::Table, SsoConnection::TenantId)
                            .to(Tenant::Table, Tenant::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_sso_connection_creator")
                            .from(SsoConnection::Table, SsoConnection::Creator)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_sso_connection_updater")
                            .from(SsoConnection::Table, SsoConnection::Updater)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table(SsoConnection::Table)
                    .table(PaymentOrder::Table)
                    .table(Subscription::Table)
                    .table(GatewayAudit::Table)
                    .table(GatewayUsage::Table)
                    .table(GatewayModel::Table)
                    .table(GatewayProvider::Table)
                    .table(TenantMember::Table)
                    .table(Tenant::Table)
                    .table(Chunk::Table)
                    .table(Asset::Table)
                    .table(Auth::Table)
                    .cascade()
                    .to_owned(),
            )
            .await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
enum Auth {
    Table,
    Id,
    Username,
    Password,
    Email,
    Phone,
    Age,
    Gender,
    Birthday,
    Avatar,
    Role,
    Status,
    #[sea_orm(iden = "archivedAt")]
    ArchivedAt,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    Updater,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
}

#[derive(DeriveIden)]
enum Asset {
    Table,
    Id,
    #[sea_orm(iden = "tenantID")]
    TenantId,
    Kind,
    Hash,
    Sha,
    Size,
    Index,
    Mime,
    Extension,
    Name,
    Status,
    Visibility,
    Viewers,
    Chunk,
    Total,
    #[sea_orm(iden = "archivedAt")]
    ArchivedAt,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    Updater,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
    Superseded,
}

#[derive(DeriveIden)]
enum Chunk {
    Table,
    Id,
    #[sea_orm(iden = "assetID")]
    AssetId,
    Index,
    Hash,
    Size,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
}

#[derive(DeriveIden)]
enum Tenant {
    Table,
    Id,
    Name,
    Slug,
    Status,
    Type,
    #[sea_orm(iden = "archivedAt")]
    ArchivedAt,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    Updater,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
}

#[derive(DeriveIden)]
enum TenantMember {
    Table,
    Id,
    #[sea_orm(iden = "tenantID")]
    TenantId,
    #[sea_orm(iden = "userID")]
    UserId,
    Role,
    Status,
    #[sea_orm(iden = "archivedAt")]
    ArchivedAt,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    Updater,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
}

#[derive(DeriveIden)]
enum Subscription {
    Table,
    Id,
    #[sea_orm(iden = "tenantID")]
    TenantId,
    Plan,
    Status,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
    #[sea_orm(iden = "archivedAt")]
    ArchivedAt,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    Updater,
}

#[derive(DeriveIden)]
enum GatewayProvider {
    Table,
    Id,
    #[sea_orm(iden = "tenantID")]
    TenantId,
    Kind,
    Name,
    #[sea_orm(iden = "baseURL")]
    BaseUrl,
    #[sea_orm(iden = "apiKeyEnc")]
    ApiKeyEnc,
    Status,
    #[sea_orm(iden = "archivedAt")]
    ArchivedAt,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    Updater,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
}

#[derive(DeriveIden)]
enum GatewayModel {
    Table,
    Id,
    #[sea_orm(iden = "providerID")]
    ProviderId,
    #[sea_orm(iden = "tenantID")]
    TenantId,
    Name,
    Label,
    #[sea_orm(iden = "allowRoles")]
    AllowRoles,
    Enabled,
    #[sea_orm(iden = "dailyTokenQuota")]
    DailyTokenQuota,
    Capabilities,
    #[sea_orm(iden = "contextWindow")]
    ContextWindow,
    #[sea_orm(iden = "archivedAt")]
    ArchivedAt,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    Updater,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
}

#[derive(DeriveIden)]
enum GatewayUsage {
    Table,
    Id,
    #[sea_orm(iden = "tenantID")]
    TenantId,
    #[sea_orm(iden = "userID")]
    UserId,
    #[sea_orm(iden = "providerID")]
    ProviderId,
    #[sea_orm(iden = "modelID")]
    ModelId,
    #[sea_orm(iden = "promptTokens")]
    PromptTokens,
    #[sea_orm(iden = "completionTokens")]
    CompletionTokens,
    #[sea_orm(iden = "totalTokens")]
    TotalTokens,
    Status,
    #[sea_orm(iden = "latencyMs")]
    LatencyMs,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
}

#[derive(DeriveIden)]
enum GatewayAudit {
    Table,
    Id,
    #[sea_orm(iden = "tenantID")]
    TenantId,
    Actor,
    Action,
    Resource,
    Detail,
    Ip,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
}

#[derive(DeriveIden)]
enum SsoConnection {
    Table,
    Id,
    #[sea_orm(iden = "tenantID")]
    TenantId,
    Provider,
    Issuer,
    #[sea_orm(iden = "clientID")]
    ClientId,
    #[sea_orm(iden = "clientSecretEnc")]
    ClientSecretEnc,
    #[sea_orm(iden = "redirectUri")]
    RedirectUri,
    Status,
    #[sea_orm(iden = "archivedAt")]
    ArchivedAt,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    Updater,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
}

#[derive(DeriveIden)]
enum PaymentOrder {
    Table,
    Id,
    #[sea_orm(iden = "orderNo")]
    OrderNo,
    #[sea_orm(iden = "tenantID")]
    TenantId,
    #[sea_orm(iden = "userID")]
    UserId,
    Plan,
    Channel,
    Amount,
    Currency,
    Status,
    #[sea_orm(iden = "durationDays")]
    DurationDays,
    #[sea_orm(iden = "transactionID")]
    TransactionId,
    #[sea_orm(iden = "codeUrl")]
    CodeUrl,
    #[sea_orm(iden = "subscriptionID")]
    SubscriptionId,
    #[sea_orm(iden = "paidAt")]
    PaidAt,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
    Remark,
    #[sea_orm(iden = "archivedAt")]
    ArchivedAt,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    Updater,
}
